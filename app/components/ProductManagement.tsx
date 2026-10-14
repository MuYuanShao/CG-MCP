import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  X,
  ChevronDown,
} from 'lucide-react';
import { useFeedback } from './AppFeedback';
import SpdDispatchDialog from './SpdDispatchDialog';
import {
  createProduct,
  deleteProducts,
  listProducts,
  productQueryKey,
  updateProduct,
  type ProductPayload,
} from '../services/products';
import { listCategories, categoryQueryKey } from '../services/categories';

interface Product {
  id: number;
  code: string;
  name: string;
  genericName: string;
  spec: string;
  model: string;
  unitPrice: number;
  unit: string;
  registrationNo: string;
  medicalInsuranceCode: string;
  udi: string;
  category: string;
  manufacturer: string;
  distributor: string;
  brand: string;
  isImported: number;
  isVolume: number;
  volumeCategory: string;
  zcLocalCode: string;
  mediumPackage: number;
  largePackage: number;
  hospitalContractCode: string;
  status: string;
}

interface ZcCatalogItem {
  id: number;
  hospListId: string;
  mcsProdCode: string;
  prodCode: string;
  itemname: string;
  prodName: string;
  mcsMol: string;
  prodSpec: string;
  minpacuntName: string;
  aprvno: string;
  regcert: string;
  regcertExpy: string;
  listAttrCode: string;
  listAttrName: string;
  pubonlnPric: string;
  delventpName: string;
}

const mockZcCatalog: ZcCatalogItem[] = [
  {
    id: 1,
    hospListId: 'HL20240001',
    mcsProdCode: 'ZC001',
    prodCode: '123456789012345678901234567',
    itemname: '注射穿刺类耗材',
    prodName: '一次性无菌注射器',
    mcsMol: 'LB-5',
    prodSpec: '5ml',
    minpacuntName: '支',
    aprvno: '国械注准20243210001',
    regcert: '一次性使用无菌注射器注册证',
    regcertExpy: '2029-12-31',
    listAttrCode: '01',
    listAttrName: '普通挂网',
    pubonlnPric: '0.85',
    delventpName: '浙江医疗器械有限公司',
  },
  {
    id: 2,
    hospListId: 'HL20240002',
    mcsProdCode: 'ZC002',
    prodCode: '223456789012345678901234567',
    itemname: '防护类耗材',
    prodName: '医用外科口罩',
    mcsMol: 'KZ-01',
    prodSpec: '一次性',
    minpacuntName: '只',
    aprvno: '国械注准20243210002',
    regcert: '医用外科口罩注册证',
    regcertExpy: '2028-08-31',
    listAttrCode: '02',
    listAttrName: '限价挂网',
    pubonlnPric: '0.35',
    delventpName: '浙江医疗器械有限公司',
  },
  {
    id: 3,
    hospListId: 'HL20240003',
    mcsProdCode: 'ZC003',
    prodCode: '323456789012345678901234567',
    itemname: '输注类耗材',
    prodName: '输液器',
    mcsMol: 'SY-200',
    prodSpec: '精密过滤',
    minpacuntName: '套',
    aprvno: '国械注准20243210003',
    regcert: '一次性使用输液器注册证',
    regcertExpy: '2030-03-31',
    listAttrCode: '01',
    listAttrName: '普通挂网',
    pubonlnPric: '2.50',
    delventpName: '上海医疗配送公司',
  },
  {
    id: 4,
    hospListId: 'HL20240004',
    mcsProdCode: 'ZC004',
    prodCode: '423456789012345678901234567',
    itemname: '敷料类耗材',
    prodName: '医用纱布',
    mcsMol: 'SB-10',
    prodSpec: '10cm×10cm',
    minpacuntName: '包',
    aprvno: '豫械注准20243210004',
    regcert: '医用脱脂纱布注册证',
    regcertExpy: '2027-06-30',
    listAttrCode: '03',
    listAttrName: '备案目录',
    pubonlnPric: '1.20',
    delventpName: '浙江医疗器械有限公司',
  },
  {
    id: 5,
    hospListId: 'HL20240005',
    mcsProdCode: 'ZC005',
    prodCode: '523456789012345678901234567',
    itemname: '防护类耗材',
    prodName: '一次性手套',
    mcsMol: 'ST-M',
    prodSpec: 'M码',
    minpacuntName: '副',
    aprvno: '粤械注准20243210005',
    regcert: '一次性使用医用手套注册证',
    regcertExpy: '2028-10-31',
    listAttrCode: '02',
    listAttrName: '限价挂网',
    pubonlnPric: '0.60',
    delventpName: '上海医疗配送公司',
  },
];

