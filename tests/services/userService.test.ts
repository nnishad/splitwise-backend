import { UserService } from '../../src/services/userService';
import { prisma } from '../setup';

describe('UserService', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService(prisma);
  });

  describe('createUser', () => {
    it('should create a new user successfully', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
      };

      const result = await userService.createUser(userData);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data?.email).toBe(userData.email);
      expect(result.data?.name).toBe(userData.name);
      expect(result.data?.id).toBeDefined();
      expect(result.data?.createdAt).toBeDefined();
      expect(result.data?.updatedAt).toBeDefined();
    });

    it('should return error for duplicate email', async () => {
      const userData = {
        email: 'duplicate@example.com',
        name: 'Test User',
      };

      // Create first user
      await userService.createUser(userData);

      // Try to create second user with same email
      const result = await userService.createUser(userData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('User with this email already exists');
    });
  });

  describe('getAllUsers', () => {
    it('should return empty array when no users exist', async () => {
      const result = await userService.getAllUsers();

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should return all users', async () => {
      const user1 = await userService.createUser({
        email: 'user1@example.com',
        name: 'User 1',
      });

      const user2 = await userService.createUser({
        email: 'user2@example.com',
        name: 'User 2',
      });

      const result = await userService.getAllUsers();

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      expect(result.data?.[0].email).toBe('user2@example.com'); // Ordered by createdAt desc
      expect(result.data?.[1].email).toBe('user1@example.com');
    });
  });

  describe('getUserById', () => {
    it('should return user when found', async () => {
      const createdUser = await userService.createUser({
        email: 'test@example.com',
        name: 'Test User',
      });

      const result = await userService.getUserById(createdUser.data!.id);

      expect(result.success).toBe(true);
      expect(result.data?.id).toBe(createdUser.data!.id);
      expect(result.data?.email).toBe('test@example.com');
    });

    it('should return error when user not found', async () => {
      const result = await userService.getUserById('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.message).toBe('User not found');
    });
  });

  describe('updateUser', () => {
    it('should update user successfully', async () => {
      const createdUser = await userService.createUser({
        email: 'test@example.com',
        name: 'Test User',
      });

      const updateData = {
        name: 'Updated Name',
      };

      const result = await userService.updateUser(createdUser.data!.id, updateData);

      expect(result.success).toBe(true);
      expect(result.data?.name).toBe('Updated Name');
      expect(result.data?.email).toBe('test@example.com'); // Email unchanged
    });

    it('should return error when user not found', async () => {
      const result = await userService.updateUser('non-existent-id', { name: 'New Name' });

      expect(result.success).toBe(false);
      expect(result.message).toBe('User not found');
    });
  });

  describe('deleteUser', () => {
    it('should delete user successfully', async () => {
      const createdUser = await userService.createUser({
        email: 'test@example.com',
        name: 'Test User',
      });

      const result = await userService.deleteUser(createdUser.data!.id);

      expect(result.success).toBe(true);
      expect(result.message).toBe('User deleted successfully');

      // Verify user is deleted
      const getUserResult = await userService.getUserById(createdUser.data!.id);
      expect(getUserResult.success).toBe(false);
    });

    it('should return error when user not found', async () => {
      const result = await userService.deleteUser('non-existent-id');

      expect(result.success).toBe(false);
      expect(result.message).toBe('User not found');
    });
  });
}); 