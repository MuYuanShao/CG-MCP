import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, describe, expect, it, vi } from 'vitest';
import PurchaseManagement from '../components/PurchaseManagement';
import * as purchase from '../services/purchase';
import * as supply from '../services/hospitalSupply';
const feedback = vi.hoisted(() => ({ confirm: vi.fn(), notify: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock('../components/AppFeedback', () => ({ useFeedback: () => feedback }));
vi.mock('../services/purchase', async importOriginal => ({ ...await importOriginal<typeof import('../services/purchase')>(), listPurchasePlans: vi.fn(), listPurchaseOrders: vi.fn(), rejectPurchasePlan: vi.fn() }));
vi.mock('../services/hospitalSupply', async importOriginal => ({ ...await importOriginal<typeof import('../services/hospitalSupply')>(),
  openSupplyDraft: vi.fn(), supplyOptions: vi.fn(), saveSupplyDraft: vi.fn(), submitSupply: vi.fn(),
  listSupplyDrafts: vi.fn(), listSupplyOrders: vi.fn(),
}));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
function mount(permissions: string[] = []) {return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><PurchaseManagement isAdministrator permissions={permissions} /></QueryClientProvider>);}
function fixtures() {
  vi.mocked(purchase.listPurchasePlans).mockResolvedValue({ records: [{ id: 42, documentNo: 'P42', sourceNo: '', hospital: '医院', productName: '商品', quantity: 10, amount: 20, businessDate: '2026-10-08', status: 'pending_approval', canApprove: true, canEdit: true }], total: 1, current: 1, size: 20 });
  vi.mocked(purchase.listPurchaseOrders).mockResolvedValue({ records: [], total: 0, current: 1, size: 20 });
}
describe('采购修复交互', () => {
  it('groups SPD-PR lines into one order and preserves the full order when one product matches', async () => {
    fixtures();
    vi.mocked(purchase.listPurchasePlans).mockResolvedValue({
      records: [{ id: 43, documentNo: 'SPD-PLAN-43', sourceNo: 'SPD-CG43', hospital: '测试院区',
        productName: '联调耗材', quantity: 1.25, amount: 3.125, businessDate: '2026-11-11', status: 'closed',
        canApprove: false, canEdit: false, planFields: {
          productCode: 'P43', spec: '10ml', unit: '支', unitPrice: 2.5, sourceStatus: 'cancelled',
          supplierCode: 'SUP43', currency: 'CNY', taxIncluded: true,
        } }, { id: 44, documentNo: 'SPD-PLAN-44', sourceNo: 'SPD-CG43', hospital: '测试院区',
        productName: '第二耗材', quantity: 2, amount: 10, businessDate: '2026-11-11', status: 'closed',
        canApprove: false, canEdit: false, planFields: {
          productCode: 'P44', unit: '盒', unitPrice: 5, sourceStatus: 'cancelled',
          supplierCode: 'SUP43', currency: 'CNY', taxIncluded: true,
        } }],
      total: 2, current: 1, size: 20,
    });
    mount();
    const row = within(await screen.findByRole('row', { name: /SPD-CG43/ }));
    expect(row.getByText('测试院区')).toBeTruthy();
    expect(row.getByText('1.25 支 / 2 盒')).toBeTruthy();
    expect(row.getByText('CNY 13.125')).toBeTruthy();
    expect(row.getByText('已取消')).toBeTruthy();
    fireEvent.change(screen.getByPlaceholderText('请输入商品编码'), { target: { value: 'P43' } });
    fireEvent.click(row.getByRole('button', { name: '查看明细' }));
    const modal = within(await screen.findByRole('dialog'));
    expect(modal.getByText('第二耗材')).toBeTruthy();
    expect((modal.getByRole('button', { name: '确认生成供货单' }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(modal.getByRole('button', { name: '取消' }));
    fireEvent.change(screen.getByPlaceholderText('请输入订单号'), { target: { value: '其他订单' } });
    expect(screen.queryByText('SPD-CG43')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '重置' }));
    expect(screen.getByText('SPD-CG43')).toBeTruthy();
  });
  it('opens a persistent supply draft in the order tab and submits the selected batch', async () => {
    fixtures();
    const draft = { draftId: 'draft-key', instanceId: 'instance', orderNo: 'CG55', supplierCode: 'SUP1', hospital: '测试医院',
      body: { supplyNo: 'GH55', warehouseCode: '', remark: '', items: [] } };
    vi.mocked(purchase.listPurchasePlans).mockResolvedValue({ records: [{
      id: 55, documentNo: 'SPD-PLAN-55', sourceNo: 'CG55', hospital: '测试医院', productName: '测试商品',
      quantity: 5, amount: 10, businessDate: '2026-11-11', status: 'closed', planFields: {
        sourceStatus: 'sent', instanceId: 'instance', sourceLineId: '55', productCode: 'P55', unit: '支', supplierCode: 'SUP1',
      },
    }], total: 1, current: 1, size: 20 });
    vi.mocked(supply.openSupplyDraft).mockResolvedValue(draft);
    vi.mocked(supply.supplyOptions).mockResolvedValue({ warehouses: [{ code: 'WH1', name: '中心库' }],
      items: [{ lineId: '55', productCode: 'P55', unit: '支', remainingQuantity: '5' }] });
    vi.mocked(supply.saveSupplyDraft).mockResolvedValue(draft);
    vi.mocked(supply.listSupplyDrafts).mockResolvedValue([]);
    vi.mocked(supply.listSupplyOrders).mockResolvedValue({ rows: [], total: 0, page: 1, size: 20 });
    vi.mocked(supply.submitSupply).mockResolvedValue({});
    feedback.confirm.mockResolvedValue(true);
    mount(['integration:read', 'integration:phase3:read', 'integration:supply']);
    fireEvent.click(await screen.findByRole('button', { name: '查看明细' }));
    fireEvent.click(screen.getByRole('button', { name: '确认生成供货单' }));
    await screen.findByRole('heading', { name: '采购订单（供货单）' });
    fireEvent.change(await screen.findByLabelText('供货数量 1'), { target: { value: '2' } });
    fireEvent.change(screen.getByLabelText('收货库房'), { target: { value: 'WH1' } });
    fireEvent.change(screen.getByLabelText('批号 1'), { target: { value: 'B55' } });
    fireEvent.change(screen.getByLabelText('生产日期 1'), { target: { value: '2026-10-01' } });
    fireEvent.change(screen.getByLabelText('有效期 1'), { target: { value: '2028-10-01' } });
    fireEvent.change(screen.getByLabelText('UDI 1'), { target: { value: 'UDI55' } });
    fireEvent.click(screen.getByRole('button', { name: '保存草稿' }));
    await waitFor(() => expect(supply.saveSupplyDraft).toHaveBeenCalledWith(draft, expect.objectContaining({ warehouseCode: 'WH1' })));
    await waitFor(() => expect((screen.getByRole('button', { name: '提交供货单' }) as HTMLButtonElement).disabled).toBe(false));
    fireEvent.click(screen.getByRole('button', { name: '提交供货单' }));
    await waitFor(() => expect(supply.submitSupply).toHaveBeenCalledWith('instance', 'CG55', 'draft-key',
      expect.objectContaining({ items: [expect.objectContaining({ quantity: '2', productionBatchNo: 'B55', udiCode: 'UDI55' })] })));
    await screen.findByRole('heading', { name: 'SPD-PR 供货单' });
  });
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
    fireEvent.click(screen.getByRole('button', { name: '采购订单（供货单）' }));
    expect((await screen.findByRole('alert')).textContent).toContain('订单连接失败');expect(screen.queryByText('暂无采购订单数据')).toBeNull();
  });
  it('uses order-list loading independently from the unopened detail query', async () => {
    fixtures();vi.mocked(purchase.listPurchaseOrders).mockImplementation(() => new Promise(() => {}));mount();
    fireEvent.click(screen.getByRole('button', { name: '采购订单（供货单）' }));
    expect(await screen.findByText('采购订单加载中...')).toBeTruthy();expect(screen.queryByText('暂无采购订单数据')).toBeNull();
  });
});
