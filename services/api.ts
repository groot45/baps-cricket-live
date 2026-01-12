
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TOURNAMENT, SUPABASE_CONFIG } from '../config/tournament';
import { Match, Team, Player, User, UserRole, TournamentConfig } from '../types';

let supabase: SupabaseClient | null = null;

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
  isGlobalConfig: false,

  async initRealm(config?: { url: string; key: string }) {
    // 1. Check hardcoded config (Highest Priority - Syncs all devices)
    // 2. Check manual UI config (Second Priority - Local only)
    // 3. Check localStorage
    const url = SUPABASE_CONFIG.URL || config?.url || localStorage.getItem('sb_url');
    const key = SUPABASE_CONFIG.ANON_KEY || config?.key || localStorage.getItem('sb_key');
    
    this.isGlobalConfig = !!(SUPABASE_CONFIG.URL && SUPABASE_CONFIG.ANON_KEY);

    if (!url || !key || url === "" || key === "") {
      console.log("Database: No credentials found. Running in Local Mode.");
      this.isAtlasConnected = false;
      this.isOffline = true;
      return;
    }

    try {
      supabase = createClient(url, key);
      
      // Test connectivity
      const { error } = await supabase.from('matches').select('id').limit(1);
      
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('not find the table') || error.code === '42P01') {
          this.lastError = "CONNECTED BUT NO TABLES: Run the SQL script in your Supabase Editor to create the matches/teams tables.";
          this.isAtlasConnected = false;
          this.isOffline = true;
          return;
        }
        throw error;
      }

      this.isAtlasConnected = true;
      this.isOffline = false;
      this.lastError = "";
      
      // Only save to localStorage if it wasn't already hardcoded
      if (!this.isGlobalConfig) {
        localStorage.setItem('sb_url', url);
        localStorage.setItem('sb_key', key);
      }

      console.log(`Database: ${this.isGlobalConfig ? 'Global' : 'Local'} Supabase Connected.`);
    } catch (err: any) {
      this.lastError = `CONNECTION FAILED: ${err.message}.`;
      console.error("Supabase Connection Error:", err);
      this.isAtlasConnected = false;
      this.isOffline = true;
    }
  },

  async syncData<T>(tableName: string, localData: T[]): Promise<T[]> {
    if (!supabase || this.isOffline) return localData;
    try {
      const { data, error } = await supabase.from(tableName).select('*');
      if (error) throw error;
      if (data && data.length > 0) {
        saveLocal(tableName, data);
        return data as T[];
      }
      return localData;
    } catch (e) {
      return localData;
    }
  },

  async getTournamentConfig(): Promise<TournamentConfig> {
    const local = getLocal('config');
    const defaultConfig = {
      id: TOURNAMENT.id,
      name: TOURNAMENT.name,
      shortName: "PRAMUKH CUP",
      year: TOURNAMENT.year,
      location: TOURNAMENT.location,
      logoUrl: "",
      bapsFullLogo: "",
      bapsSymbol: ""
    };

    if (supabase && !this.isOffline) {
      try {
        const { data } = await supabase.from('config').select('*').eq('id', TOURNAMENT.id).single();
        if (data) {
          saveLocal('config', data);
          return data;
        }
      } catch (e) {}
    }
    return local || defaultConfig;
  },

  async updateTournamentConfig(config: TournamentConfig): Promise<TournamentConfig> {
    if (supabase && !this.isOffline) {
      try { await supabase.from('config').upsert(config); } catch (e) {}
    }
    saveLocal('config', config);
    return config;
  },

  async getUsers(): Promise<User[]> {
    const local: User[] = getLocal('users') || [];
    const remote = await this.syncData('users', local);
    const defaultAdmins = [
      { id: 'u_admin', username: 'admin', password: 'admin123', role: UserRole.ADMIN },
      { id: 'u_kaushal', username: 'kaushal', password: 'kaushal', role: UserRole.ADMIN }
    ];
    const users = [...remote];
    defaultAdmins.forEach(admin => {
      if (!users.find(u => u.username.toLowerCase() === admin.username.toLowerCase())) {
        users.push(admin as any);
      }
    });
    return users as User[];
  },

  async createUser(user: Partial<User & { password?: string }>): Promise<User> {
    const newUser = { ...user, id: `u_${Date.now()}` };
    if (supabase && !this.isOffline) {
      try { await supabase.from('users').insert(newUser); } catch (e) {}
    }
    const users = getLocal('users') || [];
    saveLocal('users', [...users, newUser]);
    return newUser as User;
  },

  async updateUser(id: string, user: Partial<User & { password?: string }>): Promise<User | null> {
    if (supabase && !this.isOffline) {
      try { await supabase.from('users').update(user).eq('id', id); } catch (e) {}
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
    const local: Team[] = getLocal('teams') || [];
    return this.syncData('teams', local);
  },

  async createTeam(team: Partial<Team>): Promise<Team> {
    const newTeam = { ...team, id: `t_${Date.now()}` };
    if (supabase && !this.isOffline) {
      try { await supabase.from('teams').insert(newTeam); } catch (e) {}
    }
    const teams = getLocal('teams') || [];
    saveLocal('teams', [...teams, newTeam]);
    return newTeam as Team;
  },

  async getPlayers(): Promise<Player[]> {
    const local: Player[] = getLocal('players') || [];
    return this.syncData('players', local);
  },

  async createPlayer(player: Partial<Player>): Promise<Player> {
    const newPlayer = { ...player, id: `p_${Date.now()}` };
    if (supabase && !this.isOffline) {
      try { await supabase.from('players').insert(newPlayer); } catch (e) {}
    }
    const players = getLocal('players') || [];
    saveLocal('players', [...players, newPlayer]);
    return newPlayer as Player;
  },

  async getMatches(): Promise<Match[]> {
    const local: Match[] = getLocal('matches') || [];
    return this.syncData('matches', local);
  },

  async createMatch(match: any): Promise<Match> {
    const newMatch = { 
      ...match, 
      id: `m_${Date.now()}`, 
      status: 'UPCOMING',
      currentInnings: 1,
      innings: [{ battingTeamId: match.teamA.id, bowlingTeamId: match.teamB.id, runs: 0, wickets: 0, overs: 0, balls: 0, oversHistory: [] }]
    };
    if (supabase && !this.isOffline) {
      try { await supabase.from('matches').insert(newMatch); } catch (e) {}
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
      currentInning.runs += 1;
    }

    if (supabase && !this.isOffline) {
      try { await supabase.from('matches').update({ innings: match.innings }).eq('id', matchId); } catch (e) {}
    }
    
    matches[matchIndex] = match;
    saveLocal('matches', matches);
    return match;
  }
};