const defaultZcCatalogQuery = {
  hospListId: '',
  mcsProdCode: '',
  prodCode: '',
  itemname: '',
  prodName: '',
  mcsMol: '',
  prodSpec: '',
  minpacuntName: '',
  aprvno: '',
  regcert: '',
  regcertExpy: '',
  listAttrCode: '',
  listAttrName: '',
  pubonlnPric: '',
  delventpName: '',
};

const mockProducts: Product[] = [
  {
    id: 1,
    code: 'YLQX20240001',
    name: '一次性无菌注射器',
    genericName: '医用注射器',
    spec: '5ml',
    model: 'LB-5',
    unitPrice: 0.85,
    unit: '支',
    registrationNo: '国械注准20243210001',
    medicalInsuranceCode: 'C0001234',
    udi: '01234567890123',
    category: '低值耗材',
    manufacturer: '江苏医疗器械有限公司',
    distributor: '浙江医疗器械有限公司',
    brand: '江苏医疗',
    isImported: 1,
    isVolume: 1,
    volumeCategory: '国家集采',
    zcLocalCode: 'ZC001',
    mediumPackage: 10,
    largePackage: 100,
    hospitalContractCode: 'HT2024001',
    status: 'active',
  },
  {
    id: 2,
    code: 'YLQX20240002',
    name: '医用外科口罩',
    genericName: '医用防护口罩',
    spec: '一次性',
    model: 'KZ-01',
    unitPrice: 0.35,
    unit: '只',
    registrationNo: '国械注准20243210002',
    medicalInsuranceCode: 'C0001235',
    udi: '01234567890124',
    category: '低值耗材',
    manufacturer: '浙江康健医疗用品公司',
    distributor: '浙江医疗器械有限公司',
    brand: '康健',
    isImported: 1,
    isVolume: 0,
    volumeCategory: '',
    zcLocalCode: 'ZC002',
    mediumPackage: 50,
    largePackage: 500,
    hospitalContractCode: 'HT2024002',
    status: 'active',
  },
  {
    id: 3,
    code: 'YLQX20240003',
    name: '输液器',
    genericName: '一次性使用输液器',
    spec: '精密过滤',
    model: 'SY-200',
    unitPrice: 2.50,
    unit: '套',
    registrationNo: '国械注准20243210003',
    medicalInsuranceCode: 'C0001236',
    udi: '01234567890125',
    category: '低值耗材',
    manufacturer: '上海医疗科技股份公司',
    distributor: '浙江医疗器械有限公司',
    brand: '上医',
    isImported: 1,
    isVolume: 1,
    volumeCategory: '省级集采',
    zcLocalCode: 'ZC003',
    mediumPackage: 20,
    largePackage: 200,
    hospitalContractCode: 'HT2024003',
    status: 'active',
  },
  {
    id: 4,
    code: 'YLQX20240004',
    name: '心脏支架',
    genericName: '冠状动脉药物洗脱支架系统',
    spec: '药物洗脱',
    model: 'CS-3000',
    unitPrice: 12800,
    unit: '个',
    registrationNo: '国械注进20243210001',
    medicalInsuranceCode: 'C0002001',
    udi: '01234567890126',
    category: '高值耗材',
    manufacturer: '美国强生医疗',
    distributor: '浙江医疗器械有限公司',
    brand: 'Johnson & Johnson',
    isImported: 2,
    isVolume: 1,
    volumeCategory: '国家集采',
    zcLocalCode: 'ZC004',
    mediumPackage: 1,
    largePackage: 10,
    hospitalContractCode: 'HT2024004',
    status: 'active',
  },
];

