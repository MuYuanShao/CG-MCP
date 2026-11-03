import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Phase3Management from '../components/Phase3Management';
import { phase3Documents, phase3Items, exactMoney } from '../services/phase3';
vi.mock('../components/AppFeedback', () => ({ useFeedback: () => ({ notify: { success: vi.fn(), error: vi.fn() }, confirm: vi.fn() }) }));
vi.mock('../services/phase3', async original => ({ ...await original<typeof import('../services/phase3')>(), phase3Documents: vi.fn(), phase3Items: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
function mount() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Phase3Management instanceId="hospital" permissions={['integration:phase3:read']} /></QueryClientProvider>); }
describe('医院来源计划与结算', () => {
  it('preserves four decimal digits and large integer precision in display', () => {
    expect(exactMoney('9007199254740993.0001')).toBe('9,007,199,254,740,993.0001');
    expect(exactMoney('0.0000')).toBe('0.0000');
    expect(exactMoney(null)).toBe('—');
  });
  it('shows missing historical estimates without inventing zero amounts or supplier administration', async () => {
    vi.mocked(phase3Documents).mockResolvedValue({ rows: [{ sourceId: '9007199254740993', documentNo: 'PLAN-01', supplierCode: 'S1', revision: '2', operation: 'UPSERT', sourceStatus: 'approved', totalAmount: null, currency: null, payload: {} }], total: 1, page: 1, size: 20 });
    vi.mocked(phase3Items).mockResolvedValue({ rows: [{ sourceLineId: '9007199254740993', productCode: 'P1', unit: '支', plannedQuantity: '12', estimatedAmount: null, priceBasis: 'not_recorded' }], total: 1, page: 1, size: 20 });
    mount();await screen.findByText('PLAN-01');fireEvent.click(screen.getByRole('button', { name: '明细与反馈' }));
    expect(await screen.findByText('未记录估价')).toBeTruthy();
    expect(screen.getByText('9007199254740993')).toBeTruthy();
    expect(screen.queryByText('供应商数据范围配置')).toBeNull();
    expect(screen.queryByRole('button', { name: '提交协同反馈' })).toBeNull();
  });
  it('shows plan unit price separately from the line estimate amount', async () => {
    vi.mocked(phase3Documents).mockResolvedValue({ rows: [{ sourceId: '15', documentNo: 'PLAN-MIX', supplierCode: 'S1', revision: '2', operation: 'UPSERT', sourceStatus: 'executed', totalAmount: null, currency: null, payload: {} }], total: 1, page: 1, size: 20 });
    vi.mocked(phase3Items).mockResolvedValue({ rows: [{ sourceLineId: '15', productCode: 'P-MIX', unit: '支', plannedQuantity: '20', estimatedUnitPrice: '2.5000', estimatedAmount: '50.0000', priceBasis: 'catalog_at_plan_creation' }], total: 1, page: 1, size: 20 });
    mount();await screen.findByText('PLAN-MIX');fireEvent.click(screen.getByRole('button', { name: '明细与反馈' }));
    await screen.findByText('2.5000');
    const cells = screen.getByText('P-MIX').closest('tr')!.querySelectorAll('td');
    expect(cells[4]?.textContent).toBe('2.5000');
    expect(cells[5]?.textContent).toBe('50.0000');
  });
  it('shows a real empty query result', async () => {
    vi.mocked(phase3Documents).mockResolvedValue({ rows: [], total: 0, page: 1, size: 20 });mount();
    expect(await screen.findByText('当前条件下暂无医院单据。')).toBeTruthy();
  });
});
