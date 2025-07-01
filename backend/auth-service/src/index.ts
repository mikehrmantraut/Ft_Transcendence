import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import env from '@fastify/env';
import cookie from '@fastify/cookie';

import { DatabaseConnection } from './database/connection';
import { Migration } from './database/migrate';
import { authRoutes } from './routes/authRoutes';

const envSchema = {
  type: 'object',
  required: [],
  properties: {
    NODE_ENV: { type: 'string', default: 'development' },
    PORT: { type: 'number', default: 3002 },
    DATABASE_PATH: { type: 'string', default: './data/auth.db' },
    JWT_SECRET: { type: 'string', default: 'your-super-secret-jwt-key-change-in-production' },
    JWT_EXPIRES_IN: { type: 'string', default: '7d' }
  }
};

const server = Fastify({
  logger: {
    level: 'info',
    transport: {
      target: 'pino-pretty',
      options: {
        colorize: true,
        ignore: 'pid,hostname'
      }
    }
  }
});

async function start() {
  try {
    // Environment validation
    await server.register(env, {
      schema: envSchema,
      dotenv: true
    });

    // Get config from environment
    const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3002;
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';

    // Security plugins
    await server.register(helmet, {
      crossOriginEmbedderPolicy: false
    });

    await server.register(cors, {
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] 
        : ['http://localhost:3000', 'http://localhost:5173', 'http://localhost:3001'],
      credentials: true
    });

    // Cookie support for refresh tokens
    await server.register(cookie, {
      secret: JWT_SECRET,
      parseOptions: {}
    });

    // Rate limiting
    await server.register(rateLimit, {
      max: 50, // Lower limit for auth service
      timeWindow: '1 minute'
    });

    // Initialize database
    console.log('🔄 Initializing Auth Service database...');
    const migration = new Migration();
    await migration.run();
    await migration.seed();

    // Register routes
    await server.register(authRoutes);

    // Health check endpoint
    server.get('/health', async (request, reply) => {
      return {
        status: 'healthy',
        service: 'auth-service',
        timestamp: new Date().toISOString(),
        database: 'connected',
        version: '1.0.0'
      };
    });

    // Error handler
    server.setErrorHandler((error, request, reply) => {
      server.log.error(error);
      
      // Don't expose internal errors in production
      if (process.env.NODE_ENV === 'production') {
        if (error.statusCode && error.statusCode < 500) {
          reply.status(error.statusCode).send({
            error: error.message,
            statusCode: error.statusCode
          });
        } else {
          reply.status(500).send({
            error: 'Internal Server Error',
            statusCode: 500
          });
        }
      } else {
        if (error.statusCode) {
          reply.status(error.statusCode).send({
            error: error.message,
            statusCode: error.statusCode,
            stack: error.stack
          });
        } else {
          reply.status(500).send({
            error: 'Internal Server Error',
            statusCode: 500,
            stack: error.stack
          });
        }
      }
    });

    // Not found handler
    server.setNotFoundHandler((request, reply) => {
      reply.code(404).send({
        error: 'Endpoint not found',
        statusCode: 404,
        path: request.url
      });
    });

    // Start server
    await server.listen({ port: PORT, host: '0.0.0.0' });
    
    console.log(`🔐 Auth Service is running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`🔑 Endpoints available:`);
    console.log(`   POST http://localhost:${PORT}/api/auth/register`);
    console.log(`   POST http://localhost:${PORT}/api/auth/login`);
    console.log(`   POST http://localhost:${PORT}/api/auth/logout`);
    console.log(`   POST http://localhost:${PORT}/api/auth/refresh`);

    // Schedule periodic cleanup of expired tokens (every hour)
    setInterval(() => {
      try {
        const { AuthService } = require('./services/authService');
        const authService = new AuthService();
        authService.cleanupExpiredTokens();
        console.log('🧹 Periodic token cleanup completed');
      } catch (error) {
        console.error('❌ Periodic token cleanup failed:', error);
      }
    }, 60 * 60 * 1000); // 1 hour

  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down Auth Service...');
  
  try {
    await server.close();
    DatabaseConnection.close();
    console.log('✅ Auth Service shut down gracefully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Received SIGTERM, shutting down Auth Service...');
  
  try {
    await server.close();
    DatabaseConnection.close();
    console.log('✅ Auth Service shut down gracefully');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error during shutdown:', error);
    process.exit(1);
  }
});

start(); 