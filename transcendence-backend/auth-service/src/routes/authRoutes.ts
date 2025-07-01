import { FastifyInstance } from 'fastify';
import { AuthService } from '../services/authService';
import { LoginDto, RegisterDto } from '@transcendence/shared';

export async function authRoutes(fastify: FastifyInstance) {
  const authService = new AuthService();

  // Register endpoint
  fastify.post<{
    Body: RegisterDto;
  }>('/api/auth/register', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password', 'firstName', 'lastName'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 8 },
          firstName: { type: 'string', minLength: 1, maxLength: 100 },
          lastName: { type: 'string', minLength: 1, maxLength: 100 },
          displayName: { type: 'string', minLength: 3, maxLength: 20 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const result = await authService.register(request.body);
      
      // Set refresh token as httpOnly cookie
      if (result.refreshToken) {
        reply.setCookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
      }

      reply.code(201).send({
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn
      });

    } catch (error) {
      fastify.log.error(error);
      reply.code(400).send({
        error: error instanceof Error ? error.message : 'Registration failed'
      });
    }
  });

  // Login endpoint
  fastify.post<{
    Body: LoginDto;
  }>('/api/auth/login', {
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 1 }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const result = await authService.login(request.body);
      
      // Set refresh token as httpOnly cookie
      if (result.refreshToken) {
        reply.setCookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
      }

      reply.send({
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn
      });

    } catch (error) {
      fastify.log.error(error);
      reply.code(401).send({
        error: error instanceof Error ? error.message : 'Login failed'
      });
    }
  });

  // Refresh token endpoint
  fastify.post('/api/auth/refresh', async (request, reply) => {
    try {
      const refreshToken = request.cookies.refreshToken;
      
      if (!refreshToken) {
        return reply.code(401).send({ error: 'No refresh token provided' });
      }

      const result = await authService.refreshToken(refreshToken);
      
      // Set new refresh token as httpOnly cookie
      if (result.refreshToken) {
        reply.setCookie('refreshToken', result.refreshToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'strict',
          maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
        });
      }

      reply.send({
        user: result.user,
        accessToken: result.accessToken,
        expiresIn: result.expiresIn
      });

    } catch (error) {
      fastify.log.error(error);
      reply.code(401).send({
        error: error instanceof Error ? error.message : 'Token refresh failed'
      });
    }
  });

  // Logout endpoint
  fastify.post('/api/auth/logout', async (request, reply) => {
    try {
      const refreshToken = request.cookies.refreshToken;
      
      if (refreshToken) {
        await authService.logout(refreshToken);
      }

      // Clear refresh token cookie
      reply.clearCookie('refreshToken');
      
      reply.send({ message: 'Logged out successfully' });

    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Logout failed'
      });
    }
  });

  // Validate token endpoint (used by other microservices)
  fastify.post<{
    Body: { token: string };
  }>('/api/auth/validate', {
    schema: {
      body: {
        type: 'object',
        required: ['token'],
        properties: {
          token: { type: 'string' }
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { token } = request.body;
      const user = await authService.validateToken(token);
      
      if (!user) {
        return reply.code(401).send({ error: 'Invalid token' });
      }

      reply.send({ user });

    } catch (error) {
      fastify.log.error(error);
      reply.code(401).send({
        error: 'Token validation failed'
      });
    }
  });

  // Get user by ID endpoint (internal use by other microservices)
  fastify.get<{
    Params: { userId: string };
  }>('/api/auth/user/:userId', async (request, reply) => {
    try {
      const userId = parseInt(request.params.userId);
      const user = authService.getUserById(userId);
      
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Don't return password
      const { password, ...userWithoutPassword } = user;
      reply.send({ user: userWithoutPassword });

    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Failed to get user'
      });
    }
  });

  // Get user by email endpoint (internal use)
  fastify.get<{
    Querystring: { email: string };
  }>('/api/auth/user', async (request, reply) => {
    try {
      const { email } = request.query;
      
      if (!email) {
        return reply.code(400).send({ error: 'Email parameter is required' });
      }

      const user = authService.getUserByEmail(email);
      
      if (!user) {
        return reply.code(404).send({ error: 'User not found' });
      }

      // Don't return password
      const { password, ...userWithoutPassword } = user;
      reply.send({ user: userWithoutPassword });

    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Failed to get user'
      });
    }
  });

  // Health check
  fastify.get('/api/auth/health', async (request, reply) => {
    return {
      status: 'healthy',
      service: 'auth-service',
      timestamp: new Date().toISOString()
    };
  });

  // Cleanup expired tokens (internal maintenance endpoint)
  fastify.post('/api/auth/cleanup', async (request, reply) => {
    try {
      authService.cleanupExpiredTokens();
      reply.send({ message: 'Cleanup completed successfully' });
    } catch (error) {
      fastify.log.error(error);
      reply.code(500).send({
        error: 'Cleanup failed'
      });
    }
  });
} 