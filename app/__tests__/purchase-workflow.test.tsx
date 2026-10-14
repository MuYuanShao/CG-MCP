import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PurchaseManagement from '../components/PurchaseManagement';
import * as purchase from '../services/purchase';
const feedback = vi.hoisted(() => ({ confirm: vi.fn(), notify: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock('../components/AppFeedback', () => ({ useFeedback: () => feedback }));
vi.mock('../services/purchase', async importOriginal => ({ ...await importOriginal<typeof import('../services/purchase')>(), listPurchasePlans: vi.fn(), listPurchaseOrders: vi.fn(), rejectPurchasePlan: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
function mount() {return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PurchaseManagement isAdministrator /></QueryClientProvider>);}
function fixtures() {
  vi.mocked(purchase.listPurchasePlans).mockResolvedValue({ records: [{ id: 42, documentNo: 'P42', sourceNo: '', hospital: '医院', productName: '商品', quantity: 10, amount: 20, businessDate: '2026-10-08', status: 'pending_approval', canApprove: true, canEdit: true }], total: 1, current: 1, size: 20 });
  vi.mocked(purchase.listPurchaseOrders).mockResolvedValue({ records: [], total: 0, current: 1, size: 20 });
}
describe('采购修复交互', () => {
  it('does not reject until the user confirms, and cancel sends no request', async () => {
    fixtures();feedback.confirm.mockResolvedValue(false);vi.mocked(purchase.rejectPurchasePlan).mockResolvedValue({ rejected: true });mount();
    await screen.findByText('P42');
    const rowCheckbox = screen.getAllByRole('checkbox')[1];
    if (!rowCheckbox) throw new Error('采购计划行选择框未呈现');
    fireEvent.click(rowCheckbox);fireEvent.click(screen.getByRole('button', { name: '驳回' }));
    await waitFor(() => expect(feedback.confirm).toHaveBeenCalled());expect(purchase.rejectPurchasePlan).not.toHaveBeenCalled();
    feedback.confirm.mockResolvedValue(true);fireEvent.click(screen.getByRole('button', { name: '驳回' }));
    await waitFor(() => expect(purchase.rejectPurchasePlan).toHaveBeenCalledWith(42));
  });
  it('shows list errors instead of an empty-order message', async () => {
    fixtures();vi.mocked(purchase.listPurchaseOrders).mockRejectedValue(new Error('订单连接失败'));mount();
    fireEvent.click(screen.getByRole('button', { name: '采购订单' }));
    expect((await screen.findByRole('alert')).textContent).toContain('订单连接失败');expect(screen.queryByText('暂无采购订单数据')).toBeNull();
  });
  it('uses order-list loading independently from the unopened detail query', async () => {
    fixtures();vi.mocked(purchase.listPurchaseOrders).mockImplementation(() => new Promise(() => {}));mount();
    fireEvent.click(screen.getByRole('button', { name: '采购订单' }));
    expect(await screen.findByText('采购订单加载中...')).toBeTruthy();expect(screen.queryByText('暂无采购订单数据')).toBeNull();
  });
});
