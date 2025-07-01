import { BaseModel } from './user.types';

// Game/Match types
export interface Game extends BaseModel {
  player1Id: number;
  player2Id: number;
  winnerId?: number;
  player1Score: number;
  player2Score: number;
  gameMode: 'classic' | 'tournament' | 'practice';
  status: 'waiting' | 'active' | 'finished' | 'cancelled';
  startedAt?: Date;
  finishedAt?: Date;
  duration?: number; // seconds
  tournamentId?: number;
}

// Tournament types
export interface Tournament extends BaseModel {
  name: string;
  description?: string;
  maxPlayers: number;
  currentPlayers: number;
  status: 'upcoming' | 'active' | 'finished' | 'cancelled';
  startTime: Date;
  endTime?: Date;
  winnerId?: number;
  prizePool?: number;
  entryFee?: number;
}

export interface TournamentParticipant extends BaseModel {
  tournamentId: number;
  userId: number;
  joinedAt: Date;
  eliminated: boolean;
  eliminatedAt?: Date;
  finalRank?: number;
}

// Match History for frontend
export interface MatchHistory {
  id: number;
  opponent: {
    id: number;
    displayName: string;
    avatar?: string;
  };
  result: 'win' | 'loss';
  playerScore: number;
  opponentScore: number;
  gameMode: 'classic' | 'tournament' | 'practice';
  playedAt: Date;
  duration: number;
  tournamentName?: string;
}

// User Statistics
export interface UserStats {
  userId: number;
  totalGames: number;
  wins: number;
  losses: number;
  winRate: number;
  totalPlayTime: number; // seconds
  avgGameDuration: number; // seconds
  longestGame: number; // seconds
  shortestGame: number; // seconds
  currentStreak: number;
  longestWinStreak: number;
  rank: number;
  rating: number;
  tournamentWins: number;
  tournamentParticipations: number;
}

// Leaderboard
export interface LeaderboardEntry {
  rank: number;
  user: {
    id: number;
    displayName: string;
    avatar?: string;
  };
  stats: {
    wins: number;
    losses: number;
    winRate: number;
    rating: number;
    totalGames: number;
  };
}

// DTOs for Game Service
export interface CreateGameDto {
  player1Id: number;
  player2Id: number;
  gameMode: 'classic' | 'tournament' | 'practice';
  tournamentId?: number;
}

export interface UpdateGameDto {
  id: number;
  player1Score?: number;
  player2Score?: number;
  status?: 'waiting' | 'active' | 'finished' | 'cancelled';
  winnerId?: number;
  startedAt?: Date;
  finishedAt?: Date;
}

export interface CreateTournamentDto {
  name: string;
  description?: string;
  maxPlayers: number;
  startTime: Date;
  prizePool?: number;
  entryFee?: number;
}

export interface JoinTournamentDto {
  tournamentId: number;
  userId: number;
}

// Pagination interfaces
export interface PaginationRequest {
  page: number;
  size: number;
  sort?: string;
  [key: string]: any;
}

export interface PaginationResponse<T> {
  data: T[];
  totalItems: number;
  totalPages: number;
  currentPage: number;
}

// Real-time game events
export interface GameEvent {
  type: 'game_start' | 'game_end' | 'score_update' | 'player_disconnect';
  gameId: number;
  data: any;
  timestamp: Date;
} 