
import * as Realm from "https://esm.sh/realm-web";
import { API_BASE_URL, TOURNAMENT, MONGODB_CONFIG } from '../config/tournament';
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

  async initRealm(appId?: string) {
    const id = appId || MONGODB_CONFIG.APP_ID || localStorage.getItem('realm_app_id');
    if (!id) {
      console.warn("No MongoDB App ID found. Running in Local Mode.");
      return;
    }

    try {
      realmApp = new Realm.App({ id });
      mongoUser = await realmApp.logIn(Realm.Credentials.anonymous());
      this.isAtlasConnected = true;
      this.isOffline = false;
      if (appId) localStorage.setItem('realm_app_id', appId);
      console.log(`MongoDB Atlas Connected: ${id}`);
    } catch (err) {
      console.error("MongoDB Atlas Connection Failed:", err);
      this.isAtlasConnected = false;
      this.isOffline = true;
    }
  },

  async getCollection(name: string) {
    if (!mongoUser || !realmApp) return null;
    // Database name from your connection string
    return mongoUser.mongoClient("mongodb-atlas").db("baps-cricket-live").collection(name);
  },

  // TOURNAMENT CONFIG
  async getTournamentConfig(): Promise<TournamentConfig> {
    const col = await this.getCollection("config");
    if (col) {
      const data = await col.findOne({ id: TOURNAMENT.id });
      if (data) {
        saveLocal('config', data);
        return data as any;
      }
    }
    
    const local = getLocal('config');
    return local || {
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
      await col.updateOne({ id: config.id }, { $set: config }, { upsert: true });
    }
    saveLocal('config', config);
    return config;
  },

  // USERS
  async getUsers(): Promise<User[]> {
    const col = await this.getCollection("users");
    if (col) {
      const data = await col.find();
      saveLocal('users', data);
      return data as any;
    }
    const local = getLocal('users');
    if (!local) {
      // Master credentials: kaushal / kaushal
      const initial = [{ id: 'u_kaushal', username: 'kaushal', password: 'kaushal', role: UserRole.ADMIN }];
      saveLocal('users', initial);
      return initial;
    }
    return local;
  },

  async createUser(user: Partial<User & { password?: string }>): Promise<User> {
    const newUser = { ...user, id: `u_${Date.now()}` };
    const col = await this.getCollection("users");
    if (col) {
      await col.insertOne(newUser);
    }
    const users = await this.getUsers();
    if (!col) saveLocal('users', [...users, newUser]);
    return newUser as User;
  },

  async updateUser(userId: string, updates: Partial<User & { password?: string }>): Promise<User> {
    const col = await this.getCollection("users");
    if (col) {
      await col.updateOne({ id: userId }, { $set: updates });
    }
    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      const updated = { ...users[index], ...updates };
      if (!col) {
        users[index] = updated;
        saveLocal('users', users);
      }
      return updated;
    }
    throw new Error("User not found");
  },

  // TEAMS
  async getTeams(): Promise<Team[]> {
    const col = await this.getCollection("teams");
    if (col) {
      const data = await col.find();
      saveLocal('teams', data);
      return data as any;
    }
    return getLocal('teams') || [];
  },

  async createTeam(team: Partial<Team>): Promise<Team> {
    const newTeam = { ...team, id: `t_${Date.now()}` };
    const col = await this.getCollection("teams");
    if (col) {
      await col.insertOne(newTeam);
    }
    const teams = await this.getTeams();
    if (!col) saveLocal('teams', [...teams, newTeam]);
    return newTeam as Team;
  },

  // PLAYERS
  async getPlayers(): Promise<Player[]> {
    const col = await this.getCollection("players");
    if (col) {
      const data = await col.find();
      saveLocal('players', data);
      return data as any;
    }
    return getLocal('players') || [];
  },

  // MATCHES
  async getMatches(): Promise<Match[]> {
    const col = await this.getCollection("matches");
    if (col) {
      const data = await col.find();
      saveLocal('matches', data);
      return data as any;
    }
    return getLocal('matches') || [];
  },

  async createMatch(match: any): Promise<Match> {
    const newMatch = { 
      ...match, 
      id: `m_${Date.now()}`, 
      status: 'UPCOMING',
      currentInnings: 1,
      innings: [{ runs: 0, wickets: 0, overs: 0, balls: 0 }]
    };
    const col = await this.getCollection("matches");
    if (col) {
      await col.insertOne(newMatch);
    }
    const matches = await this.getMatches();
    if (!col) saveLocal('matches', [...matches, newMatch]);
    return newMatch as Match;
  },

  async updateMatchScore(matchId: string, scoreUpdate: any): Promise<Match> {
    const matches = await this.getMatches();
    const matchIndex = matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) throw new Error("Match not found");

    const match = { ...matches[matchIndex] };
    const currentInning = match.innings[match.currentInnings - 1];

    if (scoreUpdate.isWicket) {
      currentInning.wickets += 1;
    } else {
      currentInning.runs += scoreUpdate.run;
    }

    if (!scoreUpdate.isExtra || (scoreUpdate.extraType !== 'wide' && scoreUpdate.extraType !== 'no-ball')) {
      currentInning.balls += 1;
      if (currentInning.balls >= 6) {
        currentInning.overs += 1;
        currentInning.balls = 0;
      }
    } else {
      currentInning.runs += 1;
    }

    const col = await this.getCollection("matches");
    if (col) {
      await col.updateOne({ id: matchId }, { $set: { innings: match.innings } });
    }
    
    matches[matchIndex] = match;
    saveLocal('matches', matches);
    return match;
  }
};
