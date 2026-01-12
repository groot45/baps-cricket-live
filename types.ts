
export enum UserRole {
  ADMIN = 'ADMIN',
  SCORER = 'SCORER',
  PUBLIC = 'PUBLIC'
}

export interface User {
  id: string;
  username: string;
  role: UserRole;
  token?: string;
}

export interface TournamentConfig {
  id: string;
  name: string;
  shortName: string;
  year: number;
  location: string;
  logoUrl?: string;
  bapsFullLogo?: string;
  bapsSymbol?: string;
}

export interface Team {
  id: string;
  name: string;
  shortName: string;
  logoUrl?: string;
}

export type BattingStyle = 'Right Hand' | 'Left Hand';
export type BowlingStyle = 'Right Arm Fast' | 'Right Arm Spin' | 'Left Arm Fast' | 'Left Arm Spin' | 'None';
export type PlayerRole = 'Batsman' | 'Bowler' | 'All-Rounder' | 'Wicket Keeper';

export interface Player {
  id: string;
  name: string;
  teamId: string;
  battingStyle?: BattingStyle;
  bowlingStyle?: BowlingStyle;
  role?: PlayerRole;
}

export interface BatsmanStats {
  playerId: string;
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
}

export interface BowlerStats {
  playerId: string;
  name: string;
  overs: number;
  balls: number;
  runs: number;
  wickets: number;
}

export interface Ball {
  run: number;
  isExtra: boolean;
  extraType?: 'wide' | 'no-ball' | 'bye' | 'leg-bye';
  isWicket: boolean;
  wicketType?: string;
  batsmanId: string;
  bowlerId: string;
}

export interface Over {
  number: number;
  balls: Ball[];
}

export interface Inning {
  battingTeamId: string;
  bowlingTeamId: string;
  runs: number;
  wickets: number;
  overs: number;
  balls: number;
  oversHistory: Over[];
  strikerId?: string;
  nonStrikerId?: string;
  currentBowlerId?: string;
  batsmenStats: BatsmanStats[];
  bowlerStats: BowlerStats[];
}

export interface Match {
  id: string;
  tournamentId: string;
  teamA: Team;
  teamB: Team;
  status: 'UPCOMING' | 'LIVE' | 'COMPLETED';
  currentInnings: number;
  innings: Inning[];
  startTime: string;
  venue: string;
  scorerId?: string;
}
