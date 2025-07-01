import { DatabaseConnection } from '../database/connection';
import { 
  AuthUtils, 
  AuthUser, 
  LoginDto, 
  RegisterDto, 
  AuthResponseDto, 
  User 
} from '@transcendence/shared';
import Database from 'better-sqlite3';

export class AuthService {
  private db: Database.Database;

  constructor() {
    this.db = DatabaseConnection.getInstance();
  }

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { email, password, firstName, lastName, displayName } = registerDto;

    // Validate input
    if (!AuthUtils.validateEmail(email)) {
      throw new Error('Invalid email format');
    }

    const passwordValidation = AuthUtils.validatePassword(password);
    if (!passwordValidation.isValid) {
      throw new Error(`Password validation failed: ${passwordValidation.errors.join(', ')}`);
    }

    // Check if user already exists
    const existingUser = this.db.prepare('SELECT id FROM users WHERE email = ? OR displayName = ?')
      .get(email, displayName || AuthUtils.generateDisplayName(firstName, lastName));

    if (existingUser) {
      throw new Error('User with this email or display name already exists');
    }

    // Generate display name if not provided
    const finalDisplayName = displayName || AuthUtils.generateDisplayName(firstName, lastName);
    const sanitizedDisplayName = AuthUtils.sanitizeDisplayName(finalDisplayName);

    // Hash password
    const hashedPassword = await AuthUtils.hashPassword(password);

    // Insert user
    const insertUser = this.db.prepare(`
      INSERT INTO users (email, password, firstName, lastName, displayName, isActive, emailVerified)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const result = insertUser.run(
      email, 
      hashedPassword, 
      firstName, 
      lastName, 
      sanitizedDisplayName, 
      1, 
      0 // Email not verified by default
    );

    const userId = result.lastInsertRowid as number;

    // Get created user
    const user = this.getUserById(userId);
    if (!user) {
      throw new Error('Failed to create user');
    }

    // Generate tokens
    const accessToken = AuthUtils.generateToken({
      userId: user.id,
      email: user.email,
      displayName: user.displayName
    });

    const refreshToken = AuthUtils.generateRefreshToken({
      userId: user.id,
      email: user.email,
      displayName: user.displayName
    });

    // Store refresh token
    this.storeRefreshToken(userId, refreshToken);

    return {
      user: this.mapAuthUserToUser(user),
      accessToken,
      refreshToken,
      expiresIn: 7 * 24 * 60 * 60 // 7 days in seconds
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { email, password } = loginDto;

    // Find user by email
    const user = this.db.prepare('SELECT * FROM users WHERE email = ? AND isActive = 1')
      .get(email) as AuthUser | undefined;

    if (!user) {
      throw new Error('Invalid credentials');
    }

    // Verify password
    const isValidPassword = await AuthUtils.comparePassword(password, user.password);
    if (!isValidPassword) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    this.db.prepare('UPDATE users SET lastLoginAt = CURRENT_TIMESTAMP WHERE id = ?')
      .run(user.id);

    // Generate tokens
    const accessToken = AuthUtils.generateToken({
      userId: user.id,
      email: user.email,
      displayName: user.displayName
    });

    const refreshToken = AuthUtils.generateRefreshToken({
      userId: user.id,
      email: user.email,
      displayName: user.displayName
    });

    // Store refresh token
    this.storeRefreshToken(user.id, refreshToken);

    return {
      user: this.mapAuthUserToUser(user),
      accessToken,
      refreshToken,
      expiresIn: 7 * 24 * 60 * 60
    };
  }

  async refreshToken(token: string): Promise<AuthResponseDto> {
    // Verify refresh token
    const payload = AuthUtils.verifyToken(token);

    // Check if refresh token exists in database
    const storedToken = this.db.prepare(`
      SELECT rt.*, u.* FROM refresh_tokens rt 
      JOIN users u ON rt.userId = u.id 
      WHERE rt.token = ? AND rt.expiresAt > CURRENT_TIMESTAMP AND u.isActive = 1
    `).get(token) as (AuthUser & { token: string; expiresAt: string }) | undefined;

    if (!storedToken) {
      throw new Error('Invalid or expired refresh token');
    }

    // Generate new tokens
    const accessToken = AuthUtils.generateToken({
      userId: storedToken.id,
      email: storedToken.email,
      displayName: storedToken.displayName
    });

    const newRefreshToken = AuthUtils.generateRefreshToken({
      userId: storedToken.id,
      email: storedToken.email,
      displayName: storedToken.displayName
    });

    // Remove old refresh token and store new one
    this.db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(token);
    this.storeRefreshToken(storedToken.id, newRefreshToken);

    return {
      user: this.mapAuthUserToUser(storedToken),
      accessToken,
      refreshToken: newRefreshToken,
      expiresIn: 7 * 24 * 60 * 60
    };
  }

  async logout(token: string): Promise<void> {
    // Remove refresh token
    this.db.prepare('DELETE FROM refresh_tokens WHERE token = ?').run(token);
  }

  async validateToken(token: string): Promise<User | null> {
    try {
      const payload = AuthUtils.verifyToken(token);
      const user = this.getUserById(payload.userId);
      return user ? this.mapAuthUserToUser(user) : null;
    } catch (error) {
      return null;
    }
  }

  getUserById(id: number): AuthUser | null {
    const user = this.db.prepare('SELECT * FROM users WHERE id = ? AND isActive = 1')
      .get(id) as AuthUser | undefined;
    return user || null;
  }

  getUserByEmail(email: string): AuthUser | null {
    const user = this.db.prepare('SELECT * FROM users WHERE email = ? AND isActive = 1')
      .get(email) as AuthUser | undefined;
    return user || null;
  }

  getUserByDisplayName(displayName: string): AuthUser | null {
    const user = this.db.prepare('SELECT * FROM users WHERE displayName = ? AND isActive = 1')
      .get(displayName) as AuthUser | undefined;
    return user || null;
  }

  private storeRefreshToken(userId: number, token: string): void {
    // Remove existing refresh tokens for this user
    this.db.prepare('DELETE FROM refresh_tokens WHERE userId = ?').run(userId);

    // Store new refresh token (30 days expiry)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 30);

    this.db.prepare(`
      INSERT INTO refresh_tokens (userId, token, expiresAt)
      VALUES (?, ?, ?)
    `).run(userId, token, expiresAt.toISOString());
  }

  private mapAuthUserToUser(authUser: AuthUser): User {
    return {
      id: authUser.id,
      email: authUser.email,
      firstName: authUser.firstName,
      lastName: authUser.lastName,
      displayName: authUser.displayName,
      avatar: authUser.avatar,
      isActive: authUser.isActive,
      createdAt: new Date(authUser.createdAt),
      updatedAt: new Date(authUser.updatedAt),
      onlineStatus: 'online' // Default status, will be managed by user service
    };
  }

  // Cleanup expired tokens (should be run periodically)
  cleanupExpiredTokens(): void {
    this.db.prepare('DELETE FROM refresh_tokens WHERE expiresAt < CURRENT_TIMESTAMP').run();
    this.db.prepare('DELETE FROM password_reset_tokens WHERE expiresAt < CURRENT_TIMESTAMP').run();
    this.db.prepare('DELETE FROM email_verification_tokens WHERE expiresAt < CURRENT_TIMESTAMP').run();
  }
} 