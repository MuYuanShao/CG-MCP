import { type ChangeEvent, type DragEvent, useRef, useState } from 'react';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  X,
  FileUp,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronDown,
  Eye,
} from 'lucide-react';
import { useFeedback } from './AppFeedback';
import { useQuery } from '@tanstack/react-query';
import { listProducts } from '../services/products';
import {
  createLicense,
  deleteLicenses,
  searchLicenses,
  updateLicense,
  uploadLicenseImage,
  type LicenseItem,
  type LicenseSavePayload,
} from '../services/licenses';

type License = LicenseItem;

const licenseTypes = [
  '合同',
  '注册证',
  '生产许可证',
  '临采申请单',
  '紧急采购单',
  '议价单',
  '经营许可证',
  '营业执照',
  '厂家授权书',
  '法人代表人授权书',
  '法定代表人身份证',
  '被授权人身份证',
];

interface Product {
  id: number;
  code: string;
  name: string;
  spec: string;
  manufacturer: string;
  category: string;
}

export default function LicenseManagement() {
  const { confirm, notify } = useFeedback();
  const productsQuery = useQuery({
    queryKey: ['license-products'],
    queryFn: async () => {
      const products: Product[] = [];
      for (let current = 1; ; current++) {
        const page = await listProducts(current, 100);
        products.push(...page.records);
        if (!page.records.length || products.length >= page.total) return products;
      }
    },
  });
  const products = productsQuery.data ?? [];
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [licenseSearching, setLicenseSearching] = useState(false);
  const [licenseUploading, setLicenseUploading] = useState(false);
  const [licenseSaving, setLicenseSaving] = useState(false);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showProductDialog, setShowProductDialog] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<number[]>([]);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [previewLicense, setPreviewLicense] = useState<License | null>(null);
  const [searchForm, setSearchForm] = useState({
    licenseType: '',
    productName: '',
    manufacturer: '',
    registrationNo: '',
    contractCode: '',
    licenseCode: '',
  });

  const [editingLicenseId, setEditingLicenseId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    hospitalName: '',
    licenseType: '',
    licenseCode: '',
    relatedProducts: [] as Product[],
    startDate: '',
    endDate: '',
    fileUrl: '',
    remark: '',
  });

  const handleOpenDialog = (mode: 'add' | 'edit') => {
    if (mode === 'edit' && (productsQuery.isPending || productsQuery.isError)) {
      notify.warning('商品目录尚未加载成功，请稍后重试');
      return;
    }
    setDialogMode(mode);
    if (mode === 'add') {
      setFormData({
        hospitalName: '',
        licenseType: '',
        licenseCode: '',
        relatedProducts: [],
        startDate: '',
        endDate: '',
        fileUrl: '',
        remark: '',
      });
      setSelectedProducts([]);
      setEditingLicenseId(null);
    } else if (mode === 'edit' && selectedRows.length === 1) {
      const license = licenses.find((l) => l.id === selectedRows[0]);
      if (license) {
        // 根据关联商品名称找到对应的Product对象
        const relatedProductNames = license.relatedProduct.split(', ').filter((name) => name !== '-');
        const relatedProducts = products.filter((p) => relatedProductNames.includes(p.name));
        if (relatedProductNames.some((name) => !products.some((p) => p.name === name))) {
          notify.warning('关联商品不在当前目录中，请先核对商品资料');
          return;
        }

        setFormData({
          hospitalName: license.hospitalName,
          licenseType: license.licenseType,
          licenseCode: license.licenseCode,
          relatedProducts: relatedProducts,
          startDate: license.issueDate ?? '',
          endDate: license.expiryDate ?? '',
          fileUrl: license.fileUrl || '',
          remark: license.remark || '',
        });
        setSelectedProducts(relatedProducts.map((p) => p.id));
        setEditingLicenseId(license.id);
      }
    }
    setShowDialog(true);
  };

  const handleOpenProductDialog = () => {
    setProductSearchQuery('');
    setSelectedProducts(formData.relatedProducts.map((p) => p.id));
    setShowProductDialog(true);
  };

  const handleProductSelectAll = () => {
    const filteredProducts = products.filter((p) =>
      p.name.includes(productSearchQuery) ||
      p.code.includes(productSearchQuery) ||
      p.manufacturer.includes(productSearchQuery)
    );
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map((p) => p.id));
    }
  };

  const handleProductSelectRow = (id: number) => {
    if (selectedProducts.includes(id)) {
      setSelectedProducts(selectedProducts.filter((productId) => productId !== id));
    } else {
      setSelectedProducts([...selectedProducts, id]);
    }
  };

  const handleConfirmProducts = () => {
    const selectedProductList = products.filter((p) => selectedProducts.includes(p.id));
    setFormData({ ...formData, relatedProducts: selectedProductList });
    setShowProductDialog(false);
  };

  const handleRemoveProduct = (productId: number) => {
    setFormData({
      ...formData,
      relatedProducts: formData.relatedProducts.filter((p) => p.id !== productId),
    });
  };

  const handleUploadLicenseImage = async (file?: File) => {
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    if (!allowedTypes.includes(file.type)) {
      notify.warning('请上传 JPG、PNG、WEBP、GIF 图片或 PDF 文件');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      notify.warning('图片大小不能超过 10 MB');
      return;
    }

    setLicenseUploading(true);
    try {
      const uploaded = await uploadLicenseImage(file);
      setFormData((current) => ({ ...current, fileUrl: uploaded.fileUrl }));
      notify.success('证照文件上传成功');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '证照文件上传失败');
    } finally {
      setLicenseUploading(false);
    }
  };

  const handleLicenseImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    void handleUploadLicenseImage(file);
    event.target.value = '';
  };

  const handleLicenseImageDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    void handleUploadLicenseImage(event.dataTransfer.files?.[0]);
  };

  const isPdfFile = (fileUrl: string | undefined | null) => fileUrl?.toLowerCase().split('?')[0]?.endsWith('.pdf') ?? false;

  const calculateExpiryStatus = (expiryDate: string): 'normal' | 'warning' | 'urgent' | 'critical' | 'expired' => {
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysRemaining = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (daysRemaining < 0) return 'expired';
    if (daysRemaining <= 30) return 'critical';
    if (daysRemaining <= 60) return 'urgent';
    if (daysRemaining <= 90) return 'warning';
    return 'normal';
  };

  const buildLicensePayload = (): LicenseSavePayload => {
    const relatedProduct = formData.relatedProducts.length > 0
      ? formData.relatedProducts.map((p) => p.name).join(', ')
      : '-';

    return {
      licenseCode: formData.licenseCode,
      licenseName: `${formData.hospitalName}-${formData.licenseType}`,
      licenseType: formData.licenseType,
      relatedProduct,
      productId: formData.relatedProducts.length === 1 ? formData.relatedProducts[0]?.id : undefined,
      hospitalName: formData.hospitalName,
      issueDate: formData.startDate,
      expiryDate: formData.endDate,
      fileUrl: formData.fileUrl,
      remark: formData.remark,
    };
  };

  const handleSaveLicense = async () => {
    if (!formData.hospitalName || !formData.licenseType || !formData.startDate || !formData.endDate) {
      notify.warning('请填写必填项');
      return;
    }

    setLicenseSaving(true);
    try {
      const payload = buildLicensePayload();
      if (dialogMode === 'edit' && editingLicenseId !== null) {
        if (editingLicenseId <= 0) {
          const newLicense = await createLicense(payload);
          setLicenses([newLicense, ...licenses.filter((license) => license.id !== editingLicenseId)]);
          setSelectedRows([newLicense.id]);
          notify.success('已保存为可维护的证照记录，附件已写入后端');
        } else {
          const updatedLicense = await updateLicense(editingLicenseId, payload);
          setLicenses(licenses.map((license) => (license.id === editingLicenseId ? updatedLicense : license)));
          notify.success('证照更新成功');
        }
      } else {
        const newLicense = await createLicense(payload);
        setLicenses([newLicense, ...licenses]);
        setHasSearched(true);
        notify.success('证照保存成功');
      }
      setShowDialog(false);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '证照保存失败');
    } finally {
      setLicenseSaving(false);
    }
  };

  const handleSearchLicenses = async () => {
    setLicenseSearching(true);
    try {
      const data = await searchLicenses(searchForm);
      setLicenses(data);
      setSelectedRows([]);
      setHasSearched(true);
      notify.success(`查询完成，共 ${data.length} 条证照信息`);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '证照查询失败');
    } finally {
      setLicenseSearching(false);
    }
  };

  const handleResetSearch = () => {
    setSearchForm({
      licenseType: '',
      productName: '',
      manufacturer: '',
      registrationNo: '',
      contractCode: '',
      licenseCode: '',
    });
    setLicenses([]);
    setSelectedRows([]);
    setHasSearched(false);
  };

  const handleDeleteLicenses = async () => {
    if (selectedRows.length === 0) {
      notify.warning('请选择要删除的证照');
      return;
    }

    const confirmed = await confirm({
      title: '删除证照信息',
      description: `确定要删除选中 ${selectedRows.length} 条证照信息吗？`,
      confirmText: '删除',
      destructive: true,
    });
    if (confirmed) {
      const storedIds = selectedRows.filter((id) => id > 0);
      try {
        if (storedIds.length > 0) {
          await deleteLicenses(storedIds);
        }
        const updatedLicenses = licenses.filter((license) => !selectedRows.includes(license.id));
        setLicenses(updatedLicenses);
        setSelectedRows([]);
        notify.success('删除成功');
      } catch (error) {
        notify.error(error instanceof Error ? error.message : '删除失败');
      }
    }
  };

  const handleSelectAll = () => {
    if (selectedRows.length === licenses.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(licenses.map((l) => l.id));
    }
  };

  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((rowId) => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const getExpiryStatusColor = (status: string) => {
    switch (status) {
      case 'normal':
        return 'text-[#10b981] bg-[#10b981]/10';
      case 'warning':
        return 'text-[#f59e0b] bg-[#f59e0b]/10';
      case 'urgent':
        return 'text-[#f97316] bg-[#f97316]/10';
      case 'critical':
        return 'text-destructive bg-destructive/10';
      case 'expired':
        return 'text-muted-foreground bg-muted';
      default:
        return 'text-foreground bg-muted';
    }
  };

  const getExpiryStatusText = (status: string) => {
    switch (status) {
      case 'normal':
        return '正常';
      case 'warning':
        return '预警(90天)';
      case 'urgent':
        return '临近(30天)';
      case 'critical':
        return '紧急(7天)';
      case 'expired':
        return '已过期';
      default:
        return status;
    }
  };

  const getExpiryStatusIcon = (status: string) => {
    switch (status) {
      case 'normal':
        return <CheckCircle2 className="size-3" />;
      case 'warning':
        return <Clock className="size-3" />;
      case 'urgent':
        return <AlertTriangle className="size-3" />;
      case 'critical':
        return <AlertTriangle className="size-3" />;
      case 'expired':
        return <XCircle className="size-3" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-[#10b981] bg-[#10b981]/10';
      case 'pending':
        return 'text-[#3b82f6] bg-[#3b82f6]/10';
      case 'rejected':
        return 'text-destructive bg-destructive/10';
      case 'expired':
        return 'text-muted-foreground bg-muted';
      default:
        return 'text-foreground bg-muted';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '生效';
      case 'pending':
        return '待审核';
      case 'rejected':
        return '驳回';
      case 'expired':
        return '过期';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-4">
      {/* Search Form */}
      <div className="p-5 border border-border rounded-lg bg-background">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm mb-2">证照分类</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={searchForm.licenseType}
              onChange={(e) => setSearchForm({ ...searchForm, licenseType: e.target.value })}
            >
              <option value="">全部</option>
              {licenseTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm mb-2">商品名称</label>
            <input
              type="text"
              placeholder="请输入商品名称"
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={searchForm.productName}
              onChange={(e) => setSearchForm({ ...searchForm, productName: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm mb-2">厂家</label>
            <input
              type="text"
              placeholder="请输入厂家"
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={searchForm.manufacturer}
              onChange={(e) => setSearchForm({ ...searchForm, manufacturer: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm mb-2">注册证</label>
            <input
              type="text"
              placeholder="请输入注册证"
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={searchForm.registrationNo}
              onChange={(e) => setSearchForm({ ...searchForm, registrationNo: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm mb-2">合同编码</label>
            <input
              type="text"
              placeholder="请输入合同编码"
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={searchForm.contractCode}
              onChange={(e) => setSearchForm({ ...searchForm, contractCode: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm mb-2">证照编码</label>
            <input
              type="text"
              placeholder="请输入证照编码"
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={searchForm.licenseCode}
              onChange={(e) => setSearchForm({ ...searchForm, licenseCode: e.target.value })}
            />
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleSearchLicenses}
            disabled={licenseSearching}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Search className="size-4" />
            {licenseSearching ? '查询中...' : '查询'}
          </button>
          <button
            onClick={handleResetSearch}
            className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
          >
            重置
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="p-4 border border-border rounded-lg bg-background">
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => handleOpenDialog('add')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Plus className="size-4" />
            新增
          </button>
          <button
            onClick={() => handleOpenDialog('edit')}
            disabled={selectedRows.length !== 1}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Edit className="size-4" />
            修改
          </button>
          <button
            onClick={handleDeleteLicenses}
            disabled={selectedRows.length === 0}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="size-4" />
            删除
          </button>
          <button
            disabled={selectedRows.length === 0}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="size-4" />
            批量调整
          </button>
          <div className="relative">
            <button
              onClick={() => setShowImportMenu(!showImportMenu)}
              className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2"
            >
              <Upload className="size-4" />
              导入
              <ChevronDown className="size-3" />
            </button>
            {showImportMenu && (
              <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-lg shadow-lg min-w-[180px] z-10">
                <button
                  onClick={() => {
                    console.log('下载证照模板');
                    notify.success('下载证照模板');
                    setShowImportMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors"
                >
                  上传证照模板下载
                </button>
                <button
                  onClick={() => {
                    console.log('导入模板');
                    notify.success('导入模板');
                    setShowImportMenu(false);
                  }}
                  className="w-full px-4 py-2 text-left text-sm hover:bg-accent transition-colors border-t border-border"
                >
                  导入模板
                </button>
              </div>
            )}
          </div>
          <button className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2">
            <Download className="size-4" />
            导出
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
                    checked={selectedRows.length === licenses.length && licenses.length > 0}
                    onChange={handleSelectAll}
                    className="size-4 rounded border-border"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  证照编码
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  证照名称
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  证照分类
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  医院名称
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  到期日期
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  效期状态
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  状态
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  明细
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {licenses.map((license) => (
                <tr key={license.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(license.id)}
                      onChange={() => handleSelectRow(license.id)}
                      className="size-4 rounded border-border"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">{license.licenseCode}</td>
                  <td className="px-4 py-3 font-medium">{license.licenseName}</td>
                  <td className="px-4 py-3 text-sm">{license.licenseType}</td>
                  <td className="px-4 py-3 text-sm">{license.hospitalName}</td>
                  <td className="px-4 py-3 text-sm">{license.expiryDate}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <span
                        className={`px-2 py-1 rounded-full text-xs inline-flex items-center gap-1.5 ${getExpiryStatusColor(
                          license.expiryStatus
                        )}`}
                      >
                        {getExpiryStatusIcon(license.expiryStatus)}
                        {getExpiryStatusText(license.expiryStatus)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(license.status)}`}>
                        {getStatusText(license.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      {license.fileUrl ? (
                        <button
                          type="button"
                          onClick={() => setPreviewLicense(license)}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm border border-border rounded-lg hover:bg-accent transition-colors"
                        >
                          <Eye className="size-4" />
                          预览
                        </button>
                      ) : (
                        <span className="text-sm text-muted-foreground">无文件</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {licenses.length === 0 && (
                <tr>
                  <td className="px-4 py-10 text-center text-sm text-muted-foreground" colSpan={9}>
                    {hasSearched ? '未查询到符合条件的证照信息' : '默认不展示证照信息，请输入查询条件后点击查询'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <div className="text-sm text-muted-foreground">每页25条 · 共{licenses.length}条</div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">
              首页
            </button>
            <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">
              上一页
            </button>
            <button className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">1</button>
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

      {/* License Preview Dialog */}
      {previewLicense?.fileUrl && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-5xl w-full max-h-[92vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-xl font-medium">证照明细预览</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  {previewLicense.licenseName || previewLicense.licenseCode}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewLicense.fileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors text-sm"
                >
                  新窗口打开
                </a>
                <button
                  onClick={() => setPreviewLicense(null)}
                  className="p-1 hover:bg-accent rounded transition-colors"
                >
                  <X className="size-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 overflow-auto bg-muted/20 p-4">
              {isPdfFile(previewLicense.fileUrl) ? (
                <iframe
                  title="证照 PDF 预览"
                  src={previewLicense.fileUrl}
                  className="h-[72vh] w-full rounded-lg border border-border bg-background"
                />
              ) : (
                <div className="flex min-h-[60vh] items-center justify-center">
                  <img
                    src={previewLicense.fileUrl}
                    alt="证照明细预览"
                    className="max-h-[72vh] max-w-full rounded-lg border border-border bg-background object-contain"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-medium">{dialogMode === 'add' ? '新增证照' : '编辑证照'}</h2>
              <button
                onClick={() => setShowDialog(false)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Hospital Information */}
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-4">医院信息</h3>
                <div>
                  <label className="block text-sm mb-2">
                    医院名称 <span className="text-destructive">*</span>
                    <span className="text-muted-foreground text-xs ml-2">
                      (根据医院和供应商授权关系进行展示)
                    </span>
                  </label>
                  <select
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={formData.hospitalName}
                    onChange={(e) => setFormData({ ...formData, hospitalName: e.target.value })}
                  >
                    <option value="">请选择医院</option>
                    <option value="浙江省人民医院">浙江省人民医院</option>
                    <option value="浙江大学医学院附属第一医院">浙江大学医学院附属第一医院</option>
                    <option value="宁波市第一医院">宁波市第一医院</option>
                    <option value="温州医科大学附属第一医院">温州医科大学附属第一医院</option>
                  </select>
                </div>
              </div>

              {/* License Basic Information */}
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-4">证照基本信息</h3>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm mb-2">
                      证照分类 <span className="text-destructive">*</span>
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.licenseType}
                      onChange={(e) => setFormData({ ...formData, licenseType: e.target.value })}
                    >
                      <option value="">请选择证照分类</option>
                      {licenseTypes.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-2">证照编码</label>
                    <input
                      type="text"
                      placeholder="请输入证照编码"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.licenseCode}
                      onChange={(e) => setFormData({ ...formData, licenseCode: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* Related Information */}
              <div className="border border-border rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-medium">
                    关联商品
                    <span className="text-muted-foreground text-xs ml-2">
                      (默认展示当前登录人选定医院的商品目录信息)
                    </span>
                  </h3>
                  <button
                    onClick={handleOpenProductDialog}
                    className="px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1"
                  >
                    <Plus className="size-4" />
                    添加商品
                  </button>
                </div>
                {formData.relatedProducts.length > 0 ? (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead>
                          <tr className="border-b border-border bg-muted/30">
                            <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">
                              商品编码
                            </th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">
                              商品名称
                            </th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">
                              规格
                            </th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">
                              厂家
                            </th>
                            <th className="px-4 py-2 text-left text-sm font-medium text-muted-foreground">
                              分类
                            </th>
                            <th className="px-4 py-2 text-center text-sm font-medium text-muted-foreground">
                              操作
                            </th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                          {formData.relatedProducts.map((product) => (
                            <tr key={product.id} className="hover:bg-accent/50 transition-colors">
                              <td className="px-4 py-2 text-sm font-mono">{product.code}</td>
                              <td className="px-4 py-2 font-medium text-sm">{product.name}</td>
                              <td className="px-4 py-2 text-sm">{product.spec}</td>
                              <td className="px-4 py-2 text-sm">{product.manufacturer}</td>
                              <td className="px-4 py-2 text-sm">{product.category}</td>
                              <td className="px-4 py-2">
                                <div className="flex justify-center">
                                  <button
                                    onClick={() => handleRemoveProduct(product.id)}
                                    className="p-1 text-destructive hover:bg-destructive/10 rounded transition-colors"
                                  >
                                    <Trash2 className="size-4" />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ) : (
                  <div className="border border-dashed border-border rounded-lg p-8 text-center text-muted-foreground text-sm">
                    暂无关联商品，请点击"添加商品"按钮选择商品
                  </div>
                )}
              </div>

              {/* Expiry Information */}
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-4">效期信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">
                      证照效期（开始时间） <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.startDate}
                      onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      证照效期（结束时间） <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="date"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.endDate}
                      onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    />
                  </div>
                </div>
              </div>

              {/* License File */}
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-4">证照文件</h3>
                <div>
                  <label className="block text-sm mb-2">证照文件</label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,image/gif,application/pdf"
                    className="hidden"
                    onChange={handleLicenseImageChange}
                  />
                  <div
                    className="border-2 border-dashed border-border rounded-lg p-6 text-center hover:border-primary transition-colors cursor-pointer"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(event) => event.preventDefault()}
                    onDrop={handleLicenseImageDrop}
                  >
                    {formData.fileUrl ? (
                      <div className="space-y-3">
                        {isPdfFile(formData.fileUrl) ? (
                          <div className="mx-auto flex max-w-md items-center justify-between rounded-lg border border-border bg-accent/30 px-4 py-3 text-left">
                            <div className="flex items-center gap-3">
                              <FileUp className="size-7 text-muted-foreground" />
                              <div>
                                <div className="text-sm font-medium">PDF 证照文件</div>
                                <div className="text-xs text-muted-foreground">已上传，可点击查看文件</div>
                              </div>
                            </div>
                            <a
                              href={formData.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="px-3 py-1.5 text-sm bg-background border border-border rounded-lg hover:bg-accent transition-colors"
                              onClick={(event) => event.stopPropagation()}
                            >
                              查看
                            </a>
                          </div>
                        ) : (
                          <img
                            src={formData.fileUrl}
                            alt="证照图片预览"
                            className="mx-auto max-h-48 rounded-lg border border-border object-contain"
                          />
                        )}
                        <div className="flex items-center justify-center gap-3">
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              fileInputRef.current?.click();
                            }}
                            disabled={licenseUploading}
                            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {licenseUploading ? '上传中...' : '重新上传'}
                          </button>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setFormData({ ...formData, fileUrl: '' });
                            }}
                            disabled={licenseUploading}
                            className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            移除文件
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <FileUp className="size-8 mx-auto mb-2 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground mb-1">
                          {licenseUploading ? '文件上传中...' : '点击上传或拖拽文件至此'}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          支持格式: PNG、JPG、WEBP、GIF、PDF · 文件大小不超过 10 MB
                        </p>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Remark */}
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-4">备注</h3>
                <textarea
                  rows={4}
                  placeholder="请输入备注信息..."
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDialog(false)}
                className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveLicense}
                disabled={licenseUploading || licenseSaving}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {licenseSaving ? '保存中...' : '确认保存'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Product Selection Dialog */}
      {showProductDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-4xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-medium">选择关联商品</h2>
              <button
                onClick={() => setShowProductDialog(false)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {/* Search */}
              <div>
                <label className="block text-sm mb-2">商品搜索</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="输入商品编码、名称或厂家进行模糊查询"
                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={productSearchQuery}
                    onChange={(e) => setProductSearchQuery(e.target.value)}
                  />
                  <button className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
                    <Search className="size-4" />
                    查询
                  </button>
                </div>
              </div>

              {/* Product Table */}
              {productsQuery.isPending && <p role="status">正在加载商品目录…</p>}
              {productsQuery.isError && <p role="alert">商品目录加载失败：{productsQuery.error.message}<button onClick={() => productsQuery.refetch()}>重试</button></p>}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={
                              selectedProducts.length ===
                              products.filter(
                                (p) =>
                                  p.name.includes(productSearchQuery) ||
                                  p.code.includes(productSearchQuery) ||
                                  p.manufacturer.includes(productSearchQuery)
                              ).length &&
                              products.filter(
                                (p) =>
                                  p.name.includes(productSearchQuery) ||
                                  p.code.includes(productSearchQuery) ||
                                  p.manufacturer.includes(productSearchQuery)
                              ).length > 0
                            }
                            onChange={handleProductSelectAll}
                            className="size-4 rounded border-border"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          商品编码
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          商品名称
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          规格
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          厂家
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          分类
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {products
                        .filter(
                          (p) =>
                            p.name.includes(productSearchQuery) ||
                            p.code.includes(productSearchQuery) ||
                            p.manufacturer.includes(productSearchQuery)
                        )
                        .map((product) => (
                          <tr key={product.id} className="hover:bg-accent/50 transition-colors">
                            <td className="px-4 py-3">
                              <input
                                type="checkbox"
                                checked={selectedProducts.includes(product.id)}
                                onChange={() => handleProductSelectRow(product.id)}
                                className="size-4 rounded border-border"
                              />
                            </td>
                            <td className="px-4 py-3 text-sm font-mono">{product.code}</td>
                            <td className="px-4 py-3 font-medium">{product.name}</td>
                            <td className="px-4 py-3 text-sm">{product.spec}</td>
                            <td className="px-4 py-3 text-sm">{product.manufacturer}</td>
                            <td className="px-4 py-3 text-sm">{product.category}</td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="text-sm text-muted-foreground">
                已选择 {selectedProducts.length} 个商品
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setShowProductDialog(false)}
                className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleConfirmProducts}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                确认
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
