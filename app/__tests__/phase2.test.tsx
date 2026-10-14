import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Phase2Management from '../components/Phase2Management';
import { phase2Report, phase2Documents, type Phase2Report } from '../services/phase2';
vi.mock('../services/phase2', () => ({ phase2Report: vi.fn(), phase2Documents: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
function mount() { return render(<QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}><Phase2Management instanceId="one" /></QueryClientProvider>); }
function selectTab(name: string) { fireEvent.mouseDown(screen.getByRole('tab', { name }), { button: 0, ctrlKey: false }); }
function data(): Phase2Report { return { execution: [], suppliers: [], amounts: [{ currency: 'CNY', taxIncluded: true, amountOrigin: 'captured', inboundAmount: 12, returnAmount: 4, netAmount: 8 }], inventoryUpdatedAt: '2026-10-08T01:00:00Z', inventoryCurrency: 'CNY', inventoryTaxIncluded: true, valuationBasis: 'catalog_purchase_price', inventory: [{ productName: '测试耗材', manufacturer: '厂家', expiryStatus: 'expired', daysToExpiry: -1, stock: { warehouseCode: 'W1', warehouseName: '中心库', productCode: 'P1', unit: '支', systemBatchNo: 'B1', looseQuantity: 6, packagedQuantity: 4, lockedQuantity: 0, isolatedQuantity: 0, inTransitQuantity: 0, amount: 20, expiryDate: '2026-10-07' } }] }; }
describe('第二期履约与库存', () => {
  it('shows source purchasing amounts without merging currency or tax groups', async () => {
    vi.mocked(phase2Report).mockResolvedValue(data());mount();
    selectTab('实际采购金额');
    expect(await screen.findByText('CNY')).toBeTruthy();expect(screen.getByText('8')).toBeTruthy();
    expect(screen.getByText(/未上传退货不代表实际没有退货/)).toBeTruthy();
  });
  it('shows current stock as loose plus packaged balance and labels expired batches', async () => {
    vi.mocked(phase2Report).mockResolvedValue(data());mount();selectTab('批次库存与效期');
    expect(await screen.findByText('10')).toBeTruthy();expect(screen.getByText('已过期')).toBeTruthy();expect(screen.getByText(/已签收包不重复累计/)).toBeTruthy();
  });
  it('opens uploaded document lines with their original reference and reason', async () => {
    vi.mocked(phase2Report).mockResolvedValue(data());
    vi.mocked(phase2Documents).mockResolvedValue([{ instanceId: 'one', kind: 'receiving', sourceCode: 'RC1', sourceUpdatedAt: '', payload: { documentNo: 'RC1', orderNo: 'PO1', warehouseCode: 'W1', documentDate: '2026-10-08', status: 'approved', sourceUpdatedAt: '', items: [{ lineId: 'R1', orderLineId: 'O1', productCode: 'P1', unit: '支', quantity: 8, qualifiedQuantity: 6, rejectedQuantity: 2, reason: '外包装破损' }] } }]);
    mount();selectTab('履约单据查询');await screen.findByText('RC1');fireEvent.click(screen.getByRole('button', { name: '明细' }));
    expect(screen.getByText('O1')).toBeTruthy();expect(screen.getByText('外包装破损')).toBeTruthy();
  });
});
