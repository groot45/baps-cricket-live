
import { API_BASE_URL, TOURNAMENT } from '../config/tournament';
import { Match, Team, Player, User, UserRole, TournamentConfig } from '../types';

const getLocal = (key: string) => {
  const data = localStorage.getItem(`pc26_${key}`);
  return data ? JSON.parse(data) : null;
};

const saveLocal = (key: string, data: any) => {
  localStorage.setItem(`pc26_${key}`, JSON.stringify(data));
};

export const databaseService = {
  isOffline: false,

  async request(endpoint: string, options: RequestInit = {}) {
    try {
      const response = await fetch(`${API_BASE_URL}${endpoint}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          ...(options.headers || {}),
        },
      });
      if (!response.ok) throw new Error('API Error');
      this.isOffline = false;
      return await response.json();
    } catch (error) {
      console.warn(`Backend unreachable at ${endpoint}, using local fallback.`);
      this.isOffline = true;
      return null;
    }
  },

  // TOURNAMENT CONFIG
  async getTournamentConfig(): Promise<TournamentConfig> {
    const data = await this.request('/api/config');
    if (data) {
      saveLocal('config', data);
      return data;
    }
    const local = getLocal('config');
    return local || {
      id: TOURNAMENT.id,
      name: TOURNAMENT.name,
      shortName: "PRAMUKH CUP",
      year: TOURNAMENT.year,
      location: TOURNAMENT.location,
      logoUrl: ""
    };
  },

  async updateTournamentConfig(config: TournamentConfig): Promise<TournamentConfig> {
    const data = await this.request('/api/config', { method: 'POST', body: JSON.stringify(config) });
    if (!data) {
      saveLocal('config', config);
    }
    return config;
  },

  // USERS / STAFF
  async getUsers(): Promise<User[]> {
    const data = await this.request('/api/users');
    if (data) {
      saveLocal('users', data);
      return data;
    }
    const local = getLocal('users');
    if (!local) {
      const initial = [{ id: 'u_admin', username: 'admin', password: 'admin123', role: UserRole.ADMIN }];
      saveLocal('users', initial);
      return initial;
    }
    return local;
  },

  async createUser(user: Partial<User & { password?: string }>): Promise<User> {
    const data = await this.request('/api/users', { method: 'POST', body: JSON.stringify(user) });
    const users = await this.getUsers();
    const newUser = data || { ...user, id: `u_${Date.now()}` };
    if (!data) {
      saveLocal('users', [...users, newUser]);
    }
    return newUser as User;
  },

  async updateUser(userId: string, updates: Partial<User & { password?: string }>): Promise<User> {
    const data = await this.request(`/api/users/${userId}`, { method: 'PUT', body: JSON.stringify(updates) });
    const users = await this.getUsers();
    const index = users.findIndex(u => u.id === userId);
    if (index !== -1) {
      const updated = { ...users[index], ...updates };
      if (!data) {
        users[index] = updated;
        saveLocal('users', users);
      }
      return updated;
    }
    throw new Error("User not found");
  },

  // TEAMS
  async getTeams(): Promise<Team[]> {
    const data = await this.request('/api/teams');
    if (data) {
      saveLocal('teams', data);
      return data;
    }
    return getLocal('teams') || [];
  },

  async createTeam(team: Partial<Team>): Promise<Team> {
    const data = await this.request('/api/teams', { method: 'POST', body: JSON.stringify(team) });
    const teams = await this.getTeams();
    const newTeam = data || { ...team, id: `t_${Date.now()}` };
    if (!data) {
      saveLocal('teams', [...teams, newTeam]);
    }
    return newTeam;
  },

  // PLAYERS
  async getPlayers(): Promise<Player[]> {
    const data = await this.request('/api/players');
    if (data) {
      saveLocal('players', data);
      return data;
    }
    return getLocal('players') || [];
  },

  async createPlayer(player: Partial<Player>): Promise<Player> {
    const data = await this.request('/api/players', { method: 'POST', body: JSON.stringify(player) });
    const players = await this.getPlayers();
    const newPlayer = data || { ...player, id: `p_${Date.now()}` };
    if (!data) {
      saveLocal('players', [...players, newPlayer]);
    }
    return newPlayer;
  },

  // MATCHES
  async getMatches(): Promise<Match[]> {
    const data = await this.request('/api/matches');
    if (data) {
      saveLocal('matches', data);
      return data;
    }
    return getLocal('matches') || [];
  },

  async createMatch(match: any): Promise<Match> {
    const data = await this.request('/api/matches', { method: 'POST', body: JSON.stringify(match) });
    const matches = await this.getMatches();
    const newMatch = data || { 
      ...match, 
      id: `m_${Date.now()}`, 
      status: 'UPCOMING',
      currentInnings: 1,
      innings: [{ runs: 0, wickets: 0, overs: 0, balls: 0 }]
    };
    if (!data) {
      saveLocal('matches', [...matches, newMatch]);
    }
    return newMatch;
  },

  async updateMatchScore(matchId: string, scoreUpdate: any): Promise<Match> {
    const data = await this.request(`/api/matches/${matchId}/score`, { method: 'POST', body: JSON.stringify(scoreUpdate) });
    if (data) return data;

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

    matches[matchIndex] = match;
    saveLocal('matches', matches);
    return match;
  }
};
