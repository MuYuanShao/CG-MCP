import { describe, it, expect, vi, afterEach } from 'vitest';
import { requestJson } from '../lib/api';
import { listPurchaseOrders, listDeliveryOrders, listShipmentOrders, submitPurchasePlan } from '../services/purchase';
vi.mock('../lib/api', () => ({ requestJson: vi.fn() }));
afterEach(() => vi.resetAllMocks());
describe('采购接口兼容', () => {
  it('keeps real order, delivery and shipment IDs from array responses', async () => {
    vi.mocked(requestJson).mockResolvedValue({ data: [{ id: 42, documentNo: 'REAL-42' }] });
    for (const query of [listPurchaseOrders, listDeliveryOrders, listShipmentOrders]) {
      const result = await query();
      expect(result.records?.[0]?.id).toBe(42);expect(result.total).toBe(1);
    }
  });
  it('preserves an existing page response', async () => {
    const page = { records: [{ id: 7 }], total: 55, current: 2, size: 20 };
    vi.mocked(requestJson).mockResolvedValue({ data: page });expect(await listPurchaseOrders()).toEqual(page);
  });
  it('submits a corrected draft through the new protected endpoint', async () => {
    vi.mocked(requestJson).mockResolvedValue({ data: { submitted: true } });
    await submitPurchasePlan(42);expect(requestJson).toHaveBeenCalledWith('/purchase-plans/42/submit', { method: 'POST' });
  });
});
