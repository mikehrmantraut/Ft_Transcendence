// Base Model Interface
export interface BaseModel {
  id: number;
  createdAt: Date;
  updatedAt: Date;
}

// Frontend uyumlu User interface
export interface User extends BaseModel {
  firstName: string;
  lastName: string;
  email: string;
  isActive: boolean;
  displayName?: string;
  avatar?: string;
  onlineStatus?: 'online' | 'offline' | 'away';
}

// Detaylı User bilgileri
export interface UserDetail extends User {
  wins: number;
  losses: number;
  totalGames: number;
  winRate: number;
  rank?: number;
  friends: Friend[];
  blockedUsers: BlockedUser[];
}

// Auth için User interface
export interface AuthUser extends BaseModel {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  displayName: string;
  avatar?: string;
  isActive: boolean;
  emailVerified: boolean;
  lastLoginAt?: Date;
}

// Friend system
export interface Friend extends BaseModel {
  userId: number;
  friendId: number;
  status: 'pending' | 'accepted' | 'blocked';
  requestedBy: number;
}

export interface BlockedUser extends BaseModel {
  userId: number;
  blockedUserId: number;
  reason?: string;
}

// DTO interfaces - Frontend uyumlu
export interface CreateUserDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface CreateUserResponseDto extends User { }

export interface UpdateUserDto {
  id: number;
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
  displayName?: string;
  avatar?: string;
  isActive?: boolean;
}

export interface UpdateUserResponseDto extends User { }

// Login/Register DTOs
export interface LoginDto {
  email: string;
  password: string;
}

export interface RegisterDto {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  displayName?: string;
}

export interface AuthResponseDto {
  user: User;
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
}

// Profile update
export interface UpdateProfileDto {
  firstName?: string;
  lastName?: string;
  displayName?: string;
  avatar?: string;
}

// Friend requests
export interface SendFriendRequestDto {
  friendId: number;
}

export interface RespondFriendRequestDto {
  requestId: number;
  action: 'accept' | 'reject';
}

// Online status
export interface UpdateOnlineStatusDto {
  status: 'online' | 'offline' | 'away';
} 