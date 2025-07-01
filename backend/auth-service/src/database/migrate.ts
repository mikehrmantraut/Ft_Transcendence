import { DatabaseConnection } from './connection';

export class Migration {
  private db = DatabaseConnection.getInstance();

  async run(): Promise<void> {
    console.log('🔄 Running Auth Service database migrations...');

    try {
      // Create users table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          email VARCHAR(255) NOT NULL UNIQUE,
          password VARCHAR(255) NOT NULL,
          firstName VARCHAR(100) NOT NULL,
          lastName VARCHAR(100) NOT NULL,
          displayName VARCHAR(50) NOT NULL UNIQUE,
          avatar VARCHAR(500),
          isActive BOOLEAN DEFAULT 1,
          emailVerified BOOLEAN DEFAULT 0,
          lastLoginAt DATETIME,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          updatedAt DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // Create refresh tokens table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS refresh_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          token VARCHAR(500) NOT NULL UNIQUE,
          expiresAt DATETIME NOT NULL,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Create password reset tokens table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS password_reset_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          token VARCHAR(500) NOT NULL UNIQUE,
          expiresAt DATETIME NOT NULL,
          used BOOLEAN DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Create email verification tokens table
      this.db.exec(`
        CREATE TABLE IF NOT EXISTS email_verification_tokens (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          userId INTEGER NOT NULL,
          token VARCHAR(500) NOT NULL UNIQUE,
          expiresAt DATETIME NOT NULL,
          used BOOLEAN DEFAULT 0,
          createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
          FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
        )
      `);

      // Create indexes for better performance
      this.db.exec(`
        CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
        CREATE INDEX IF NOT EXISTS idx_users_displayName ON users(displayName);
        CREATE INDEX IF NOT EXISTS idx_users_isActive ON users(isActive);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_userId ON refresh_tokens(userId);
        CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token ON refresh_tokens(token);
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_userId ON password_reset_tokens(userId);
        CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens(token);
        CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_userId ON email_verification_tokens(userId);
        CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens(token);
      `);

      // Create trigger to update updatedAt column
      this.db.exec(`
        CREATE TRIGGER IF NOT EXISTS update_users_timestamp 
        AFTER UPDATE ON users
        BEGIN
          UPDATE users SET updatedAt = CURRENT_TIMESTAMP WHERE id = NEW.id;
        END;
      `);

      console.log('✅ Auth Service database migrations completed successfully');

    } catch (error) {
      console.error('❌ Auth Service database migration failed:', error);
      throw error;
    }
  }

  async seed(): Promise<void> {
    console.log('🌱 Seeding Auth Service database...');

    try {
      // Check if admin user exists
      const adminExists = this.db.prepare('SELECT COUNT(*) as count FROM users WHERE email = ?').get('admin@transcendence.com') as { count: number };

      if (adminExists.count === 0) {
        // Create admin user (for development/testing)
        const { AuthUtils } = await import('@transcendence/shared');
        const hashedPassword = await AuthUtils.hashPassword('Admin123!');

        this.db.prepare(`
          INSERT INTO users (email, password, firstName, lastName, displayName, isActive, emailVerified)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run('admin@transcendence.com', hashedPassword, 'Admin', 'User', 'admin', 1, 1);

        console.log('👑 Admin user created (email: admin@transcendence.com, password: Admin123!)');
      }

      console.log('✅ Auth Service database seeding completed');

    } catch (error) {
      console.error('❌ Auth Service database seeding failed:', error);
      throw error;
    }
  }
}

// Run migrations if this file is executed directly
if (require.main === module) {
  const migration = new Migration();
  migration.run()
    .then(() => migration.seed())
    .then(() => {
      console.log('🎉 Auth Service database setup complete!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('💥 Auth Service database setup failed:', error);
      process.exit(1);
    });
} 