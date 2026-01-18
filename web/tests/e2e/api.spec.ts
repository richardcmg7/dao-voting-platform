import { test, expect } from '@playwright/test';

const jsonHeaders = {
  'Content-Type': 'application/json',
};

test('relay endpoint blocks when relayer is not configured', async ({ request }) => {
  const response = await request.post('/api/relay', {
    headers: jsonHeaders,
    data: {
      request: {
        from: '0x0000000000000000000000000000000000000000',
        to: '0x0000000000000000000000000000000000000000',
        value: '0',
        gas: '0',
        nonce: '0',
        data: '0x',
      },
      signature: '0x',
    },
  });

  expect(response.status()).toBe(500);
  const payload = await response.json();
  expect(payload.error).toContain('Relayer not configured');
});

test('execute proposals endpoint indicates missing daemon config', async ({ request }) => {
  const response = await request.get('/api/execute-proposals');

  expect(response.status()).toBe(500);
  const payload = await response.json();
  expect(payload.error).toContain('Daemon not configured');
});
