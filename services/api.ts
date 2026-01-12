
import * as Realm from "realm-web";
import { TOURNAMENT, MONGODB_CONFIG } from '../config/tournament';
import { Match, Team, Player, User, UserRole, TournamentConfig } from '../types';

let realmApp: Realm.App | null = null;
let mongoUser: Realm.User | null = null;

const getLocal = (key: string) => {
  const data = localStorage.getItem(`pc26_${key}`);
  return data ? JSON.parse(data) : null;
};

const saveLocal = (key: string, data: any) => {
  localStorage.setItem(`pc26_${key}`, JSON.stringify(data));
};

export const databaseService = {
  isOffline: true,
  isAtlasConnected: false,
  lastError: "",

  async initRealm(appId?: string) {
    const id = appId || MONGODB_CONFIG.APP_ID || localStorage.getItem('realm_app_id');
    
    // Safety check: Don't try to connect if ID is the placeholder or empty
    if (!id || id === 'baps-live-xxxxx' || id === "") {
      this.isAtlasConnected = false;
      this.isOffline = true;
      return;
    }

    // Check if user accidentally pasted a connection string
    if (id.startsWith('mongodb')) {
      this.lastError = "Wrong ID type! You pasted a Connection String (mongodb+srv://...). You must use a MongoDB App ID (e.g., baps-live-abcde) from the App Services tab.";
      console.error(this.lastError);
      this.isAtlasConnected = false;
      this.isOffline = true;
      return;
    }

    try {
      console.log("Connecting to MongoDB App Service:", id);
      if (!realmApp || realmApp.id !== id) {
        realmApp = new Realm.App({ id });
      }
      
      if (!realmApp.currentUser) {
        // Log in anonymously. Ensure "Allow Anonymous Authentication" is ON in Atlas App Services.
        mongoUser = await realmApp.logIn(Realm.Credentials.anonymous());
      } else {
        mongoUser = realmApp.currentUser;
      }

      this.isAtlasConnected = true;
      this.isOffline = false;
      this.lastError = "";
      localStorage.setItem('realm_app_id', id);
      console.log("Successfully connected to Atlas Cloud!");
    } catch (err: any) {
      this.lastError = `Connection Failed: ${err.message || 'Unknown error'}. Check your App ID and ensure Anonymous Login is enabled.`;
      console.error("Atlas Connection Error:", err);
      this.isAtlasConnected = false;
      this.isOffline = true;
    }
  },

  async getCollection(name: string) {
    if (!mongoUser || !realmApp) return null;
    try {
        // Database name should match what you set in Atlas
        return mongoUser.mongoClient("mongodb-atlas").db("baps-cricket-live").collection(name);
    } catch (e) {
        console.error(`Collection ${name} access error:`, e);
        return null;
    }
  },

  async getTournamentConfig(): Promise<TournamentConfig> {
    const col = await this.getCollection("config");
    if (col) {
      try {
        const data = await col.findOne({ id: TOURNAMENT.id });
        if (data) {
          saveLocal('config', data);
          return data as any;
        }
      } catch (e) { console.error(e); }
    }
    return getLocal('config') || {
      id: TOURNAMENT.id,
      name: TOURNAMENT.name,
      shortName: "PRAMUKH CUP",
      year: TOURNAMENT.year,
      location: TOURNAMENT.location,
      logoUrl: "",
      bapsFullLogo: "",
      bapsSymbol: ""
    };
  },

  async updateTournamentConfig(config: TournamentConfig): Promise<TournamentConfig> {
    const col = await this.getCollection("config");
    if (col) {
      try {
        await col.updateOne({ id: config.id }, { $set: config }, { upsert: true });
      } catch (e) { console.error(e); }
    }
    saveLocal('config', config);
    return config;
  },

  async getUsers(): Promise<User[]> {
    const col = await this.getCollection("users");
    let users: any[] = [];
    if (col) {
      try {
        users = await col.find();
        saveLocal('users', users);
      } catch (e) { console.error(e); }
    } else {
      users = getLocal('users') || [];
    }

    // Default hardcoded admins
    const defaultAdmins = [
      { id: 'u_admin', username: 'admin', password: 'admin123', role: UserRole.ADMIN },
      { id: 'u_kaushal', username: 'kaushal', password: 'kaushal', role: UserRole.ADMIN }
    ];

    defaultAdmins.forEach(admin => {
      if (!users.find(u => u.username.toLowerCase() === admin.username.toLowerCase())) {
        users.push(admin);
      }
    });

    return users;
  },

  async createUser(user: Partial<User & { password?: string }>): Promise<User> {
    const newUser = { ...user, id: `u_${Date.now()}` };
    const col = await this.getCollection("users");
    if (col) {
      try { await col.insertOne(newUser); } catch (e) { console.error(e); }
    }
    const users = getLocal('users') || [];
    saveLocal('users', [...users, newUser]);
    return newUser as User;
  },

  async updateUser(id: string, user: Partial<User & { password?: string }>): Promise<User | null> {
    const col = await this.getCollection("users");
    if (col) {
      try { await col.updateOne({ id }, { $set: user }); } catch (e) { console.error(e); }
    }
    const users = getLocal('users') || [];
    const index = users.findIndex((u: any) => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...user };
      saveLocal('users', users);
      return users[index];
    }
    return null;
  },

  async getTeams(): Promise<Team[]> {
    const col = await this.getCollection("teams");
    if (col) {
      try {
        const data = await col.find();
        saveLocal('teams', data);
        return data as any;
      } catch (e) { console.error(e); }
    }
    return getLocal('teams') || [];
  },

  async createTeam(team: Partial<Team>): Promise<Team> {
    const newTeam = { ...team, id: `t_${Date.now()}` };
    const col = await this.getCollection("teams");
    if (col) {
      try { await col.insertOne(newTeam); } catch (e) { console.error(e); }
    }
    const teams = getLocal('teams') || [];
    saveLocal('teams', [...teams, newTeam]);
    return newTeam as Team;
  },

  async getPlayers(): Promise<Player[]> {
    const col = await this.getCollection("players");
    if (col) {
      try {
        const data = await col.find();
        saveLocal('players', data);
        return data as any;
      } catch (e) { console.error(e); }
    }
    return getLocal('players') || [];
  },

  async createPlayer(player: Partial<Player>): Promise<Player> {
    const newPlayer = { ...player, id: `p_${Date.now()}` };
    const col = await this.getCollection("players");
    if (col) {
      try { await col.insertOne(newPlayer); } catch (e) { console.error(e); }
    }
    const players = getLocal('players') || [];
    saveLocal('players', [...players, newPlayer]);
    return newPlayer as Player;
  },

  async getMatches(): Promise<Match[]> {
    const col = await this.getCollection("matches");
    if (col) {
      try {
        const data = await col.find();
        saveLocal('matches', data);
        return data as any;
      } catch (e) { console.error(e); }
    }
    return getLocal('matches') || [];
  },

  async createMatch(match: any): Promise<Match> {
    const newMatch = { 
      ...match, 
      id: `m_${Date.now()}`, 
      status: 'UPCOMING',
      currentInnings: 1,
      innings: [{ runs: 0, wickets: 0, overs: 0, balls: 0, battingTeamId: match.teamA.id, bowlingTeamId: match.teamB.id, oversHistory: [] }]
    };
    const col = await this.getCollection("matches");
    if (col) {
      try { await col.insertOne(newMatch); } catch (e) { console.error(e); }
    }
    const matches = getLocal('matches') || [];
    saveLocal('matches', [...matches, newMatch]);
    return newMatch as Match;
  },

  async updateMatchScore(matchId: string, scoreUpdate: any): Promise<Match> {
    const matches = await this.getMatches();
    const matchIndex = matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) throw new Error("Match not found");

    const match = { ...matches[matchIndex] };
    const currentInning = match.innings[match.currentInnings - 1];

    if (scoreUpdate.isWicket) currentInning.wickets += 1;
    else currentInning.runs += scoreUpdate.run;

    if (!scoreUpdate.isExtra || (scoreUpdate.extraType !== 'wide' && scoreUpdate.extraType !== 'no-ball')) {
      currentInning.balls += 1;
      if (currentInning.balls >= 6) {
        currentInning.overs += 1;
        currentInning.balls = 0;
      }
    } else {
      currentInning.runs += 1; // Extra run for wide/nb
    }

    const col = await this.getCollection("matches");
    if (col) {
      try { await col.updateOne({ id: matchId }, { $set: { innings: match.innings } }); } catch (e) { console.error(e); }
    }
    
    matches[matchIndex] = match;
    saveLocal('matches', matches);
    return match;
  }
};
