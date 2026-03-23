import request from 'supertest';
import app from '../app';

describe('GET /', () => {
  it('should return 200 OK and health message', async () => {
    const res = await request(app).get('/');
    expect(res.status).toBe(200);
    expect(res.text).toContain('BUPT-AI API is running');
  });
});