export default function ProductManagement({ canDispatch = false }: { canDispatch?: boolean }) {
  const queryClient = useQueryClient();
  const { notify, confirm } = useFeedback();
  const [showDialog, setShowDialog] = useState(false);
  const [showBatchDialog, setShowBatchDialog] = useState(false);
  const [showZcCatalogDialog, setShowZcCatalogDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [selectedZcCode, setSelectedZcCode] = useState<string>('');
  const [zcCatalogQuery, setZcCatalogQuery] = useState(defaultZcCatalogQuery);
  const [submittedZcQuery, setSubmittedZcQuery] = useState(defaultZcCatalogQuery);
  const [searchForm, setSearchForm] = useState({
    name: '',
    manufacturer: '',
    registrationNo: '',
    medicalInsuranceCode: '',
    isImported: '',
    isVolume: '',
  });

  const [batchForm, setBatchForm] = useState({
    isImported: '',
    isVolume: '',
    brand: '',
    distributor: '',
  });

  const productsQuery = useQuery({
    queryKey: productQueryKey,
    queryFn: () => listProducts(),
  });
  const products = productsQuery.data?.records ?? [];
  const categoriesQuery = useQuery({
    queryKey: categoryQueryKey,
    queryFn: listCategories,
  });
  const categories = categoriesQuery.data ?? [];
  const filteredZcCatalog = mockZcCatalog.filter((item) =>
    (!submittedZcQuery.hospListId || item.hospListId.includes(submittedZcQuery.hospListId)) &&
    (!submittedZcQuery.mcsProdCode || item.mcsProdCode.includes(submittedZcQuery.mcsProdCode)) &&
    (!submittedZcQuery.prodCode || item.prodCode.includes(submittedZcQuery.prodCode)) &&
    (!submittedZcQuery.itemname || item.itemname.includes(submittedZcQuery.itemname)) &&
    (!submittedZcQuery.prodName || item.prodName.includes(submittedZcQuery.prodName)) &&
    (!submittedZcQuery.mcsMol || item.mcsMol.includes(submittedZcQuery.mcsMol)) &&
    (!submittedZcQuery.prodSpec || item.prodSpec.includes(submittedZcQuery.prodSpec)) &&
    (!submittedZcQuery.minpacuntName || item.minpacuntName.includes(submittedZcQuery.minpacuntName)) &&
    (!submittedZcQuery.aprvno || item.aprvno.includes(submittedZcQuery.aprvno)) &&
    (!submittedZcQuery.regcert || item.regcert.includes(submittedZcQuery.regcert)) &&
    (!submittedZcQuery.regcertExpy || item.regcertExpy.includes(submittedZcQuery.regcertExpy)) &&
    (!submittedZcQuery.listAttrCode || item.listAttrCode.includes(submittedZcQuery.listAttrCode)) &&
    (!submittedZcQuery.listAttrName || item.listAttrName.includes(submittedZcQuery.listAttrName)) &&
    (!submittedZcQuery.pubonlnPric || item.pubonlnPric.includes(submittedZcQuery.pubonlnPric)) &&
    (!submittedZcQuery.delventpName || item.delventpName.includes(submittedZcQuery.delventpName))
  );

  const deleteProductsMutation = useMutation({
    mutationFn: deleteProducts,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productQueryKey }),
  });

  const createProductMutation = useMutation({
    mutationFn: createProduct,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productQueryKey }),
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: ProductPayload }) => updateProduct(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: productQueryKey }),
  });

  const [formData, setFormData] = useState<Partial<Product>>({
    name: '',
    genericName: '',
    spec: '',
    model: '',
    unitPrice: 0,
    unit: '个',
    registrationNo: '',
    medicalInsuranceCode: '',
    udi: '',
    category: '',
    manufacturer: '',
    distributor: '浙江医疗器械有限公司',
    brand: '',
    isImported: 1,
    isVolume: 0,
    volumeCategory: '',
    zcLocalCode: '',
    mediumPackage: 0,
    largePackage: 0,
    hospitalContractCode: '',
  });

  const handleOpenDialog = (mode: 'add' | 'edit', product?: Product) => {
    setDialogMode(mode);
    if (mode === 'edit' && product) {
      setSelectedProduct(product);
      setFormData(product);
    } else {
      setFormData({
        name: '',
        genericName: '',
        spec: '',
        model: '',
        unitPrice: 0,
        unit: '个',
        registrationNo: '',
        medicalInsuranceCode: '',
        udi: '',
        category: '',
        manufacturer: '',
        distributor: '浙江医疗器械有限公司',
        brand: '',
        isImported: 1,
        isVolume: 0,
        volumeCategory: '',
        zcLocalCode: '',
        mediumPackage: 0,
        largePackage: 0,
        hospitalContractCode: '',
      });
    }
    setShowDialog(true);
  };

  const handleCloseDialog = () => {
    setShowDialog(false);
    setSelectedProduct(null);
  };

  const toProductPayload = (): ProductPayload => ({
    code: formData.code ?? selectedProduct?.code ?? '',
    name: formData.name ?? '',
    genericName: formData.genericName ?? '',
    spec: formData.spec ?? '',
    model: formData.model ?? '',
    unitPrice: Number(formData.unitPrice ?? 0),
    unit: formData.unit ?? '个',
    registrationNo: formData.registrationNo ?? '',
    medicalInsuranceCode: formData.medicalInsuranceCode ?? '',
    udi: formData.udi ?? '',
    category: formData.category ?? '',
    manufacturer: formData.manufacturer ?? '',
    distributor: formData.distributor ?? '',
    brand: formData.brand ?? '',
    isImported: Number(formData.isImported ?? 1),
    isVolume: Number(formData.isVolume ?? 0),
    volumeCategory: formData.volumeCategory ?? '',
    zcLocalCode: formData.zcLocalCode ?? '',
    mediumPackage: Number(formData.mediumPackage ?? 0),
    largePackage: Number(formData.largePackage ?? 0),
    hospitalContractCode: formData.hospitalContractCode ?? '',
    status: formData.status ?? 'active',
  });

  const handleSaveProduct = () => {
    if (!formData.name?.trim()) {
      notify.warning('请填写商品名称');
      return;
    }

    const payload = toProductPayload();
    if (dialogMode === 'edit' && selectedProduct) {
      updateProductMutation.mutate(
        { id: selectedProduct.id, payload },
        {
          onSuccess: () => {
            notify.success('商品信息已更新');
            setSelectedRows([]);
            handleCloseDialog();
          },
          onError: (error) => {
            notify.error(error instanceof Error ? error.message : '商品信息更新失败');
          },
        },
      );
      return;
    }

    createProductMutation.mutate(payload, {
      onSuccess: () => {
        notify.success('商品信息已保存');
        setSelectedRows([]);
        handleCloseDialog();
      },
      onError: (error) => {
        notify.error(error instanceof Error ? error.message : '商品信息保存失败');
      },
    });
  };

  const handleSelectAll = () => {
    if (selectedRows.length === products.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(products.map((p) => p.id));
    }
  };

  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((rowId) => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const handleDelete = async () => {
    if (selectedRows.length === 0) {
      notify.warning('请选择要删除的商品');
      return;
    }

    const confirmed = await confirm({
      title: '确认删除商品',
      description: `确定删除已选择 ${selectedRows.length} 个商品吗？删除后列表将同步更新。`,
      confirmText: '删除',
      cancelText: '取消',
      destructive: true,
    });

    if (!confirmed) return;

    deleteProductsMutation.mutate(selectedRows, {
      onSuccess: () => {
        setSelectedRows([]);
        notify.success('商品信息已删除');
      },
      onError: (error) => {
        notify.error(error instanceof Error ? error.message : '商品信息删除失败');
      },
    });
  };

  return (
    <div className="space-y-4">
      {/* Search Form */}
      <div className="p-5 border border-border rounded-lg bg-background">
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm mb-2">商品名称</label>
            <input
              type="text"
              placeholder="请输入商品名称"
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={searchForm.name}
              onChange={(e) => setSearchForm({ ...searchForm, name: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm mb-2">生产厂家</label>
            <input
              type="text"
              placeholder="请输入生产厂家"
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={searchForm.manufacturer}
              onChange={(e) => setSearchForm({ ...searchForm, manufacturer: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm mb-2">注册证号</label>
            <input
              type="text"
              placeholder="请输入注册证号"
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={searchForm.registrationNo}
              onChange={(e) => setSearchForm({ ...searchForm, registrationNo: e.target.value })}
            />
          </div>
          <div>
            <label className="block text-sm mb-2">医保编码</label>
            <input
              type="text"
              placeholder="请输入医保编码"
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={searchForm.medicalInsuranceCode}
              onChange={(e) =>
                setSearchForm({ ...searchForm, medicalInsuranceCode: e.target.value })
              }
            />
          </div>
          <div>
            <label className="block text-sm mb-2">是否进口</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={searchForm.isImported}
              onChange={(e) => setSearchForm({ ...searchForm, isImported: e.target.value })}
            >
              <option value="">全部</option>
              <option value="1">国产</option>
              <option value="2">进口</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-2">是否带量</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
              value={searchForm.isVolume}
              onChange={(e) => setSearchForm({ ...searchForm, isVolume: e.target.value })}
            >
              <option value="">全部</option>
              <option value="1">是</option>
              <option value="0">否</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
            <Search className="size-4" />
            查询
          </button>
          <button className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors">
            重置
          </button>
        </div>
      </div>

      {/* Action Bar */}
      <div className="p-4 border border-border rounded-lg bg-background">
        <div className="flex items-center gap-2 flex-wrap">
          {canDispatch && <SpdDispatchDialog productIds={selectedRows} />}
          <button
            onClick={() => handleOpenDialog('add')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Plus className="size-4" />
            新增
          </button>
          <button
            onClick={() => selectedRows.length === 1 && handleOpenDialog('edit', products.find(p => p.id === selectedRows[0]))}
            disabled={selectedRows.length !== 1}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Edit className="size-4" />
            编辑
          </button>
          <button
            onClick={handleDelete}
            disabled={selectedRows.length === 0 || deleteProductsMutation.isPending}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="size-4" />
            删除
          </button>
          <button
            onClick={() => setShowBatchDialog(true)}
            disabled={selectedRows.length === 0}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className="size-4" />
            批量修改
          </button>
          <button className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2">
            <Upload className="size-4" />
            导入
          </button>
          <button className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2">
            <Download className="size-4" />
            导出
          </button>
          <button className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2">
            <RefreshCw className="size-4" />
            同步招采子平台
          </button>
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
                    checked={selectedRows.length === products.length && products.length > 0}
                    onChange={handleSelectAll}
                    className="size-4 rounded border-border"
                  />
                </th>
                <th className="px-4 py-3 text-left font-medium text-muted-foreground text-[14px]">商品编码</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">商品名称</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">通用名</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">规格</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">型号</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">单价</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">单位</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">注册证</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">生产厂家</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">品牌</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">是否进口</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {products.map((product) => (
                <tr key={product.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(product.id)}
                      onChange={() => handleSelectRow(product.id)}
                      className="size-4 rounded border-border"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm font-mono">{product.code}</td>
                  <td className="px-4 py-3 font-medium">{product.name}</td>
                  <td className="px-4 py-3 text-sm">{product.genericName}</td>
                  <td className="px-4 py-3 text-sm">{product.spec}</td>
                  <td className="px-4 py-3 text-sm">{product.model}</td>
                  <td className="px-4 py-3 text-right font-medium">¥{product.unitPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-center text-sm">{product.unit}</td>
                  <td className="px-4 py-3 text-sm font-mono">{product.registrationNo}</td>
                  <td className="px-4 py-3 text-sm">{product.manufacturer}</td>
                  <td className="px-4 py-3 text-sm">{product.brand}</td>
                  <td className="px-4 py-3 text-center">
                    <span
                      className={`px-2 py-1 rounded text-xs ${
                        product.isImported === 1
                          ? 'bg-[#10b981]/10 text-[#10b981]'
                          : 'bg-[#3b82f6]/10 text-[#3b82f6]'
                      }`}
                    >
                      {product.isImported === 1 ? '国产' : '进口'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <span className="px-2 py-1 rounded text-xs bg-[#10b981]/10 text-[#10b981]">
                      正常
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            每页25条 · 共{products.length}条
          </div>
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
              3
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

      {/* Add/Edit Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-medium">
                {dialogMode === 'add' ? '新增商品' : '编辑商品'}
              </h2>
              <button
                onClick={handleCloseDialog}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Information */}
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-4">基本信息</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm mb-2">
                      商品编码 <span className="text-muted-foreground text-xs">(自动生成)</span>
                    </label>
                    <input
                      type="text"
                      value={formData.code ?? '系统自动生成'}
                      disabled
                      className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm mb-2">
                      商品名称 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="请输入商品名称"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm mb-2">通用名</label>
                    <input
                      type="text"
                      placeholder="请输入通用名"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.genericName}
                      onChange={(e) => setFormData({ ...formData, genericName: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">规格</label>
                    <input
                      type="text"
                      placeholder="请输入规格"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.spec}
                      onChange={(e) => setFormData({ ...formData, spec: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">型号</label>
                    <input
                      type="text"
                      placeholder="请输入型号"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.model}
                      onChange={(e) => setFormData({ ...formData, model: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">单价</label>
                    <input
                      type="number"
                      step="0.01"
                      placeholder="请输入单位"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.unitPrice}
                      onChange={(e) =>
                        setFormData({ ...formData, unitPrice: parseFloat(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">单位</label>
                    <select
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.unit}
                      onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    >
                      <option value="个">个</option>
                      <option value="支">支</option>
                      <option value="盒">盒</option>
                      <option value="套">套</option>
                      <option value="瓶">瓶</option>
                      <option value="袋">袋</option>
                      <option value="只">只</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      分类
                    </label>
                    <select
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    >
                      <option value="">请选择分类</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.categoryName}>{cat.categoryName}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-2">是否进口</label>
                    <div className="flex gap-4 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="isImported"
                          value="1"
                          checked={formData.isImported === 1}
                          onChange={() => setFormData({ ...formData, isImported: 1 })}
                          className="size-4"
                        />
                        <span className="text-sm">国产</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="isImported"
                          value="2"
                          checked={formData.isImported === 2}
                          onChange={() => setFormData({ ...formData, isImported: 2 })}
                          className="size-4"
                        />
                        <span className="text-sm">进口</span>
                      </label>
                    </div>
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm mb-2">生产厂家</label>
                    <input
                      type="text"
                      placeholder="请输入生产厂家"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.manufacturer}
                      onChange={(e) => setFormData({ ...formData, manufacturer: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm mb-2">
                      配送商{' '}
                      <span className="text-muted-foreground text-xs">
                        (默认取登录账号的供应商)
                      </span>
                    </label>
                    <input
                      type="text"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.distributor}
                      onChange={(e) => setFormData({ ...formData, distributor: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm mb-2">品牌</label>
                    <input
                      type="text"
                      placeholder="请输入品牌"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm mb-2">注册证号</label>
                    <input
                      type="text"
                      placeholder="请输入注册证号"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.registrationNo}
                      onChange={(e) =>
                        setFormData({ ...formData, registrationNo: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm mb-2">医保编码</label>
                    <input
                      type="text"
                      placeholder="请输入医保编码"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.medicalInsuranceCode}
                      onChange={(e) =>
                        setFormData({ ...formData, medicalInsuranceCode: e.target.value })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm mb-2">UDI编码</label>
                    <input
                      type="text"
                      placeholder="请输入UDI编码"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.udi}
                      onChange={(e) => setFormData({ ...formData, udi: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">是否带量</label>
                    <div className="flex gap-4 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="isVolume"
                          value="0"
                          checked={formData.isVolume === 0}
                          onChange={() => setFormData({ ...formData, isVolume: 0, volumeCategory: '' })}
                          className="size-4"
                        />
                        <span className="text-sm">是</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="isVolume"
                          value="1"
                          checked={formData.isVolume === 1}
                          onChange={() => setFormData({ ...formData, isVolume: 1 })}
                          className="size-4"
                        />
                        <span className="text-sm">否</span>
                      </label>
                    </div>
                  </div>
                  {formData.isVolume === 1 && (
                    <div>
                      <label className="block text-sm mb-2">带量分类</label>
                      <select
                        className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                        value={formData.volumeCategory}
                        onChange={(e) =>
                          setFormData({ ...formData, volumeCategory: e.target.value })
                        }
                      >
                        <option value="">请选择带量分类</option>
                        <option value="国家集采">国家集采</option>
                        <option value="省级集采">省级集采</option>
                        <option value="市级集采">市级集采</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className="block text-sm mb-2">中包装</label>
                    <input
                      type="number"
                      placeholder="请输入中包装数量"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.mediumPackage}
                      onChange={(e) =>
                        setFormData({ ...formData, mediumPackage: parseInt(e.target.value) })
                      }
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">大包装</label>
                    <input
                      type="number"
                      placeholder="请输入大包装数量"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.largePackage}
                      onChange={(e) =>
                        setFormData({ ...formData, largePackage: parseInt(e.target.value) })
                      }
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-sm mb-2">院内合同编码</label>
                    <input
                      type="text"
                      placeholder="请输入院内合同编码"
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.hospitalContractCode}
                      onChange={(e) =>
                        setFormData({ ...formData, hospitalContractCode: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {/* Zc Local Code */}
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-4">招采子本地编码</h3>
                <div>
                  <label className="block text-sm mb-2">
                    招采子本地编码{' '}
                    <span className="text-muted-foreground text-xs">
                      (支持输入或查询)
                    </span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="请输入或点击放大镜查询"
                      className="w-full px-3 py-2 pr-10 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={formData.zcLocalCode}
                      onChange={(e) =>
                        setFormData({ ...formData, zcLocalCode: e.target.value })
                      }
                    />
                    <Search
                      className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-primary cursor-pointer hover:text-primary/80"
                      onClick={() => setShowZcCatalogDialog(true)}
                    />
                  </div>
                </div>
              </div>

            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={handleCloseDialog}
                className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSaveProduct}
                disabled={createProductMutation.isPending || updateProductMutation.isPending}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Batch Modification Dialog */}
      {showBatchDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-lg w-full">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h2 className="text-xl font-medium">批量修改</h2>
              <button
                onClick={() => setShowBatchDialog(false)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-sm text-muted-foreground mb-4">
                已选择 {selectedRows.length} 个商品，请选择需要修改的字段
              </p>

              <div>
                <label className="block text-sm mb-2">是否进口</label>
                <select
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={batchForm.isImported}
                  onChange={(e) => setBatchForm({ ...batchForm, isImported: e.target.value })}
                >
                  <option value="">不修改</option>
                  <option value="1">国产</option>
                  <option value="2">进口</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2">是否带量</label>
                <select
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={batchForm.isVolume}
                  onChange={(e) => setBatchForm({ ...batchForm, isVolume: e.target.value })}
                >
                  <option value="">不修改</option>
                  <option value="1">是</option>
                  <option value="0">否</option>
                </select>
              </div>

              <div>
                <label className="block text-sm mb-2">品牌</label>
                <input
                  type="text"
                  placeholder="留空表示不修改"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={batchForm.brand}
                  onChange={(e) => setBatchForm({ ...batchForm, brand: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-sm mb-2">配送商</label>
                <input
                  type="text"
                  placeholder="留空表示不修改"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={batchForm.distributor}
                  onChange={(e) => setBatchForm({ ...batchForm, distributor: e.target.value })}
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setShowBatchDialog(false)}
                className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  // Handle batch update logic here
                  setShowBatchDialog(false);
                  setSelectedRows([]);
                }}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                确认修改
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Zc Catalog Query Dialog */}
      {showZcCatalogDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
              <div className="flex items-center gap-4">
                <h2 className="text-xl font-medium">招采子目录查询</h2>
                <div className="flex gap-2">
                  <button
                    onClick={() => setSubmittedZcQuery(zcCatalogQuery)}
                    className="px-4 py-1.5 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-1.5 text-sm"
                  >
                    <Search className="size-3.5" />
                    查询
                  </button>
                  <button
                    onClick={() => {
                      setZcCatalogQuery(defaultZcCatalogQuery);
                      setSubmittedZcQuery(defaultZcCatalogQuery);
                    }}
                    className="px-4 py-1.5 border border-border rounded-lg hover:bg-accent transition-colors text-sm"
                  >
                    重置
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowZcCatalogDialog(false);
                  setSelectedZcCode('');
                  setZcCatalogQuery(defaultZcCatalogQuery);
                  setSubmittedZcQuery(defaultZcCatalogQuery);
                }}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              {/* Filter */}
              <div className="grid grid-cols-2 gap-4">
                {[
                  { key: 'hospListId', label: '院内目录id', placeholder: '请输入院内目录id' },
                  { key: 'mcsProdCode', label: '本地编码', placeholder: '请输入本地编码' },
                  { key: 'prodCode', label: '耗材统一编号', placeholder: '请输入耗材统一编号' },
                  { key: 'itemname', label: '项目名称', placeholder: '请输入项目名称' },
                  { key: 'prodName', label: '产品名称', placeholder: '请输入产品名称' },
                  { key: 'mcsMol', label: '耗材型号', placeholder: '请输入耗材型号' },
                  { key: 'prodSpec', label: '规格', placeholder: '请输入规格' },
                  { key: 'minpacuntName', label: '最小包装单位名称', placeholder: '请输入最小包装单位名称' },
                  { key: 'aprvno', label: '注册证编号', placeholder: '请输入注册证编号' },
                  { key: 'regcert', label: '注册证名称', placeholder: '请输入注册证名称' },
                  { key: 'regcertExpy', label: '注册证有效期止', placeholder: '请输入注册证有效期止' },
                  { key: 'listAttrCode', label: '目录属性代码', placeholder: '请输入目录属性代码' },
                  { key: 'listAttrName', label: '目录属性名称', placeholder: '请输入目录属性名称' },
                  { key: 'pubonlnPric', label: '挂网价格', placeholder: '请输入挂网价格' },
                  { key: 'delventpName', label: '配送企业名称', placeholder: '请输入配送企业名称' },
                ].map((field) => (
                  <div key={field.key}>
                    <label className="block text-sm mb-2">{field.label}</label>
                    <input
                      type="text"
                      placeholder={field.placeholder}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      value={String(zcCatalogQuery[field.key as keyof typeof zcCatalogQuery])}
                      onChange={(e) =>
                        setZcCatalogQuery({
                          ...zcCatalogQuery,
                          [field.key]: e.target.value,
                        })
                      }
                    />
                  </div>
                ))}
              </div>

              {/* Table */}
              <div className="border border-border rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">选择</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          院内目录id
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          本地编码
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          耗材统一编号
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          项目名称
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          产品名称
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">耗材型号</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">规格</th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          最小包装单位名称
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          注册证编号
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          注册证名称
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          注册证有效期止
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          目录属性代码
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          目录属性名称
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          挂网价格
                        </th>
                        <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                          配送企业名称
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {filteredZcCatalog.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-accent/50 transition-colors"
                          >
                            <td className="px-4 py-3">
                              <input
                                type="radio"
                                name="zcCode"
                                checked={selectedZcCode === item.mcsProdCode}
                                onChange={() => setSelectedZcCode(item.mcsProdCode)}
                                className="size-4"
                              />
                            </td>
                            <td className="px-4 py-3 font-mono text-sm whitespace-nowrap">{item.hospListId}</td>
                            <td className="px-4 py-3 font-mono text-sm whitespace-nowrap">{item.mcsProdCode}</td>
                            <td className="px-4 py-3 font-mono text-sm whitespace-nowrap">{item.prodCode}</td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">{item.itemname}</td>
                            <td className="px-4 py-3 font-medium whitespace-nowrap">{item.prodName}</td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">{item.mcsMol}</td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">{item.prodSpec}</td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">{item.minpacuntName}</td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">{item.aprvno}</td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">{item.regcert}</td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">{item.regcertExpy}</td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">{item.listAttrCode}</td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">{item.listAttrName}</td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">{item.pubonlnPric}</td>
                            <td className="px-4 py-3 text-sm whitespace-nowrap">{item.delventpName}</td>
                          </tr>
                        ))}
                      {filteredZcCatalog.length === 0 && (
                        <tr>
                          <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={16}>
                            暂无匹配数据
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
              <div className="text-sm text-muted-foreground">
                共 {filteredZcCatalog.length} 条
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 sticky bottom-0 bg-background">
              <button
                onClick={() => {
                  setShowZcCatalogDialog(false);
                  setSelectedZcCode('');
                  setZcCatalogQuery(defaultZcCatalogQuery);
                  setSubmittedZcQuery(defaultZcCatalogQuery);
                }}
                className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  if (selectedZcCode) {
                    setFormData({ ...formData, zcLocalCode: selectedZcCode });
                    setShowZcCatalogDialog(false);
                    setSelectedZcCode('');
                    setZcCatalogQuery(defaultZcCatalogQuery);
                    setSubmittedZcQuery(defaultZcCatalogQuery);
                  }
                }}
                disabled={!selectedZcCode}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认选择
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
    </div>
  );
}
