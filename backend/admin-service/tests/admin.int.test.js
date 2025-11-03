const request = require('supertest');
const server = require('../server');

afterAll(() => {
  server.close();   // no done callback, no return value
});

test('health check', async () => {
  const res = await request(server).get('/health');
  expect(res.status).toBe(200);
  expect(res.body.status).toBe('admin ok');
});
