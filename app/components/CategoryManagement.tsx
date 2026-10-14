import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Search, XCircle } from 'lucide-react';
import { useFeedback } from './AppFeedback';
import {
  listCategories,
  createCategory,
  updateCategory,
  deleteCategories,
  categoryQueryKey,
  type CategoryPayload,
} from '../services/categories';

export default function CategoryManagement({ canManage = false }: { canManage?: boolean }) {
  const { confirm, notify } = useFeedback();
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchName, setSearchName] = useState('');
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [formData, setFormData] = useState({
    categoryName: '',
    sortOrder: 0,
  });

  const categoriesQuery = useQuery({
    queryKey: categoryQueryKey,
    queryFn: listCategories,
  });
  const categories = categoriesQuery.data ?? [];

  const createMutation = useMutation({
    mutationFn: createCategory,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryQueryKey }),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: CategoryPayload }) => updateCategory(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: categoryQueryKey });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      queryClient.invalidateQueries({ queryKey: ['license-products'] });
    },
  });
  const deleteMutation = useMutation({
    mutationFn: deleteCategories,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: categoryQueryKey }),
  });

  const validateForm = () => {
    const name = formData.categoryName.trim();
    if (!name) {
      notify.warning('请输入分类名称');
      return false;
    }
    if (name.length > 80) {
      notify.warning('分类名称不能超过 80 个字符');
      return false;
    }
    if (!Number.isInteger(formData.sortOrder) || formData.sortOrder < 0) {
      notify.warning('排序必须为非负整数');
      return false;
    }
    return true;
  };

  const handleCreate = () => {
    if (createMutation.isPending) return;
    if (!validateForm()) return;
    createMutation.mutate(
      { categoryName: formData.categoryName.trim(), sortOrder: formData.sortOrder },
      {
        onSuccess: () => {
          notify.success('分类已添加');
          setShowAddDialog(false);
        },
        onError: (error) => {
          notify.error(error instanceof Error ? error.message : '分类添加失败');
        },
      },
    );
  };

  const handleUpdate = () => {
    if (updateMutation.isPending || selectedIds.length !== 1) return;
    const id = selectedIds[0];
    if (id === undefined) return;
    if (!validateForm()) return;
    updateMutation.mutate(
      { id, payload: { categoryName: formData.categoryName.trim(), sortOrder: formData.sortOrder } },
      {
        onSuccess: () => {
          notify.success('分类已更新');
          setShowEditDialog(false);
        },
        onError: (error) => {
          notify.error(error instanceof Error ? error.message : '分类更新失败');
        },
      },
    );
  };

  const handleDelete = async () => {
    if (selectedIds.length === 0) return;
    const confirmed = await confirm({
      title: '删除分类',
      description: `确定要删除选中的 ${selectedIds.length} 条分类吗？`,
      confirmText: '删除',
      destructive: true,
    });
    if (confirmed) {
      deleteMutation.mutate(selectedIds, {
        onSuccess: () => {
          setSelectedIds([]);
          notify.success('分类已删除');
        },
        onError: (error) => {
          notify.error(error instanceof Error ? error.message : '分类删除失败');
        },
      });
    }
  };

  const openEditDialog = () => {
    if (selectedIds.length !== 1) {
      notify.warning('请选择一条分类进行编辑');
      return;
    }
    const category = categories.find((c) => c.id === selectedIds[0]);
    if (category) {
      setFormData({
        categoryName: category.categoryName,
        sortOrder: category.sortOrder,
      });
      setShowEditDialog(true);
    }
  };

  const filteredCategories = searchName
    ? categories.filter((c) => c.categoryName.includes(searchName))
    : categories;

  const handleSelectAll = () => {
    if (selectedIds.length === filteredCategories.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredCategories.map((c) => c.id));
    }
  };

  const handleSelectRow = (id: number) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter((i) => i !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  return (
    <div className="space-y-4">
      {categoriesQuery.isError && <p role="alert" className="text-destructive">分类加载失败：{categoriesQuery.error.message}<button onClick={() => categoriesQuery.refetch()}>重试</button></p>}
      {/* Toolbar */}
      <div className="p-4 border border-border rounded-lg bg-background">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex items-center gap-2 border border-border rounded-lg px-3 py-2 bg-input-background">
            <Search className="size-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="搜索分类名称"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
              className="bg-transparent border-none outline-none text-sm w-48"
            />
          </div>
          <button
            disabled={!canManage}
            onClick={() => {
              setFormData({ categoryName: '', sortOrder: 0 });
              setShowAddDialog(true);
            }}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 text-sm"
          >
            <Plus className="size-4" />
            新增
          </button>
          <button
            onClick={openEditDialog}
            disabled={!canManage || selectedIds.length !== 1}
            className={`px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 text-sm ${
              selectedIds.length !== 1 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Edit className="size-4" />
            编辑
          </button>
          <button
            onClick={handleDelete}
            disabled={!canManage || selectedIds.length === 0}
            className={`px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 text-sm ${
              selectedIds.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Trash2 className="size-4" />
            删除
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="border border-border rounded-lg bg-background overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredCategories.length && filteredCategories.length > 0}
                    onChange={handleSelectAll}
                    className="size-4 rounded border-border"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">序号</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">分类名称</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">排序</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">操作</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredCategories.map((category, index) => (
                <tr key={category.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(category.id)}
                      onChange={() => handleSelectRow(category.id)}
                      className="size-4 rounded border-border"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{index + 1}</td>
                  <td className="px-4 py-3 font-medium">{category.categoryName}</td>
                  <td className="px-4 py-3 text-sm">{category.sortOrder}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center gap-2">
                      <button
                        disabled={!canManage}
                        onClick={() => {
                          setFormData({
                            categoryName: category.categoryName,
                            sortOrder: category.sortOrder,
                          });
                          setSelectedIds([category.id]);
                          setShowEditDialog(true);
                        }}
                        className="p-1.5 text-primary hover:bg-primary/10 rounded transition-colors"
                        title="编辑"
                      >
                        <Edit className="size-4" />
                      </button>
                      <button
                        disabled={!canManage}
                        onClick={async () => {
                          const confirmed = await confirm({
                            title: '删除分类',
                            description: `确定要删除分类"${category.categoryName}"吗？`,
                            confirmText: '删除',
                            destructive: true,
                          });
                          if (confirmed) {
                            deleteMutation.mutate([category.id], {
                              onSuccess: () => notify.success('分类已删除'),
                              onError: (error) => notify.error(error instanceof Error ? error.message : '分类删除失败'),
                            });
                          }
                        }}
                        className="p-1.5 text-destructive hover:bg-destructive/10 rounded transition-colors"
                        title="删除"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredCategories.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {categoriesQuery.isFetching ? '正在加载分类数据...' : categoriesQuery.isError ? '分类加载失败，请重试' : '暂无分类数据，请点击"新增"添加'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">新增分类</h3>
              <button
                onClick={() => setShowAddDialog(false)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <XCircle className="size-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm mb-2">
                  分类名称 <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="请输入分类名称"
                  value={formData.categoryName}
                  onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">排序</label>
                <input
                  type="number"
                  placeholder="请输入排序值"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAddDialog(false)}
                className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                disabled={createMutation.isPending}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createMutation.isPending ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dialog */}
      {showEditDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">编辑分类</h3>
              <button
                onClick={() => setShowEditDialog(false)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <XCircle className="size-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm mb-2">
                  分类名称 <span className="text-destructive">*</span>
                </label>
                <input
                  type="text"
                  placeholder="请输入分类名称"
                  value={formData.categoryName}
                  onChange={(e) => setFormData({ ...formData, categoryName: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
              <div>
                <label className="block text-sm mb-2">排序</label>
                <input
                  type="number"
                  placeholder="请输入排序值"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData({ ...formData, sortOrder: parseInt(e.target.value) || 0 })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEditDialog(false)}
                className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleUpdate}
                disabled={updateMutation.isPending}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateMutation.isPending ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
