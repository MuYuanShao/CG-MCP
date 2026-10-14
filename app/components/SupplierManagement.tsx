import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  ChevronDown,
  XCircle,
  UserCheck,
  X,
} from 'lucide-react';
import { useFeedback } from './AppFeedback';
import { listHospitals, hospitalQueryKey } from '../services/hospitals';
import {
  createSupplier,
  deleteSuppliers,
  listSuppliers,
  supplierQueryKey,
  updateSupplier,
  type SupplierPayload,
} from '../services/suppliers';
import {
  listHospitalIdsBySuppliers,
  saveHospitalsForSuppliers,
} from '../services/supplierHospitalRelations';

export default function SupplierManagement() {
  const { confirm, notify } = useFeedback();
  const queryClient = useQueryClient();
  const [selectedSuppliers, setSelectedSuppliers] = useState<number[]>([]);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [searchSupplierName, setSearchSupplierName] = useState('');
  const [showAddSupplierDialog, setShowAddSupplierDialog] = useState(false);
  const [showEditSupplierDialog, setShowEditSupplierDialog] = useState(false);
  const [showAuthorizeHospitalDialog, setShowAuthorizeHospitalDialog] = useState(false);
  const [selectedHospitalsForAuth, setSelectedHospitalsForAuth] = useState<number[]>([]);
  const [supplierFormData, setSupplierFormData] = useState({
    code: '',
    name: '',
    category: '',
    city: '',
    contact: '',
    phone: '',
    status: 'active',
  });

  const suppliersQuery = useQuery({
    queryKey: supplierQueryKey,
    queryFn: () => listSuppliers(),
  });
  const suppliers = suppliersQuery.data?.records ?? [];

  const createSupplierMutation = useMutation({
    mutationFn: createSupplier,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supplierQueryKey }),
  });
  const updateSupplierMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: SupplierPayload }) => updateSupplier(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supplierQueryKey }),
  });
  const deleteSuppliersMutation = useMutation({
    mutationFn: deleteSuppliers,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: supplierQueryKey }),
  });
  const hospitalsQuery = useQuery({
    queryKey: hospitalQueryKey,
    queryFn: () => listHospitals(),
  });
  const hospitals = hospitalsQuery.data?.records ?? [];
  const supplierHospitalRelationsQuery = useQuery({
    queryKey: ['supplier-hospital-relations'],
    queryFn: listHospitalIdsBySuppliers,
  });
  const supplierHospitalRelations = supplierHospitalRelationsQuery.data ?? {};
  const saveSupplierHospitalsMutation = useMutation({
    mutationFn: ({ supplierIds, hospitalIds }: { supplierIds: number[]; hospitalIds: number[] }) =>
      saveHospitalsForSuppliers(supplierIds, hospitalIds),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['supplier-hospital-relations'] }),
  });

  const toSupplierPayload = (): SupplierPayload => ({
    code: supplierFormData.code.trim(),
    name: supplierFormData.name.trim(),
    category: supplierFormData.category.trim(),
    city: supplierFormData.city.trim(),
    contact: supplierFormData.contact.trim(),
    phone: supplierFormData.phone.trim(),
    status: supplierFormData.status as 'active' | 'inactive',
  });

  const maskPhone = (phone: string) => {
    const trimmed = phone.trim();
    if (trimmed.length <= 4) return trimmed;
    if (trimmed.length <= 7) return `${trimmed.slice(0, 3)}****`;
    return `${trimmed.slice(0, 3)}****${trimmed.slice(-4)}`;
  };

  const validateSupplierForm = () => {
    const requiredFields = [
      { value: supplierFormData.code, message: '请输入供应商编码' },
      { value: supplierFormData.name, message: '请输入供应商名称' },
      { value: supplierFormData.category, message: '请选择供应商分类' },
      { value: supplierFormData.city, message: '请输入所在城市' },
      { value: supplierFormData.contact, message: '请输入联系人' },
      { value: supplierFormData.phone, message: '请输入联系电话' },
    ];
    const invalidField = requiredFields.find((field) => !field.value.trim());
    if (invalidField) {
      notify.warning(invalidField.message);
      return false;
    }
    const lengthRules = [
      { value: supplierFormData.code.trim(), max: 50, message: '供应商编码不能超过 50 个字符' },
      { value: supplierFormData.name.trim(), max: 200, message: '供应商名称不能超过 200 个字符' },
      { value: supplierFormData.category.trim(), max: 80, message: '供应商分类不能超过 80 个字符' },
      { value: supplierFormData.city.trim(), max: 80, message: '所在城市不能超过 80 个字符' },
      { value: supplierFormData.contact.trim(), max: 50, message: '联系人不能超过 50 个字符' },
      { value: supplierFormData.phone.trim(), max: 20, message: '联系电话不能超过 20 个字符' },
    ];
    const tooLongField = lengthRules.find((field) => field.value.length > field.max);
    if (tooLongField) {
      notify.warning(tooLongField.message);
      return false;
    }
    return true;
  };

  const handleCreateSupplier = () => {
    if (createSupplierMutation.isPending) return;
    if (!validateSupplierForm()) return;
    createSupplierMutation.mutate(toSupplierPayload(), {
      onSuccess: () => {
        notify.success('供应商信息已保存');
        setShowAddSupplierDialog(false);
      },
      onError: (error) => {
        notify.error(error instanceof Error ? error.message : '供应商信息保存失败');
      },
    });
  };

  const handleUpdateSupplier = () => {
    if (updateSupplierMutation.isPending) return;
    if (selectedSuppliers.length !== 1) {
      notify.warning('请选择一家供应商后再保存');
      return;
    }
    if (!validateSupplierForm()) return;
    updateSupplierMutation.mutate(
      { id: selectedSuppliers[0]!, payload: toSupplierPayload() },
      {
        onSuccess: () => {
          notify.success('供应商信息已更新');
          setShowEditSupplierDialog(false);
        },
        onError: (error) => {
          notify.error(error instanceof Error ? error.message : '供应商信息更新失败');
        },
      },
    );
  };

  const filteredSuppliers = searchSupplierName
    ? suppliers.filter((s) => s.name.includes(searchSupplierName))
    : suppliers;

  const getAuthorizedHospitalNames = (supplierId: number) => {
    const hospitalIds = supplierHospitalRelations[String(supplierId)] ?? [];
    return hospitals
      .filter((hospital) => hospitalIds.includes(hospital.id))
      .map((hospital) => hospital.name);
  };

  const handleSelectAll = () => {
    if (selectedSuppliers.length === filteredSuppliers.length) {
      setSelectedSuppliers([]);
    } else {
      setSelectedSuppliers(filteredSuppliers.map((s) => s.id));
    }
  };

  const handleSelectRow = (id: number) => {
    if (selectedSuppliers.includes(id)) {
      setSelectedSuppliers(selectedSuppliers.filter((supplierId) => supplierId !== id));
    } else {
      setSelectedSuppliers([...selectedSuppliers, id]);
    }
  };

  const handleSearch = () => {
    setShowSearchDialog(true);
  };

  const handleAdd = () => {
    setSupplierFormData({
      code: '',
      name: '',
      category: '',
      city: '',
      contact: '',
      phone: '',
      status: 'active',
    });
    setShowAddSupplierDialog(true);
  };

  const handleEdit = () => {
    if (selectedSuppliers.length === 1) {
      const supplier = suppliers.find((s) => s.id === selectedSuppliers[0]);
      if (supplier) {
        setSupplierFormData({
          code: supplier.code,
          name: supplier.name,
          category: supplier.category,
          city: supplier.city,
          contact: supplier.contact,
          phone: supplier.phone,
          status: supplier.status,
        });
        setShowEditSupplierDialog(true);
      }
    }
  };

  const handleDelete = async () => {
    if (selectedSuppliers.length > 0) {
      const confirmed = await confirm({
        title: '删除供应商信息',
        description: `确定要删除选中 ${selectedSuppliers.length} 条供应商信息吗？`,
        confirmText: '删除',
        destructive: true,
      });
      if (confirmed) {
        deleteSuppliersMutation.mutate(selectedSuppliers, {
          onSuccess: () => {
            setSelectedSuppliers([]);
            notify.success('供应商信息已删除');
          },
          onError: (error) => {
            notify.error(error instanceof Error ? error.message : '供应商信息删除失败');
          },
        });
      }
    }
  };

  const handleExport = () => {
    const dataToExport = selectedSuppliers.length > 0
      ? suppliers.filter((s) => selectedSuppliers.includes(s.id))
      : suppliers;
    notify.success(`已导出 ${dataToExport.length} 条供应商信息`);
  };

  const handleAuthorizeHospital = () => {
    if (selectedSuppliers.length === 0) {
      notify.warning('请至少选择一家供应商进行授权');
      return;
    }
    if (selectedSuppliers.length === 1) {
      setSelectedHospitalsForAuth(supplierHospitalRelations[String(selectedSuppliers[0])] ?? []);
    } else {
      setSelectedHospitalsForAuth([]);
    }
    setShowAuthorizeHospitalDialog(true);
  };

  const handleHospitalSelectAll = () => {
    if (selectedHospitalsForAuth.length === hospitals.length) {
      setSelectedHospitalsForAuth([]);
    } else {
      setSelectedHospitalsForAuth(hospitals.map((h) => h.id));
    }
  };

  const handleHospitalSelectRow = (id: number) => {
    if (selectedHospitalsForAuth.includes(id)) {
      setSelectedHospitalsForAuth(selectedHospitalsForAuth.filter((hid) => hid !== id));
    } else {
      setSelectedHospitalsForAuth([...selectedHospitalsForAuth, id]);
    }
  };

  const handleConfirmAuthorizeHospital = () => {
    if (selectedHospitalsForAuth.length === 0) {
      notify.warning('请至少选择一家医院');
      return;
    }
    const selectedHospitals = hospitals.filter((h) => selectedHospitalsForAuth.includes(h.id));
    const hospitalNames = selectedHospitals.map((h) => h.name).join(', ');
    saveSupplierHospitalsMutation.mutate(
      { supplierIds: selectedSuppliers, hospitalIds: selectedHospitalsForAuth },
      {
        onSuccess: () => {
          notify.success(`已为 ${selectedSuppliers.length} 家供应商授权 ${selectedHospitalsForAuth.length} 家医院: ${hospitalNames}`);
          setShowAuthorizeHospitalDialog(false);
        },
        onError: (error) => {
          notify.error(error instanceof Error ? error.message : '授权医院保存失败');
        },
      },
    );
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-[#10b981] bg-[#10b981]/10';
      case 'inactive':
        return 'text-muted-foreground bg-muted';
      default:
        return 'text-foreground bg-muted';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '正常';
      case 'inactive':
        return '停用';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="p-4 border border-border rounded-lg bg-background">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleSearch}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 text-sm"
          >
            <Search className="size-4" />
            查询
          </button>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 text-sm"
          >
            <Plus className="size-4" />
            新增
          </button>
          <button
            onClick={handleEdit}
            disabled={selectedSuppliers.length !== 1}
            className={`px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 text-sm ${
              selectedSuppliers.length !== 1 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Edit className="size-4" />
            编辑
          </button>
          <button
            onClick={handleDelete}
            disabled={selectedSuppliers.length === 0}
            className={`px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 text-sm ${
              selectedSuppliers.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <Trash2 className="size-4" />
            删除
          </button>
          <button
            onClick={handleExport}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 text-sm"
          >
            <Download className="size-4" />
            导出
          </button>
          <div className="relative">
            <button
              onClick={() => setShowImportMenu(!showImportMenu)}
              className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 text-sm"
            >
              <Upload className="size-4" />
              导入
              <ChevronDown className="size-3" />
            </button>
            {showImportMenu && (
              <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-lg shadow-lg min-w-[180px] z-10">
                <button
                  onClick={() => {
                    console.log('下载导入模板');
                    notify.success('下载导入模板');
                    setShowImportMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors"
                >
                  下载导入模板
                </button>
                <button
                  onClick={() => {
                    console.log('上传导入信息');
                    notify.success('上传导入信息');
                    setShowImportMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors border-t border-border"
                >
                  上传导入信息
                </button>
              </div>
            )}
          </div>
          <button
            onClick={handleAuthorizeHospital}
            disabled={selectedSuppliers.length === 0}
            className={`px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 text-sm ${
              selectedSuppliers.length === 0 ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <UserCheck className="size-4" />
            授权医院
          </button>
        </div>
      </div>

      {/* Data Table */}
      <div className="border border-border rounded-lg bg-background overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedSuppliers.length === filteredSuppliers.length && filteredSuppliers.length > 0}
                    onChange={handleSelectAll}
                    className="size-4 rounded border-border"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">供应商编码</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">供应商名称</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">供应商分类</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">所在城市</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">联系人</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">联系电话</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">合作日期</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">已授权医院</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredSuppliers.map((supplier) => (
                <tr key={supplier.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedSuppliers.includes(supplier.id)}
                      onChange={() => handleSelectRow(supplier.id)}
                      className="size-4 rounded border-border"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm">{supplier.code}</td>
                  <td className="px-4 py-3 font-medium">{supplier.name}</td>
                  <td className="px-4 py-3 text-sm">{supplier.category}</td>
                  <td className="px-4 py-3 text-sm">{supplier.city}</td>
                  <td className="px-4 py-3 text-sm">{supplier.contact}</td>
                  <td className="px-4 py-3 text-sm">{maskPhone(supplier.phone)}</td>
                  <td className="px-4 py-3 text-sm">{supplier.cooperationDate}</td>
                  <td className="px-4 py-3 text-sm">
                    {getAuthorizedHospitalNames(supplier.id).length > 0 ? (
                      <div className="flex max-w-xs flex-wrap gap-1">
                        {getAuthorizedHospitalNames(supplier.id).map((name) => (
                          <span key={name} className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                            {name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-muted-foreground">未授权</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <div className={`px-3 py-1 rounded-full text-xs ${getStatusColor(supplier.status)}`}>
                        {getStatusText(supplier.status)}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredSuppliers.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {suppliersQuery.isFetching ? '正在加载供应商数据...' : '暂无供应商数据'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <div className="text-sm text-muted-foreground">每页25条 · 共{filteredSuppliers.length}条</div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">
              首页
            </button>
            <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">
              上一页
            </button>
            <button className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">
              1
            </button>
            <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">
              2
            </button>
            <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">
              下一页
            </button>
            <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">
              末页
            </button>
          </div>
        </div>
      </div>

      {/* Search Dialog */}
      {showSearchDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">供应商查询</h3>
              <button
                onClick={() => setShowSearchDialog(false)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <XCircle className="size-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm mb-2">供应商名称</label>
                <input
                  type="text"
                  placeholder="请输入供应商名称"
                  value={searchSupplierName}
                  onChange={(e) => setSearchSupplierName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => {
                  setSearchSupplierName('');
                  setShowSearchDialog(false);
                }}
                className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                重置
              </button>
              <button
                onClick={() => setShowSearchDialog(false)}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                查询
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Supplier Dialog */}
      {showAddSupplierDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
              <h3 className="font-semibold">新增供应商</h3>
              <button
                onClick={() => setShowAddSupplierDialog(false)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <XCircle className="size-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">
                    供应商编码 <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="请输入供应商编号"
                    value={supplierFormData.code}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">
                    供应商名称 <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="请输入供应商名称"
                    value={supplierFormData.name}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">
                    供应商分类 <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={supplierFormData.category}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">请选择供应商分类</option>
                    <option value="医疗器械">医疗器械</option>
                    <option value="医疗耗材">医疗耗材</option>
                    <option value="医疗设备">医疗设备</option>
                    <option value="医药">医药</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2">
                    所在城市 <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="请输入所在城市"
                    value={supplierFormData.city}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">
                    联系人 <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="请输入联系人"
                    value={supplierFormData.contact}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, contact: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">
                    联系电话 <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="请输入联系电话"
                    value={supplierFormData.phone}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAddSupplierDialog(false)}
                className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleCreateSupplier}
                disabled={createSupplierMutation.isPending}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {createSupplierMutation.isPending ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Supplier Dialog */}
      {showEditSupplierDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
              <h3 className="font-semibold">编辑供应商</h3>
              <button
                onClick={() => setShowEditSupplierDialog(false)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <XCircle className="size-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2">
                    供应商编码 <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="请输入供应商编号"
                    value={supplierFormData.code}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">
                    供应商名称 <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="请输入供应商名称"
                    value={supplierFormData.name}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">
                    供应商分类 <span className="text-destructive">*</span>
                  </label>
                  <select
                    value={supplierFormData.category}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, category: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="">请选择供应商分类</option>
                    <option value="医疗器械">医疗器械</option>
                    <option value="医疗耗材">医疗耗材</option>
                    <option value="医疗设备">医疗设备</option>
                    <option value="医药">医药</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2">
                    所在城市 <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="请输入所在城市"
                    value={supplierFormData.city}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">
                    联系人 <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="请输入联系人"
                    value={supplierFormData.contact}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, contact: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">
                    联系电话 <span className="text-destructive">*</span>
                  </label>
                  <input
                    type="text"
                    placeholder="请输入联系电话"
                    value={supplierFormData.phone}
                    onChange={(e) => setSupplierFormData({ ...supplierFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setShowEditSupplierDialog(false)}
                className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleUpdateSupplier}
                disabled={updateSupplierMutation.isPending}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {updateSupplierMutation.isPending ? '保存中...' : '保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Authorize Hospital Dialog */}
      {showAuthorizeHospitalDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-medium">授权医院</h2>
              <button
                onClick={() => setShowAuthorizeHospitalDialog(false)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Supplier Info */}
              <div className="border border-border rounded-lg p-4 bg-muted/30">
                <div className="space-y-2 text-sm">
                  <div>
                    <span className="text-muted-foreground">已选供应商：</span>
                    <span className="font-medium">{selectedSuppliers.length} 家</span>
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {suppliers
                      .filter((supplier) => selectedSuppliers.includes(supplier.id))
                      .map((supplier) => (
                        <span key={supplier.id} className="rounded-full bg-primary/10 px-2 py-1 text-xs text-primary">
                          {supplier.name}
                        </span>
                      ))}
                  </div>
                </div>
              </div>

              {/* Hospital List */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="px-4 py-3 bg-muted/30 border-b border-border">
                  <h3 className="font-medium">可选医院列表（支持多选）</h3>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedHospitalsForAuth.length === hospitals.length && hospitals.length > 0}
                            onChange={handleHospitalSelectAll}
                            className="size-4 rounded border-border"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          医院编号
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          医院名称
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          医院等级
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          所在城市
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {hospitals.map((hospital) => (
                        <tr key={hospital.id} className="hover:bg-accent/50 transition-colors">
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedHospitalsForAuth.includes(hospital.id)}
                              onChange={() => handleHospitalSelectRow(hospital.id)}
                              className="size-4 rounded border-border"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm font-mono">{hospital.code}</td>
                          <td className="px-4 py-3 font-medium">{hospital.name}</td>
                          <td className="px-4 py-3 text-sm">{hospital.level}</td>
                          <td className="px-4 py-3 text-sm">{hospital.city}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Selected Summary */}
              <div className="border border-border rounded-lg p-4 bg-primary/5">
                <div className="text-sm">
                  <span className="text-muted-foreground">已选择 </span>
                  <span className="font-medium text-primary">{selectedHospitalsForAuth.length}</span>
                  <span className="text-muted-foreground"> 家医院</span>
                  <span className="text-muted-foreground">，将授权给</span>
                  <span className="font-medium text-primary">{selectedSuppliers.length}</span>
                  <span className="text-muted-foreground"> 家供应商</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAuthorizeHospitalDialog(false)}
                className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmAuthorizeHospital}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                确认授权
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
