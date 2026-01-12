
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { TOURNAMENT, SUPABASE_CONFIG } from '../config/tournament';
import { Match, Team, Player, User, UserRole, TournamentConfig, Inning, BatsmanStats, BowlerStats } from '../types';

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
    const url = SUPABASE_CONFIG.URL || config?.url || localStorage.getItem('sb_url');
    const key = SUPABASE_CONFIG.ANON_KEY || config?.key || localStorage.getItem('sb_key');
    this.isGlobalConfig = !!(SUPABASE_CONFIG.URL && SUPABASE_CONFIG.ANON_KEY);
    if (!url || !key || url === "" || key === "") {
      this.isOffline = true;
      return;
    }
    try {
      supabase = createClient(url, key);
      const { error } = await supabase.from('matches').select('id').limit(1);
      if (error) {
        if (error.code === 'PGRST116' || error.message.includes('not find the table') || error.code === '42P01') {
          this.lastError = "DB Connected. Migration Required.";
          this.isOffline = true;
          return;
        }
        throw error;
      }
      this.isAtlasConnected = true;
      this.isOffline = false;
      this.lastError = "";
    } catch (err: any) {
      this.isOffline = true;
      this.lastError = err.message;
    }
  },

  /**
   * Hybrid Merge Logic: 
   * Always prioritizes data that hasn't been synced yet (ID starting with prefix)
   */
  async getPlayers(): Promise<Player[]> {
    const local: Player[] = getLocal('players') || [];
    if (!supabase || this.isOffline) return local;
    try {
      const { data, error } = await supabase.from('players').select('*');
      if (error) throw error;
      if (data) { 
        const remoteData = data as Player[];
        // Keep local players that aren't in remote yet
        const remoteIds = new Set(remoteData.map(r => r.id));
        const localOnly = local.filter(l => l.id.startsWith('p_') && !remoteIds.has(l.id));
        const merged = [...remoteData, ...localOnly];
        saveLocal('players', merged); 
        return merged; 
      }
    } catch (e) {
      console.warn("DB Player Fetch Error:", e);
    }
    return local;
  },

  async createPlayer(player: Partial<Player>): Promise<Player> {
    const newPlayer = { 
      id: `p_${Date.now()}`,
      name: player.name || 'Unknown',
      teamId: player.teamId || '',
      battingStyle: player.battingStyle || 'Right Hand',
      bowlingStyle: player.bowlingStyle || 'None',
      role: player.role || 'Batsman'
    } as Player;
    
    // Save locally first (INSTANT UI UPDATE)
    const players = getLocal('players') || [];
    saveLocal('players', [...players, newPlayer]);
    
    if (supabase && !this.isOffline) {
      try {
        const { error } = await supabase.from('players').insert(newPlayer);
        if (error) console.error("Cloud Sync Delayed:", error.message);
      } catch (err) {}
    }
    return newPlayer;
  },

  async getTeams(): Promise<Team[]> {
    const local: Team[] = getLocal('teams') || [];
    if (!supabase || this.isOffline) return local;
    try {
      const { data, error } = await supabase.from('teams').select('*');
      if (error) throw error;
      if (data) { 
        const remoteData = data as Team[];
        const remoteIds = new Set(remoteData.map(r => r.id));
        const localOnly = local.filter(l => l.id.startsWith('t_') && !remoteIds.has(l.id));
        const merged = [...remoteData, ...localOnly];
        saveLocal('teams', merged); 
        return merged; 
      }
    } catch (e) {
      console.warn("DB Team Fetch Error:", e);
    }
    return local;
  },

  async createTeam(team: Partial<Team>): Promise<Team> {
    const newTeam = { 
      id: `t_${Date.now()}`, 
      name: team.name || '', 
      shortName: team.shortName || '', 
      logoUrl: team.logoUrl || '' 
    } as Team;
    
    const teams = getLocal('teams') || [];
    saveLocal('teams', [...teams, newTeam]);
    
    if (supabase && !this.isOffline) {
      try {
        const { error } = await supabase.from('teams').insert(newTeam);
        if (error) console.error("Cloud Sync Delayed:", error.message);
      } catch (err) {}
    }
    return newTeam;
  },

  async updateTeam(id: string, updates: Partial<Team>): Promise<Team> {
    if (supabase && !this.isOffline) {
      try { await supabase.from('teams').update(updates).eq('id', id); } catch(e){}
    }
    const teams = await this.getTeams();
    const idx = teams.findIndex(t => t.id === id);
    if (idx !== -1) {
      teams[idx] = { ...teams[idx], ...updates };
      saveLocal('teams', teams);
      return teams[idx];
    }
    throw new Error("Team not found");
  },

  async getMatches(): Promise<Match[]> {
    const local: Match[] = getLocal('matches') || [];
    if (!supabase || this.isOffline) return local;
    try {
      const { data, error } = await supabase.from('matches').select('*');
      if (error) throw error;
      if (data) { 
        const remoteData = data as Match[];
        const remoteIds = new Set(remoteData.map(r => r.id));
        const localOnly = local.filter(l => l.id.startsWith('m_') && !remoteIds.has(l.id));
        const merged = [...remoteData, ...localOnly];
        saveLocal('matches', merged); 
        return merged; 
      }
    } catch (e) {
      console.warn("DB Match Fetch Error:", e);
    }
    return local;
  },

  async createMatch(match: any): Promise<Match> {
    const newMatch = { 
      id: `m_${Date.now()}`,
      tournamentId: match.tournamentId || TOURNAMENT.id,
      teamA: match.teamA, 
      teamB: match.teamB, 
      venue: match.venue || 'Arena',
      startTime: match.startTime || new Date().toISOString(),
      status: 'UPCOMING',
      currentInnings: 1,
      maxOvers: 20,
      innings: [{ 
        battingTeamId: match.teamA.id, 
        bowlingTeamId: match.teamB.id, 
        runs: 0, 
        wickets: 0, 
        overs: 0, 
        balls: 0, 
        oversHistory: [],
        batsmenStats: [],
        bowlerStats: []
      }]
    } as Match;

    const matches = getLocal('matches') || [];
    saveLocal('matches', [...matches, newMatch]);

    if (supabase && !this.isOffline) {
      try {
        const { error } = await supabase.from('matches').insert(newMatch);
        if (error) console.error("Cloud Sync Delayed:", error.message);
      } catch (err) {}
    }
    return newMatch;
  },

  async updateActivePlayers(matchId: string, updates: { strikerId?: string, nonStrikerId?: string, currentBowlerId?: string }): Promise<Match> {
    const matches = await this.getMatches();
    const idx = matches.findIndex(m => m.id === matchId);
    if (idx === -1) throw new Error("Match not found");
    const match = { ...matches[idx] };
    const cur = match.innings[match.currentInnings - 1];
    
    if (updates.strikerId) cur.strikerId = updates.strikerId;
    if (updates.nonStrikerId) cur.nonStrikerId = updates.nonStrikerId;
    if (updates.currentBowlerId) cur.currentBowlerId = updates.currentBowlerId;

    const players = await this.getPlayers();
    [cur.strikerId, cur.nonStrikerId].forEach(id => {
      if (id && !cur.batsmenStats.find(s => s.playerId === id)) {
        const p = players.find(x => x.id === id);
        if (p) cur.batsmenStats.push({ playerId: p.id, name: p.name, runs: 0, balls: 0, fours: 0, sixes: 0 });
      }
    });
    if (cur.currentBowlerId && !cur.bowlerStats.find(s => s.playerId === cur.currentBowlerId)) {
        const p = players.find(x => x.id === cur.currentBowlerId);
        if (p) cur.bowlerStats.push({ playerId: p.id, name: p.name, overs: 0, balls: 0, runs: 0, wickets: 0 });
    }
    
    if (supabase && !this.isOffline) await supabase.from('matches').update({ innings: match.innings }).eq('id', matchId);
    matches[idx] = match;
    saveLocal('matches', matches);
    return match;
  },

  async switchInnings(matchId: string): Promise<Match> {
    const matches = await this.getMatches();
    const idx = matches.findIndex(m => m.id === matchId);
    if (idx === -1) throw new Error("Match not found");
    const match = { ...matches[idx] };
    if (match.currentInnings >= 2) return match;

    const firstInning = match.innings[0];
    const newInning: Inning = {
      battingTeamId: firstInning.bowlingTeamId,
      bowlingTeamId: firstInning.battingTeamId,
      runs: 0,
      wickets: 0,
      overs: 0,
      balls: 0,
      oversHistory: [],
      batsmenStats: [],
      bowlerStats: []
    };

    match.innings.push(newInning);
    match.currentInnings = 2;
    match.status = 'LIVE';

    if (supabase && !this.isOffline) await supabase.from('matches').update({ 
      innings: match.innings, 
      currentInnings: 2, 
      status: 'LIVE' 
    }).eq('id', matchId);
    
    matches[idx] = match;
    saveLocal('matches', matches);
    return match;
  },

  async completeMatch(matchId: string, winnerId: string, resultSummary: string): Promise<Match> {
    const matches = await this.getMatches();
    const idx = matches.findIndex(m => m.id === matchId);
    if (idx === -1) throw new Error("Match not found");
    const match = { ...matches[idx] };
    match.status = 'COMPLETED';
    match.winnerId = winnerId;
    match.resultSummary = resultSummary;

    if (supabase && !this.isOffline) await supabase.from('matches').update({ status: 'COMPLETED', winnerId, resultSummary }).eq('id', matchId);
    matches[idx] = match;
    saveLocal('matches', matches);
    return match;
  },

  async updateMatchScore(matchId: string, scoreUpdate: { run: number, isWicket: boolean, extraType: string | null }): Promise<Match> {
    const matches = await this.getMatches();
    const idx = matches.findIndex(m => m.id === matchId);
    if (idx === -1) throw new Error("Match not found");
    const match = { ...matches[idx] };
    match.status = 'LIVE'; 
    const cur = match.innings[match.currentInnings - 1];
    
    if (scoreUpdate.isWicket) cur.wickets += 1;
    else cur.runs += scoreUpdate.run;

    if (scoreUpdate.extraType === 'wide' || scoreUpdate.extraType === 'no-ball') cur.runs += 1;
    
    if (cur.strikerId) {
      let bStat = cur.batsmenStats.find(s => s.playerId === cur.strikerId);
      if (bStat) {
        if (!scoreUpdate.extraType || scoreUpdate.extraType === 'bye' || scoreUpdate.extraType === 'leg-bye') {
           bStat.runs += scoreUpdate.run;
           bStat.balls += 1;
           if (scoreUpdate.run === 4) bStat.fours += 1;
           if (scoreUpdate.run === 6) bStat.sixes += 1;
        } else if (scoreUpdate.extraType === 'no-ball') {
           bStat.runs += scoreUpdate.run;
           bStat.balls += 1;
        }
      }
    }
    if (cur.currentBowlerId) {
      let boStat = cur.bowlerStats.find(s => s.playerId === cur.currentBowlerId);
      if (boStat) {
        if (scoreUpdate.isWicket) boStat.wickets += 1;
        boStat.runs += scoreUpdate.run;
        if (scoreUpdate.extraType === 'wide' || scoreUpdate.extraType === 'no-ball') boStat.runs += 1;
        if (scoreUpdate.extraType !== 'wide' && scoreUpdate.extraType !== 'no-ball') {
          boStat.balls += 1;
          if (boStat.balls >= 6) { boStat.overs += 1; boStat.balls = 0; }
        }
      }
    }
    if (scoreUpdate.extraType !== 'wide' && scoreUpdate.extraType !== 'no-ball') {
      cur.balls += 1;
      if (cur.balls >= 6) {
        cur.overs += 1; cur.balls = 0;
        const temp = cur.strikerId;
        cur.strikerId = cur.nonStrikerId;
        cur.nonStrikerId = temp;
      }
    }
    if (!scoreUpdate.isWicket && (scoreUpdate.run === 1 || scoreUpdate.run === 3)) {
      const temp = cur.strikerId;
      cur.strikerId = cur.nonStrikerId;
      cur.nonStrikerId = temp;
    }

    if (supabase && !this.isOffline) await supabase.from('matches').update({ innings: match.innings, status: 'LIVE' }).eq('id', matchId);
    matches[idx] = match;
    saveLocal('matches', matches);
    return match;
  },

  async getTournamentConfig(): Promise<TournamentConfig> {
    const local = getLocal('config');
    const def = { id: TOURNAMENT.id, name: TOURNAMENT.name, shortName: "PRAMUKH CUP", year: TOURNAMENT.year, location: TOURNAMENT.location, logoUrl: "", bapsFullLogo: "", bapsSymbol: "" };
    if (supabase && !this.isOffline) {
      try {
        const { data } = await supabase.from('config').select('*').eq('id', TOURNAMENT.id).single();
        if (data) { saveLocal('config', data); return data; }
      } catch (e) {}
    }
    return local || def;
  },

  async updateTournamentConfig(c: TournamentConfig): Promise<TournamentConfig> {
    if (supabase && !this.isOffline) await supabase.from('config').upsert(c);
    saveLocal('config', c);
    return c;
  },

  async createUser(user: any): Promise<any> {
    const newUser = { ...user, id: `u_${Date.now()}` };
    if (supabase && !this.isOffline) await supabase.from('users').insert(newUser);
    const users = getLocal('users') || [];
    saveLocal('users', [...users, newUser]);
    return newUser;
  },

  async updateUser(id: string, updates: any): Promise<any> {
    if (supabase && !this.isOffline) await supabase.from('users').update(updates).eq('id', id);
    const users = getLocal('users') || [];
    const idx = users.findIndex((u: any) => u.id === id);
    if (idx !== -1) {
      users[idx] = { ...users[idx], ...updates };
      saveLocal('users', users);
    }
    return updates;
  },

  async getUsers(): Promise<User[]> {
    const local: User[] = getLocal('users') || [];
    const remote = await this.syncData('users', local);
    const def = [{ id: 'u_admin', username: 'admin', password: 'admin123', role: UserRole.ADMIN }, { id: 'u_kaushal', username: 'kaushal', password: 'kaushal', role: UserRole.ADMIN }];
    const users = [...remote];
    def.forEach(a => { if (!users.find(u => u.username.toLowerCase() === a.username.toLowerCase())) users.push(a as any); });
    return users as User[];
  },

  async syncData<T>(tableName: string, localData: T[]): Promise<T[]> {
    if (!supabase || this.isOffline) return localData;
    try {
      const { data } = await supabase.from(tableName).select('*');
      if (data && data.length > 0) { saveLocal(tableName, data); return data as T[]; }
    } catch (e) {}
    return localData;
  }
};
