import { expect, request, test } from '@playwright/test';

declare const process: {
  env: Record<string, string | undefined>;
};

const apiBaseUrl = process.env.E2E_API_BASE_URL;
const apiKey = process.env.E2E_API_KEY;
const username = process.env.E2E_ADMIN_USERNAME ?? 'admin';
const password = process.env.E2E_ADMIN_PASSWORD;

test.describe('API security and refund workflows', () => {
  test.skip(!apiBaseUrl || !apiKey || !password, 'Set E2E_API_BASE_URL, E2E_API_KEY and E2E_ADMIN_PASSWORD to run API security E2E tests');

  test('requires API key before authentication', async () => {
    const context = await request.newContext({ baseURL: apiBaseUrl });

    const response = await context.get('/api/refunds');

    expect(response.status()).toBe(401);
    await context.dispose();
  });

  test('logs in, carries tenant header, and validates refund create errors', async () => {
    const context = await request.newContext({
      baseURL: apiBaseUrl,
      extraHTTPHeaders: {
        'x-api-key': apiKey!,
        'x-tenant-id': '1',
      },
    });

    const loginResponse = await context.post('/api/auth/login', {
      data: { username, password },
    });
    expect(loginResponse.ok()).toBeTruthy();
    const loginBody = await loginResponse.json();
    const token = loginBody.data.token as string;
    expect(token).toBeTruthy();

    const refundResponse = await context.post('/api/refunds', {
      headers: { Authorization: `Bearer ${token}` },
      data: {
        relatedOrderNo: 'E2E-NOT-EXISTS',
        hospital: 'E2E医院',
        productName: 'E2E耗材',
        batchNo: 'E2E-BATCH',
        refundQty: 1,
        refundAmount: 1,
        reason: 'E2E验证',
        applyDate: '2026-05-07',
      },
    });

    expect(refundResponse.status()).toBe(404);
    const refundBody = await refundResponse.json();
    expect(refundBody.code).toBe('HOSPITAL_NOT_FOUND');
    await context.dispose();
  });
});
