import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import CategoryManagement from '../components/CategoryManagement';
import HospitalManagement from '../components/HospitalManagement';
import { requestJson } from '../lib/api';
import { listSuppliers } from '../services/suppliers';
import { listInventoryLedger } from '../services/inventory';
import { listRefunds } from '../services/refunds';

vi.mock('../lib/api', () => ({ requestJson: vi.fn() }));
vi.mock('../components/AppFeedback', () => ({ useFeedback: () => ({
  notify: { success: vi.fn(), error: vi.fn(), warning: vi.fn() },
  confirm: vi.fn().mockResolvedValue(true),
}) }));

afterEach(() => { cleanup(); vi.resetAllMocks(); });
function mount(element: React.ReactNode) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return render(<QueryClientProvider client={client}>{element}</QueryClientProvider>);
}

describe('分类与列表接口回归', () => {
  it('creates a category from the popup and displays the refreshed server record', async () => {
    const category = { id: 9, categoryName: 'AB实际分类', sortOrder: 2 };
    vi.mocked(requestJson).mockResolvedValueOnce({ data: [] })
      .mockResolvedValueOnce({ data: category }).mockResolvedValue({ data: [category] });
    mount(<CategoryManagement canManage />);
    await screen.findByText(/暂无分类数据/);
    fireEvent.click(screen.getByRole('button', { name: '新增' }));
    fireEvent.change(screen.getByPlaceholderText('请输入分类名称'), { target: { value: category.categoryName } });
    fireEvent.change(screen.getByPlaceholderText('请输入排序值'), { target: { value: '2' } });
    fireEvent.click(screen.getByRole('button', { name: '保存' }));
    await screen.findByText(category.categoryName);
    expect(requestJson).toHaveBeenCalledWith('/product-categories', {
      method: 'POST', body: JSON.stringify({ categoryName: category.categoryName, sortOrder: 2 }),
    });
  });

  it('disables both toolbar and row mutations for users without category management permission', async () => {
    vi.mocked(requestJson).mockResolvedValue({ data: [{ id: 9, categoryName: '只读分类', sortOrder: 0 }] });
    mount(<CategoryManagement />);
    await screen.findByText('只读分类');
    expect((screen.getByRole('button', { name: '新增' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTitle('编辑') as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByTitle('删除') as HTMLButtonElement).disabled).toBe(true);
  });

  it('shows a query failure as an error instead of claiming the classification list is empty', async () => {
    vi.mocked(requestJson).mockRejectedValue(new Error('接口异常'));
    mount(<CategoryManagement canManage />);
    expect((await screen.findByRole('alert')).textContent).toContain('接口异常');
    expect(screen.queryByText(/暂无分类数据/)).toBeNull();
  });

  it('renders an array-backed hospital list and passes numeric pagination instead of QueryFunctionContext', async () => {
    vi.mocked(requestJson).mockResolvedValue({ data: [{
      id: 1, code: 'AB-H', name: 'AB实际医院', level: '三级', city: '杭州', contact: '张三',
      phone: '13800000000', status: 'active', cooperationDate: '2026-10-09',
    }] });
    mount(<HospitalManagement />);
    await screen.findByText('AB实际医院');
    await waitFor(() => expect(requestJson).toHaveBeenCalledWith('/hospitals?current=1&size=20'));
  });

  it.each([['supplier', listSuppliers], ['inventory', listInventoryLedger], ['refund', listRefunds]] as const)
    ('adapts the %s list for both real array and paginated responses', async (_name, list) => {
      vi.mocked(requestJson).mockResolvedValueOnce({ data: [] });
      expect((await list()).records).toEqual([]);
      const page = { records: [], total: 0, current: 2, size: 10 };
      vi.mocked(requestJson).mockResolvedValueOnce({ data: page });
      expect(await list(2, 10)).toEqual(page);
    });
});
