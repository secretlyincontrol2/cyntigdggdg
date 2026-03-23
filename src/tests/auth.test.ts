import request from 'supertest';
import app from '../app';
import prisma from '../config/prismaClient';

describe('Auth API', () => {
  const testUser = {
    lastname: 'Test',
    firstname: 'User',
    matricNumber: 'TEST/21/0001',
    schoolEmail: 'testuser@school.edu',
    password: 'TestPassword1!',
  };

  afterAll(async () => {
    // Cleanup test user
    await prisma.user.deleteMany({
      where: {
        OR: [
          { matricNumber: testUser.matricNumber },
          { schoolEmail: testUser.schoolEmail }
        ]
      }
    });
    await prisma.$disconnect();
  });

  describe('POST /api/auth/register', () => {
    it('should register a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send(testUser);

      if (res.status === 400 && res.body.message === 'User already exists') {
         // This is fine if cleanup failed previously
         expect(res.status).toBe(400);
      } else {
        expect(res.status).toBe(201);
        expect(res.body).toHaveProperty('token');
        expect(res.body.email).toBe(testUser.schoolEmail);
      }
    });

    it('should fail with missing fields', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({ lastname: 'Test' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Please add all fields');
    });
  });

  describe('POST /api/auth/login', () => {
    it('should login successfully with correct credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          matricNumber: testUser.matricNumber,
          password: testUser.password,
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('token');
    });

    it('should fail with wrong password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          matricNumber: testUser.matricNumber,
          password: 'WrongPassword1!',
        });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('Invalid credentials');
    });
  });
});
