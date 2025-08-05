import { FastifyInstance } from 'fastify';
import { build } from '../src/server';

describe('User API', () => {
  let app: FastifyInstance;

  beforeAll(async () => {
    app = await build();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/v1/users', () => {
    it('should create a new user', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        payload: {
          email: 'test@example.com',
          name: 'Test User',
        },
      });

      expect(response.statusCode).toBe(201);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.data.email).toBe('test@example.com');
      expect(result.data.name).toBe('Test User');
    });

    it('should return 400 for invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        payload: {
          email: 'invalid-email',
          name: 'Test User',
        },
      });

      expect(response.statusCode).toBe(400);
    });
  });

  describe('GET /api/v1/users', () => {
    it('should return all users', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users',
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(Array.isArray(result.data)).toBe(true);
    });
  });

  describe('GET /api/v1/users/:id', () => {
    it('should return user by ID', async () => {
      // First create a user
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        payload: {
          email: 'getuser@example.com',
          name: 'Get User',
        },
      });

      const createdUser = JSON.parse(createResponse.payload);

      // Then get the user by ID
      const response = await app.inject({
        method: 'GET',
        url: `/api/v1/users/${createdUser.data.id}`,
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.data.id).toBe(createdUser.data.id);
    });

    it('should return 404 for non-existent user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/v1/users/non-existent-id',
      });

      expect(response.statusCode).toBe(404);
    });
  });

  describe('PUT /api/v1/users/:id', () => {
    it('should update user', async () => {
      // First create a user
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        payload: {
          email: 'updateuser@example.com',
          name: 'Update User',
        },
      });

      const createdUser = JSON.parse(createResponse.payload);

      // Then update the user
      const response = await app.inject({
        method: 'PUT',
        url: `/api/v1/users/${createdUser.data.id}`,
        payload: {
          name: 'Updated Name',
        },
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.data.name).toBe('Updated Name');
    });
  });

  describe('DELETE /api/v1/users/:id', () => {
    it('should delete user', async () => {
      // First create a user
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/v1/users',
        payload: {
          email: 'deleteuser@example.com',
          name: 'Delete User',
        },
      });

      const createdUser = JSON.parse(createResponse.payload);

      // Then delete the user
      const response = await app.inject({
        method: 'DELETE',
        url: `/api/v1/users/${createdUser.data.id}`,
      });

      expect(response.statusCode).toBe(200);
      const result = JSON.parse(response.payload);
      expect(result.success).toBe(true);
      expect(result.message).toBe('User deleted successfully');
    });
  });
}); 