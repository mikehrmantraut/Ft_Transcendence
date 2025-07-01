import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

export class DatabaseConnection {
  private static instance: Database.Database;

  static getInstance(): Database.Database {
    if (!this.instance) {
      const dbPath = process.env.DATABASE_PATH || './data/auth.db';
      const fullPath = path.resolve(dbPath);
      
      // Create data directory if it doesn't exist
      const dir = path.dirname(fullPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      this.instance = new Database(fullPath, {
        verbose: process.env.NODE_ENV === 'development' ? console.log : undefined
      });

      // Enable foreign keys
      this.instance.pragma('foreign_keys = ON');
      
      // WAL mode for better concurrency
      this.instance.pragma('journal_mode = WAL');
      
      console.log(`📚 Auth Database connected: ${fullPath}`);
    }

    return this.instance;
  }

  static close(): void {
    if (this.instance) {
      this.instance.close();
      console.log('📚 Auth Database connection closed');
    }
  }
} 