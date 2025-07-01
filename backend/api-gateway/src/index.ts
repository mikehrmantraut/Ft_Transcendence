import Fastify from 'fastify';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import rateLimit from '@fastify/rate-limit';
import httpProxy from '@fastify/http-proxy';
import jwt from '@fastify/jwt';
import env from '@fastify/env';
import { AuthUtils } from '@transcendence/shared';

const envSchema = {
  type: 'object',
  required: [],
  properties: {
    NODE_ENV: { type: 'string', default: 'development' },
    PORT: { type: 'number', default: 3001 },
    AUTH_SERVICE_URL: { type: 'string', default: 'http://127.0.0.1:3002' },
    USER_SERVICE_URL: { type: 'string', default: 'http://127.0.0.1:3003' },
    GAME_SERVICE_URL: { type: 'string', default: 'http://127.0.0.1:3004' },
    FILE_SERVICE_URL: { type: 'string', default: 'http://127.0.0.1:3005' },
    JWT_SECRET: { type: 'string', default: 'your-super-secret-jwt-key-change-in-production' }
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
    const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3001;
    const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
    const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://127.0.0.1:3002';
    const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://127.0.0.1:3003';
    const GAME_SERVICE_URL = process.env.GAME_SERVICE_URL || 'http://127.0.0.1:3004';
    const FILE_SERVICE_URL = process.env.FILE_SERVICE_URL || 'http://127.0.0.1:3005';

    // Security plugins
    await server.register(helmet, {
      crossOriginEmbedderPolicy: false
    });

    await server.register(cors, {
      origin: process.env.NODE_ENV === 'production' 
        ? ['https://yourdomain.com'] 
        : ['http://localhost:3000', 'http://localhost:5173'],
      credentials: true
    });

    // Rate limiting
    await server.register(rateLimit, {
      max: 100,
      timeWindow: '1 minute'
    });

    // JWT configuration
    await server.register(jwt, {
      secret: JWT_SECRET
    });

    // Health check
    server.get('/health', async (request, reply) => {
      const services = {
        auth: AUTH_SERVICE_URL,
        user: USER_SERVICE_URL,
        game: GAME_SERVICE_URL,
        file: FILE_SERVICE_URL
      };

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        services,
        version: '1.0.0'
      };
    });

    // Authentication middleware for protected routes
    server.addHook('preHandler', async (request, reply) => {
      const protectedPaths = ['/api/users', '/api/games', '/api/files'];
      const publicPaths = ['/api/auth/login', '/api/auth/register', '/health'];

      const isProtected = protectedPaths.some(path => request.url.startsWith(path));
      const isPublic = publicPaths.some(path => request.url.startsWith(path));

      if (isProtected && !isPublic) {
        try {
          const authHeader = request.headers.authorization;
          const token = AuthUtils.extractTokenFromHeader(authHeader);
          
          if (!token) {
            return reply.code(401).send({ error: 'No authorization token provided' });
          }

          const payload = AuthUtils.verifyToken(token);
          // Set user on request for downstream use
          (request as any).user = payload;
        } catch (error) {
          return reply.code(401).send({ error: 'Invalid or expired token' });
        }
      }
    });

    // Auth Service Proxy
    await server.register(httpProxy, {
      upstream: AUTH_SERVICE_URL,
      prefix: '/api/auth',
      rewritePrefix: '/api/auth',
      http2: false
    });

    // User Service Proxy
    await server.register(httpProxy, {
      upstream: USER_SERVICE_URL,
      prefix: '/api/users',
      rewritePrefix: '/api/users',
      http2: false
    });

    // Game Service Proxy
    await server.register(httpProxy, {
      upstream: GAME_SERVICE_URL,
      prefix: '/api/games',
      rewritePrefix: '/api/games',
      http2: false
    });

    // File Service Proxy
    await server.register(httpProxy, {
      upstream: FILE_SERVICE_URL,
      prefix: '/api/files',
      rewritePrefix: '/api/files',
      http2: false
    });

    // Leaderboard endpoint (from game service)
    await server.register(httpProxy, {
      upstream: GAME_SERVICE_URL,
      prefix: '/api/leaderboard',
      rewritePrefix: '/api/leaderboard',
      http2: false
    });

    // Error handler
    server.setErrorHandler((error, request, reply) => {
      server.log.error(error);
      
      if (error.statusCode) {
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
    });

    // Start server
    await server.listen({ port: PORT, host: '0.0.0.0' });
    
    console.log(`🚀 API Gateway is running on http://localhost:${PORT}`);
    console.log(`📋 Health check: http://localhost:${PORT}/health`);
    console.log(`🔄 Proxying requests to:`);
    console.log(`   /api/auth/* → ${AUTH_SERVICE_URL}`);
    console.log(`   /api/users/* → ${USER_SERVICE_URL}`);
    console.log(`   /api/games/* → ${GAME_SERVICE_URL}`);
    console.log(`   /api/files/* → ${FILE_SERVICE_URL}`);
    
  } catch (error) {
    server.log.error(error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down API Gateway...');
  await server.close();
  process.exit(0);
});

start(); 