import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import IntegrationManagement from '../components/IntegrationManagement';
import SpdDispatchDialog from '../components/SpdDispatchDialog';
import * as api from '../services/integration';
import { listProducts } from '../services/products';
import { requestJson } from '../lib/api';
import { buildConnectionAddress, parseConnectionAddress } from '../lib/integrationAddress';

vi.mock('../components/AppFeedback', () => ({ useFeedback: () => ({ notify: { success: vi.fn(), error: vi.fn() } }) }));
vi.mock('../services/integration', async importOriginal => {
  const original = await importOriginal<typeof import('../services/integration')>();
  return { ...original, listInstances: vi.fn(), listSyncLogs: vi.fn(), retrySync: vi.fn(), listIntegrationRecords: vi.fn(), procurementReport: vi.fn(), saveInstance: vi.fn(), dispatchProducts: vi.fn() };
});
vi.mock('../lib/api', () => ({ requestJson: vi.fn() }));
afterEach(() => { cleanup(); vi.resetAllMocks(); });
function mount(element: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}
function fixtures() {
  vi.mocked(api.listInstances).mockResolvedValue([{ id: 'hospital-one', name: '医院一', organization: 'H1', endpoint: 'http://localhost/receive', tokenEnv: 'SPD_PR_ONE_TOKEN', enabled: true }]);
  vi.mocked(api.listSyncLogs).mockResolvedValue([{ id: 'failed-order', batchId: 'batch-1', instanceId: 'hospital-one', direction: 'upload', kind: 'order', sourceCode: 'PO1', state: 'failed', message: '商品未匹配: P1', createdTime: '2026-10-08 09:00:00' }]);
}
describe('采购对接', () => {
  it('opens system settings and saves an IP and port as the SPD receiver address', async () => {
    fixtures();vi.mocked(api.saveInstance).mockResolvedValue({ id: 'hospital-one', name: '医院一', organization: 'H1', endpoint: 'http://192.168.1.10:1818/receive', tokenEnv: 'SPD_PR_ONE_TOKEN', enabled: true });
    mount(<IntegrationManagement permissions={['integration:read', 'integration:manage']} settingsOnly />);
    await screen.findByText('SPD-PR连接设置');
    await waitFor(() => expect((screen.getByRole('button', { name: '编辑配置' }) as HTMLButtonElement).disabled).toBe(false));
    expect(api.listSyncLogs).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '编辑配置' }));
    fireEvent.change(screen.getByLabelText('SPD-PR IP地址／域名'), { target: { value: '192.168.1.10' } });
    fireEvent.change(screen.getByLabelText('端口'), { target: { value: '1818' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await waitFor(() => expect(api.saveInstance).toHaveBeenCalledWith(expect.objectContaining({ endpoint: 'http://192.168.1.10:1818/receive' }), 'hospital-one'));
  });
  it('preserves existing receiver paths and supports IPv6 addresses', () => {
    const parsed = parseConnectionAddress('https://spd.example.com:8443/api/mcp/receive');
    expect(buildConnectionAddress(parsed)).toBe('https://spd.example.com:8443/api/mcp/receive');
    expect(buildConnectionAddress({ ...parsed, host: '::1', port: 1818 })).toBe('https://[::1]:1818/api/mcp/receive');
  });
  it('shows failed orders and retries their persisted sync record', async () => {
    fixtures();
    vi.mocked(api.retrySync).mockResolvedValue({ id: 'retry', batchId: 'batch-1', instanceId: 'hospital-one', direction: 'upload', kind: 'order', sourceCode: 'PO1', state: 'processed', message: '处理成功', createdTime: '' });
    mount(<IntegrationManagement permissions={['integration:read', 'integration:manage']} />);
    expect(await screen.findByText('商品未匹配: P1')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '重试' }));
    await waitFor(() => expect(api.retrySync).toHaveBeenCalledWith('failed-order', expect.anything()));
  });
  it('hides configuration and retry controls for read-only users', async () => {
    fixtures();mount(<IntegrationManagement permissions={['integration:read']} />);
    await screen.findByText('商品未匹配: P1');
    expect(screen.queryByRole('button', { name: '新增实例' })).toBeNull();
    expect(screen.queryByRole('button', { name: '重试' })).toBeNull();
  });
  it('shows an actionable empty state instead of demo integration data', async () => {
    vi.mocked(api.listInstances).mockResolvedValue([]);
    mount(<IntegrationManagement permissions={['integration:read', 'integration:manage']} />);
    expect(await screen.findByText('暂无对接实例，请先配置 SPD-PR。')).toBeTruthy();
    expect(api.listSyncLogs).not.toHaveBeenCalled();
  });
  it('disables dispatch without selected products', () => {
    mount(<SpdDispatchDialog productIds={[]} />);
    expect((screen.getByRole('button', { name: '下发 SPD-PR' }) as HTMLButtonElement).disabled).toBe(true);
  });
  it('normalizes existing array product responses without losing real IDs', async () => {
    vi.mocked(requestJson).mockResolvedValue({ data: [{ id: 123, code: 'REAL-P1', name: '真实商品' }] });
    const result = await listProducts();
    expect(result.records?.[0]?.id).toBe(123);expect(result.total).toBe(1);
  });
});
