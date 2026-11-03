import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import HospitalSupplyManagement from '../components/HospitalSupplyManagement';
import * as api from '../services/hospitalSupply';
const feedback = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn(), confirm: vi.fn().mockResolvedValue(true) }));
vi.mock('../components/AppFeedback', () => ({ useFeedback: () => ({ notify: feedback, confirm: feedback.confirm }) }));
vi.mock('../services/hospitalSupply', () => ({ supplyCapability: vi.fn(), hospitalOrders: vi.fn(), supplyOptions: vi.fn(), submitSupply: vi.fn(), supplyHistory: vi.fn(), refreshSupply: vi.fn(), retrySupply: vi.fn(), supplyItems: vi.fn() }));
beforeEach(() => {
  vi.mocked(api.supplyCapability).mockResolvedValue({ enabled: true });
  vi.mocked(api.hospitalOrders).mockResolvedValue({ rows: [{ orderNo: 'CG1', supplierCode: 'S1', status: 'sent', totalAmount: 9.876, currency: 'CNY', items: [] }], total: 1, page: 1, size: 20 });
  vi.mocked(api.supplyOptions).mockResolvedValue({ warehouses: [{ code: 'W1', name: '中心库' }], items: [{ lineId: '1', productCode: 'P1', unit: '支', remainingQuantity: '8' }] });
  vi.mocked(api.supplyHistory).mockResolvedValue({ rows: [{ messageId: 'message', supplyNo: 'GH1', state: 'processed', result: { receivingNo: 'RK1', receivingStatus: 'draft' }, createdAt: '' }], total: 1, page: 1, size: 20 });
});
afterEach(() => { cleanup(); vi.clearAllMocks(); });
function mount() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><HospitalSupplyManagement instanceId="hospital" permissions={['integration:phase3:read', 'integration:supply']} /></QueryClientProvider>); }
describe('医院订单供货', () => {
  it('does not present a processed message as stock already received', async () => {
    mount();await screen.findByText('CG1');fireEvent.click(screen.getByRole('button', { name: '供货与回传记录' }));
    expect(await screen.findByText('SPD待收货')).toBeTruthy();expect(screen.getByText('RK1')).toBeTruthy();
    expect(screen.queryByText('SPD已验收入库')).toBeNull();expect(screen.queryByRole('button', { name: '审核入库' })).toBeNull();
  });
  it('does not allow supply amounts above current hospital capacity', async () => {
    mount();await screen.findByText('CG1');fireEvent.click(screen.getByRole('button', { name: '供货与回传记录' }));
    fireEvent.change(await screen.findByLabelText('医院收货库房'), { target: { value: 'W1' } });
    for (const [name, value] of [['供货数量 1', '9'], ['生产批号 1', 'LOT'], ['生产日期 1', '2026-01-01'], ['有效期 1', '2099-01-01']]) fireEvent.change(screen.getByLabelText(name!), { target: { value } });
    fireEvent.click(screen.getByRole('button', { name: '提交供货回传' }));
    await waitFor(() => expect(feedback.error).toHaveBeenCalledWith('供货数量超过医院当前剩余可收数量，请重新读取订单'));
    expect(api.submitSupply).not.toHaveBeenCalled();
  });
  it('keeps the page inactive when supply is disabled', async () => {
    vi.mocked(api.supplyCapability).mockResolvedValue({ enabled: false });mount();
    expect(await screen.findByText('医院订单供货回传尚未启用，请联系管理员。')).toBeTruthy();expect(api.hospitalOrders).not.toHaveBeenCalled();
  });
});
