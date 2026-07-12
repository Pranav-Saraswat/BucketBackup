import request from 'supertest';
import express from 'express';
import cors from 'cors';
import healthRoutes from '../routes/health-routes';

// Mock PrismaClient to prevent real database interactions during API tests
jest.mock('@prisma/client', () => {
  const mockPrisma = {
    $queryRaw: jest.fn().mockResolvedValue([{ '1': 1 }])
  };
  return {
    PrismaClient: jest.fn().mockImplementation(() => mockPrisma)
  };
});

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/system', healthRoutes);

describe('Express API Integration Tests', () => {
  
  test('GET /api/system/health should return status healthy', async () => {
    const res = await request(app).get('/api/system/health');
    
    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('status');
    expect(res.body.status).toBe('healthy');
    expect(res.body).toHaveProperty('database');
    expect(res.body.database).toBe('connected');
  });
});
