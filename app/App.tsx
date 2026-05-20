import { useEffect, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileCheck,
  Building2,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Menu,
  Bell,
  Search,
  ChevronRight,
  ChevronDown,
  Plus,
  Upload,
  Download,
  Edit,
  Trash2,
  RefreshCw,
  UserCheck,
  Send,
  Truck,
  Filter,
  FileText,
  Users,
  Shield,
  RotateCcw,
  X,
} from 'lucide-react';
import ProductManagement from './components/ProductManagement';
import LicenseManagement from './components/LicenseManagement';
import PurchaseManagement from './components/PurchaseManagement';
import AcceptanceManagement from './components/AcceptanceManagement';
import InventoryManagement from './components/InventoryManagement';
import SettlementManagement from './components/SettlementManagement';
import InvoiceManagement from './components/InvoiceManagement';
import UserManagement from './components/UserManagement';
import RoleManagement from './components/RoleManagement';
import SupplierManagement from './components/SupplierManagement';
import RefundManagement from './components/RefundManagement';
import { FeedbackProvider, useFeedback } from './components/AppFeedback';
import { Button } from './components/ui/button';
import { useIsMobile } from './components/ui/use-mobile';
import {
  createHospital,
  deleteHospitals,
  hospitalQueryKey,
  listHospitals,
  updateHospital,
  type HospitalPayload,
} from './services/hospitals';
import { getStoredAuthUser, login, logout, refreshAuth, type LoginResponse } from './services/auth';
import { aiSearch } from './services/ai';
import { procurementWorkflow, workflowRelation } from './lib/workflow';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

const orderTrendData = [
  { month: '1月', orders: 145, amount: 286000 },
  { month: '2月', orders: 167, amount: 312000 },
  { month: '3月', orders: 189, amount: 358000 },
  { month: '4月', orders: 156, amount: 298000 },
  { month: '5月', orders: 203, amount: 425000 },
  { month: '6月', orders: 221, amount: 478000 },
];

const categoryData = [
  { name: '高值耗材', value: 45, color: 'var(--chart-1)' },
  { name: '低值耗材', value: 30, color: 'var(--chart-2)' },
  { name: '医疗设备', value: 15, color: 'var(--chart-3)' },
  { name: '其他', value: 10, color: 'var(--chart-4)' },
];

const expiringLicenses = [
  { id: 1, type: '经营许可证', product: '一次性无菌注射器', expiry: '2026-05-15', days: 33, status: 'warning' },
  { id: 2, type: '注册证', product: '医用口罩', expiry: '2026-06-20', days: 69, status: 'normal' },
  { id: 3, type: '生产许可证', product: '输液器', expiry: '2026-04-28', days: 16, status: 'urgent' },
  { id: 4, type: '备案凭证', product: '消毒液', expiry: '2026-07-10', days: 89, status: 'normal' },
];

const inventoryAlerts = [
  { id: 1, product: '一次性手套', batch: 'B20240215', expiry: '2026-05-01', qty: 2400, status: 'warning' },
  { id: 2, product: '医用纱布', batch: 'B20240301', expiry: '2026-04-20', qty: 850, status: 'urgent' },
  { id: 3, product: '注射器(5ml)', batch: 'B20240118', expiry: '2026-06-15', qty: 5200, status: 'normal' },
  { id: 4, product: '输液器', batch: 'B20240205', expiry: '2026-04-25', qty: 1200, status: 'urgent' },
];

const recentOrders = [
  { id: 'PO202604120001', hospital: '市第一人民医院', items: 15, amount: 45600, status: 'confirmed', date: '2026-04-12' },
  { id: 'PO202604120002', hospital: '中心医院', items: 8, amount: 28300, status: 'pending', date: '2026-04-12' },
  { id: 'PO202604110015', hospital: '省立医院', items: 23, amount: 67800, status: 'shipped', date: '2026-04-11' },
  { id: 'PO202604110014', hospital: '儿童医院', items: 12, amount: 34200, status: 'delivered', date: '2026-04-11' },
  { id: 'PO202604100032', hospital: '妇幼保健院', items: 18, amount: 52100, status: 'confirmed', date: '2026-04-10' },
];

const hospitalsData = [
  { id: 1, code: 'H001', name: '浙江省人民医院', level: '三级甲等', city: '杭州市', contact: '张主任', phone: '0571-87666666', status: 'active', cooperationDate: '2024-01-15' },
  { id: 2, code: 'H002', name: '浙江大学医学院附属第一医院', level: '三级甲等', city: '杭州市', contact: '李主任', phone: '0571-87236114', status: 'active', cooperationDate: '2024-02-20' },
  { id: 3, code: 'H003', name: '宁波市第一医院', level: '三级甲等', city: '宁波市', contact: '王主任', phone: '0574-87085588', status: 'active', cooperationDate: '2024-03-10' },
  { id: 4, code: 'H004', name: '温州医科大学附属第一医院', level: '三级甲等', city: '温州市', contact: '赵主任', phone: '0577-55579999', status: 'active', cooperationDate: '2024-04-05' },
  { id: 5, code: 'H005', name: '嘉兴市第一医院', level: '三级乙等', city: '嘉兴市', contact: '刘主任', phone: '0573-82519999', status: 'active', cooperationDate: '2024-05-12' },
  { id: 6, code: 'H006', name: '湖州市中心医院', level: '三级乙等', city: '湖州市', contact: '陈主任', phone: '0572-2023301', status: 'inactive', cooperationDate: '2023-08-20' },
];

const productsData = [
  { id: 1, code: 'P001', name: '一次性无菌注射器(5ml)', category: '低值耗材', spec: '5ml', manufacturer: '江苏医疗器械有限公司', price: 0.85, stock: 15000, status: 'active' },
  { id: 2, code: 'P002', name: '医用外科口罩', category: '低值耗材', spec: '一次性', manufacturer: '浙江康健医疗用品公司', price: 0.35, stock: 50000, status: 'active' },
  { id: 3, code: 'P003', name: '输液器', category: '低值耗材', spec: '精密过滤', manufacturer: '上海医疗科技股份公司', price: 2.50, stock: 8000, status: 'active' },
  { id: 4, code: 'P004', name: '心脏支架', category: '高值耗材', spec: '药物洗脱', manufacturer: '美国强生医疗', price: 12800, stock: 120, status: 'active' },
  { id: 5, code: 'P005', name: '医用纱布', category: '低值耗材', spec: '10cm×10cm', manufacturer: '河南医用材料厂', price: 0.60, stock: 25000, status: 'active' },
  { id: 6, code: 'P006', name: '人工关节', category: '高值耗材', spec: '钛合金', manufacturer: '德国西门子医疗', price: 28000, stock: 45, status: 'inactive' },
];

const ordersData = [
  { id: 1, orderNo: 'PO202604120001', hospital: '浙江省人民医院', orderDate: '2026-04-12', deliveryDate: '2026-04-15', items: 15, totalAmount: 45600, status: 'confirmed' },
  { id: 2, orderNo: 'PO202604120002', hospital: '浙江大学医学院附属第一医院', orderDate: '2026-04-12', deliveryDate: '2026-04-16', items: 8, totalAmount: 28300, status: 'pending' },
  { id: 3, orderNo: 'PO202604110015', hospital: '宁波市第一医院', orderDate: '2026-04-11', deliveryDate: '2026-04-14', items: 23, totalAmount: 67800, status: 'shipped' },
  { id: 4, orderNo: 'PO202604110014', hospital: '温州医科大学附属第一医院', orderDate: '2026-04-11', deliveryDate: '2026-04-13', items: 12, totalAmount: 34200, status: 'delivered' },
  { id: 5, orderNo: 'PO202604100032', hospital: '嘉兴市第一医院', orderDate: '2026-04-10', deliveryDate: '2026-04-14', items: 18, totalAmount: 52100, status: 'confirmed' },
  { id: 6, orderNo: 'PO202604100028', hospital: '浙江省人民医院', orderDate: '2026-04-10', deliveryDate: '2026-04-12', items: 5, totalAmount: 156000, status: 'shipped' },
];

const licensesData = [
  { id: 1, type: '经营许可证', licenseNo: 'JY20240001', product: '一次性无菌注射器', issueDate: '2024-05-20', expiryDate: '2026-05-15', status: 'active' },
  { id: 2, type: '注册证', licenseNo: 'ZC20240012', product: '医用外科口罩', issueDate: '2024-06-10', expiryDate: '2026-06-20', status: 'active' },
  { id: 3, type: '生产许可证', licenseNo: 'SC20240005', product: '输液器', issueDate: '2024-04-15', expiryDate: '2026-04-28', status: 'warning' },
  { id: 4, type: '备案凭证', licenseNo: 'BA20240018', product: '医用纱布', issueDate: '2024-07-05', expiryDate: '2026-07-10', status: 'active' },
  { id: 5, type: '注册证', licenseNo: 'ZC20240025', product: '心脏支架', issueDate: '2024-03-20', expiryDate: '2027-03-20', status: 'active' },
  { id: 6, type: '经营许可证', licenseNo: 'JY20240008', product: '人工关节', issueDate: '2023-12-10', expiryDate: '2025-12-10', status: 'expired' },
];

const inventoryData = [
  { id: 1, product: '一次性无菌注射器(5ml)', batchNo: 'B20240215', productionDate: '2024-02-15', expiryDate: '2026-05-01', qty: 2400, available: 2400, locked: 0, status: 'warning' },
  { id: 2, product: '医用外科口罩', batchNo: 'B20240301', productionDate: '2024-03-01', expiryDate: '2026-04-20', qty: 850, available: 650, locked: 200, status: 'urgent' },
  { id: 3, product: '输液器', batchNo: 'B20240118', productionDate: '2024-01-18', expiryDate: '2026-06-15', qty: 5200, available: 5000, locked: 200, status: 'normal' },
  { id: 4, product: '医用纱布', batchNo: 'B20240205', productionDate: '2024-02-05', expiryDate: '2026-04-25', qty: 1200, available: 1100, locked: 100, status: 'urgent' },
  { id: 5, product: '心脏支架', batchNo: 'B20240310', productionDate: '2024-03-10', expiryDate: '2027-03-10', qty: 45, available: 40, locked: 5, status: 'normal' },
  { id: 6, product: '一次性手套', batchNo: 'B20240220', productionDate: '2024-02-20', expiryDate: '2026-08-20', qty: 12000, available: 11500, locked: 500, status: 'normal' },
];

function AppContent() {
  const { confirm, notify } = useFeedback();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [showAiSearchDialog, setShowAiSearchDialog] = useState(false);
  const [aiSearchQuery, setAiSearchQuery] = useState('');
  const [aiSearchAnswer, setAiSearchAnswer] = useState('');
  const [searchHospitalName, setSearchHospitalName] = useState('');
  const [showAddHospitalDialog, setShowAddHospitalDialog] = useState(false);
  const [showEditHospitalDialog, setShowEditHospitalDialog] = useState(false);
  const [selectedHospitals, setSelectedHospitals] = useState<number[]>([]);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [authUser, setAuthUser] = useState<LoginResponse | null>(() => getStoredAuthUser());
  const [loginForm, setLoginForm] = useState({ username: 'root', password: '' });
  const [hospitalFormData, setHospitalFormData] = useState({
    code: '',
    name: '',
    level: '',
    city: '',
    contact: '',
    phone: '',
    status: 'active',
  });

  const loginMutation = useMutation({
    mutationFn: () => login(loginForm.username, loginForm.password),
    onSuccess: (user) => {
      setAuthUser(user);
      queryClient.clear();
      notify.success('登录成功');
    },
    onError: (error) => {
      notify.error(error instanceof Error ? error.message : '登录失败');
    },
  });

  const aiSearchMutation = useMutation({
    mutationFn: aiSearch,
    onSuccess: (result) => {
      setAiSearchAnswer(result.answer);
    },
    onError: (error) => {
      notify.error(error instanceof Error ? error.message : 'AI搜索失败');
    },
  });

  const handleAiSearch = () => {
    const query = aiSearchQuery.trim();
    if (!query) {
      notify.warning('请输入AI搜索内容');
      return;
    }
    setAiSearchAnswer('');
    aiSearchMutation.mutate(query);
  };

  const hospitalsQuery = useQuery({
    queryKey: hospitalQueryKey,
    queryFn: listHospitals,
  });
  const hospitals = hospitalsQuery.data ?? [];

  const createHospitalMutation = useMutation({
    mutationFn: createHospital,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hospitalQueryKey }),
  });
  const updateHospitalMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: HospitalPayload }) => updateHospital(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hospitalQueryKey }),
  });
  const deleteHospitalsMutation = useMutation({
    mutationFn: deleteHospitals,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hospitalQueryKey }),
  });

  const toHospitalPayload = (): HospitalPayload => ({
    code: hospitalFormData.code,
    name: hospitalFormData.name,
    level: hospitalFormData.level,
    city: hospitalFormData.city,
    contact: hospitalFormData.contact,
    phone: hospitalFormData.phone,
    status: hospitalFormData.status as 'active' | 'inactive',
  });

  const navItems = [
    { id: 'dashboard', label: '工作台', icon: LayoutDashboard },
    { id: 'hospitals', label: '医院管理', icon: Building2 },
    { id: 'suppliers', label: '供应商管理', icon: Truck },
    { id: 'products', label: '商品目录', icon: ClipboardList },
    { id: 'orders', label: '采购流程', icon: ShoppingCart },
    { id: 'licenses', label: '证照管理', icon: FileCheck },
    { id: 'acceptance', label: '验收管理', icon: UserCheck },
    { id: 'refunds', label: '退货管理', icon: RotateCcw },
    { id: 'inventory', label: '库存管理', icon: Package },
    { id: 'settlement', label: '结算管理', icon: TrendingUp },
    { id: 'invoice', label: '发票管理', icon: FileText },
    { id: 'users', label: '用户管理', icon: Users },
    { id: 'roles', label: '角色管理', icon: Shield },
  ];

  const navDescriptions: Record<string, string> = {
    dashboard: '今日概览与待办事项',
    hospitals: '医院信息管理与供应商授权',
    suppliers: '供应商信息管理与医院授权',
    products: '商品目录维护与价格管理',
    orders: '采购计划转采购订单，订单状态统一跟踪履约进度',
    licenses: '证照效期管理与合规审核',
    acceptance: '到货验收与质量检验',
    refunds: '退货申请、审核、出库与库存回退',
    inventory: '库存批次管理与效期预警',
    settlement: '结算单生成与对账确认',
    invoice: '发票登记与签收审核',
    users: '用户信息管理与角色分配',
    roles: '角色权限管理与菜单分配',
  };

  const navGroups = [
    { title: '总览', items: navItems.filter((item) => ['dashboard'].includes(item.id)) },
    {
      title: '主数据',
      items: navItems.filter((item) => ['hospitals', 'suppliers', 'products', 'licenses'].includes(item.id)),
    },
    {
      title: '业务流转',
      items: navItems.filter((item) => ['orders', 'acceptance', 'refunds', 'inventory', 'settlement', 'invoice'].includes(item.id)),
    },
    { title: '系统', items: navItems.filter((item) => ['users', 'roles'].includes(item.id)) },
  ];

  const activeNavItem = navItems.find((item) => item.id === activeNav) ?? navItems[0];

  useEffect(() => {
    if (!isMobile) {
      setMobileNavOpen(false);
    }
  }, [isMobile]);

  useEffect(() => {
    if (!authUser) return;
    refreshAuth()
      .then((user) => {
        if (user) setAuthUser(user);
      })
      .catch(() => {
        logout().finally(() => setAuthUser(null));
      });
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'urgent': return 'text-destructive';
      case 'warning': return 'text-[#f59e0b]';
      case 'normal': return 'text-[#10b981]';
      case 'pending': return 'text-muted-foreground';
      case 'confirmed': return 'text-[#3b82f6]';
      case 'shipped': return 'text-[#8b5cf6]';
      case 'delivered': return 'text-[#10b981]';
      default: return 'text-foreground';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'urgent': return 'bg-destructive/10';
      case 'warning': return 'bg-[#f59e0b]/10';
      case 'normal': return 'bg-[#10b981]/10';
      case 'pending': return 'bg-muted';
      case 'confirmed': return 'bg-[#3b82f6]/10';
      case 'shipped': return 'bg-[#8b5cf6]/10';
      case 'delivered': return 'bg-[#10b981]/10';
      default: return 'bg-muted';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '待确认';
      case 'confirmed': return '已确认';
      case 'shipped': return '已发货';
      case 'delivered': return '已送达';
      case 'active': return '正常';
      case 'inactive': return '停用';
      case 'warning': return '预警';
      case 'urgent': return '紧急';
      case 'normal': return '正常';
      case 'expired': return '已过期';
      default: return status;
    }
  };

  const renderActionBar = (page: string) => {
    let buttons = [
      { label: '查询', icon: Search },
      { label: '新增', icon: Plus },
      { label: '修改', icon: Edit },
      { label: '删除', icon: Trash2 },
      { label: '导出', icon: Download },
      { label: '导入', icon: Upload },
    ];

    if (page === 'products') {
      buttons = [...buttons, { label: '同步招采子平台', icon: RefreshCw }];
    } else if (page === 'orders') {
      buttons = [...buttons, { label: '确认', icon: CheckCircle2 }, { label: '订单转配送', icon: Truck }];
    }

    const handleButtonClick = (label: string) => {
      if (page === 'hospitals') {
        if (label === '查询') {
          setShowSearchDialog(true);
        } else if (label === '新增') {
          setHospitalFormData({
            code: '',
            name: '',
            level: '',
            city: '',
            contact: '',
            phone: '',
            status: 'active',
          });
          setShowAddHospitalDialog(true);
        } else if (label === '修改') {
          if (selectedHospitals.length === 1) {
            const hospital = hospitals.find((h) => h.id === selectedHospitals[0]);
            if (hospital) {
              setHospitalFormData({
                code: hospital.code,
                name: hospital.name,
                level: hospital.level,
                city: hospital.city,
                contact: hospital.contact,
                phone: hospital.phone,
                status: hospital.status,
              });
              setShowEditHospitalDialog(true);
            }
          }
        } else if (label === '删除') {
          if (selectedHospitals.length > 0) {
            confirm({
              title: '删除医院信息',
              description: `确定要删除选中的 ${selectedHospitals.length} 条医院信息吗？`,
              confirmText: '删除',
              destructive: true,
            }).then((confirmed) => {
              if (!confirmed) return;
              deleteHospitalsMutation.mutate(selectedHospitals, {
                onSuccess: () => {
                  setSelectedHospitals([]);
                  notify.success('医院信息已删除');
                },
                onError: (error) => {
                  notify.error(error instanceof Error ? error.message : '医院信息删除失败');
                },
              });
            });
          }
        } else if (label === '导出') {
          const dataToExport = selectedHospitals.length > 0
            ? hospitals.filter((h) => selectedHospitals.includes(h.id))
            : hospitals;
          console.log('导出医院数据:', dataToExport);
          notify.success(`已导出 ${dataToExport.length} 条医院信息`);
        }
      }
    };

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {buttons.map((btn, index) => {
          const isDisabled = page === 'hospitals' &&
            ((btn.label === '修改' && selectedHospitals.length !== 1) ||
             (btn.label === '删除' && selectedHospitals.length === 0));

          if (btn.label === '导入' && page === 'hospitals') {
            return (
              <div key={`${btn.label}-${index}`} className="relative">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowImportMenu(!showImportMenu)}
                  className="rounded-lg"
                >
                  <btn.icon className="size-4" />
                  {btn.label}
                  <ChevronDown className="size-3" />
                </Button>
                {showImportMenu && (
                  <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-lg shadow-lg min-w-[180px] z-10">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        console.log('下载导入模板');
                        notify.success('下载导入模板');
                        setShowImportMenu(false);
                      }}
                      className="w-full justify-start rounded-none"
                    >
                      下载导入模板
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => {
                        console.log('上传导入信息表');
                        notify.success('上传导入信息表');
                        setShowImportMenu(false);
                      }}
                      className="w-full justify-start rounded-none border-t border-border"
                    >
                      上传导入信息表
                    </Button>
                  </div>
                )}
              </div>
            );
          }

          return (
            <Button
              type="button"
              variant="outline"
              key={`${btn.label}-${index}`}
              onClick={() => handleButtonClick(btn.label)}
              disabled={isDisabled}
              className="rounded-lg"
            >
              <btn.icon className="size-4" />
              {btn.label}
            </Button>
          );
        })}
      </div>
    );
  };

  const renderHospitalsPage = () => {
    const filteredHospitals = searchHospitalName
      ? hospitals.filter((h) => h.name.includes(searchHospitalName))
      : hospitals;

    return (
      <div className="space-y-4">
        <div className="p-4 border border-border rounded-lg bg-background">
          {renderActionBar('hospitals')}
        </div>
        <div className="border border-border rounded-lg bg-background overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-3 text-left">
                    <input
                      type="checkbox"
                      checked={selectedHospitals.length === filteredHospitals.length && filteredHospitals.length > 0}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedHospitals(filteredHospitals.map((h) => h.id));
                        } else {
                          setSelectedHospitals([]);
                        }
                      }}
                      className="size-4 rounded border-border"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">医院编号</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">医院名称</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">医院等级</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">所在城市</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">联系人</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">联系电话</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">合作日期</th>
                  <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">状态</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filteredHospitals.map((hospital) => (
                  <tr key={hospital.id} className="hover:bg-accent/50 transition-colors">
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedHospitals.includes(hospital.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedHospitals([...selectedHospitals, hospital.id]);
                          } else {
                            setSelectedHospitals(selectedHospitals.filter((id) => id !== hospital.id));
                          }
                        }}
                        className="size-4 rounded border-border"
                      />
                    </td>
                    <td className="px-4 py-3 text-sm">{hospital.code}</td>
                    <td className="px-4 py-3 font-medium">{hospital.name}</td>
                    <td className="px-4 py-3 text-sm">{hospital.level}</td>
                    <td className="px-4 py-3 text-sm">{hospital.city}</td>
                    <td className="px-4 py-3 text-sm">{hospital.contact}</td>
                    <td className="px-4 py-3 text-sm">{hospital.phone}</td>
                    <td className="px-4 py-3 text-sm">{hospital.cooperationDate}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-center">
                        <div className={`px-3 py-1 rounded-full text-xs ${getStatusBg(hospital.status)} ${getStatusColor(hospital.status)}`}>
                          {getStatusText(hospital.status)}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredHospitals.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">
                      {hospitalsQuery.isFetching ? '正在加载医院数据...' : '暂无医院数据'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Search Dialog */}
        {showSearchDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg shadow-lg w-full max-w-md">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between">
                <h3 className="font-semibold">医院查询</h3>
                <button
                  onClick={() => setShowSearchDialog(false)}
                  className="p-1 hover:bg-accent rounded transition-colors"
                >
                  <XCircle className="size-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div>
                  <label className="block text-sm mb-2">医院名称</label>
                  <input
                    type="text"
                    placeholder="请输入医院名称"
                    value={searchHospitalName}
                    onChange={(e) => setSearchHospitalName(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
                <button
                  onClick={() => {
                    setSearchHospitalName('');
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

        {/* Add Hospital Dialog */}
        {showAddHospitalDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
                <h3 className="font-semibold">新增医院</h3>
                <button
                  onClick={() => setShowAddHospitalDialog(false)}
                  className="p-1 hover:bg-accent rounded transition-colors"
                >
                  <XCircle className="size-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm mb-2">
                      医院编号 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="请输入医院机构代码"
                      value={hospitalFormData.code}
                      onChange={(e) => setHospitalFormData({ ...hospitalFormData, code: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      医院名称 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      list="hospital-names"
                      placeholder="请选择或输入医院名称"
                      value={hospitalFormData.name}
                      onChange={(e) => setHospitalFormData({ ...hospitalFormData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                    <datalist id="hospital-names">
                      <option value="浙江省人民医院" />
                      <option value="浙江大学医学院附属第一医院" />
                      <option value="宁波市第一医院" />
                      <option value="温州医科大学附属第一医院" />
                      <option value="嘉兴市第一医院" />
                      <option value="湖州市中心医院" />
                    </datalist>
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      医院等级 <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={hospitalFormData.level}
                      onChange={(e) => setHospitalFormData({ ...hospitalFormData, level: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">请选择医院等级</option>
                      <option value="三级甲等">三级甲等</option>
                      <option value="三级乙等">三级乙等</option>
                      <option value="二级甲等">二级甲等</option>
                      <option value="二级乙等">二级乙等</option>
                      <option value="一级甲等">一级甲等</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      所在城市 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="请输入所在城市"
                      value={hospitalFormData.city}
                      onChange={(e) => setHospitalFormData({ ...hospitalFormData, city: e.target.value })}
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
                      value={hospitalFormData.contact}
                      onChange={(e) => setHospitalFormData({ ...hospitalFormData, contact: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      联系电话 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="请输入联系电话"
                      value={hospitalFormData.phone}
                      onChange={(e) => setHospitalFormData({ ...hospitalFormData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm mb-2">
                      状态 <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={hospitalFormData.status}
                      onChange={(e) => setHospitalFormData({ ...hospitalFormData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="active">正常</option>
                      <option value="inactive">停用</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 sticky bottom-0 bg-background">
                <button
                  onClick={() => setShowAddHospitalDialog(false)}
                  className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() =>
                    createHospitalMutation.mutate(toHospitalPayload(), {
                      onSuccess: () => {
                        notify.success('医院信息已保存');
                        setShowAddHospitalDialog(false);
                      },
                      onError: (error) => {
                        notify.error(error instanceof Error ? error.message : '医院信息保存失败');
                      },
                    })
                  }
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Hospital Dialog */}
        {showEditHospitalDialog && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
              <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
                <h3 className="font-semibold">编辑医院</h3>
                <button
                  onClick={() => setShowEditHospitalDialog(false)}
                  className="p-1 hover:bg-accent rounded transition-colors"
                >
                  <XCircle className="size-5" />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm mb-2">
                      医院名称 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="请输入医院名称"
                      value={hospitalFormData.name}
                      onChange={(e) => setHospitalFormData({ ...hospitalFormData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      医院等级 <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={hospitalFormData.level}
                      onChange={(e) => setHospitalFormData({ ...hospitalFormData, level: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">请选择医院等级</option>
                      <option value="三级甲等">三级甲等</option>
                      <option value="三级乙等">三级乙等</option>
                      <option value="二级甲等">二级甲等</option>
                      <option value="二级乙等">二级乙等</option>
                      <option value="一级甲等">一级甲等</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      所在城市 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="请输入所在城市"
                      value={hospitalFormData.city}
                      onChange={(e) => setHospitalFormData({ ...hospitalFormData, city: e.target.value })}
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
                      value={hospitalFormData.contact}
                      onChange={(e) => setHospitalFormData({ ...hospitalFormData, contact: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      联系电话 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="请输入联系电话"
                      value={hospitalFormData.phone}
                      onChange={(e) => setHospitalFormData({ ...hospitalFormData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      状态 <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={hospitalFormData.status}
                      onChange={(e) => setHospitalFormData({ ...hospitalFormData, status: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="active">正常</option>
                      <option value="inactive">停用</option>
                    </select>
                  </div>
                </div>
              </div>
              <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 sticky bottom-0 bg-background">
                <button
                  onClick={() => setShowEditHospitalDialog(false)}
                  className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => {
                    if (selectedHospitals.length !== 1) return;
                    updateHospitalMutation.mutate(
                      { id: selectedHospitals[0], payload: toHospitalPayload() },
                      {
                        onSuccess: () => {
                          notify.success('医院信息已更新');
                          setShowEditHospitalDialog(false);
                        },
                        onError: (error) => {
                          notify.error(error instanceof Error ? error.message : '医院信息更新失败');
                        },
                      },
                    );
                  }}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
                >
                  保存
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    );
  };

  const renderSuppliersPage = () => <SupplierManagement />;

  const renderProductsPage = () => <ProductManagement />;

  const renderOrdersPage = () => <PurchaseManagement />;

  const renderLicensesPage = () => <LicenseManagement />;

  const renderAcceptancePage = () => <AcceptanceManagement />;
  const renderRefundsPage = () => <RefundManagement />;
  const renderInventoryPage = () => <InventoryManagement />;
  const renderSettlementPage = () => <SettlementManagement />;
  const renderInvoicePage = () => <InvoiceManagement />;
  const renderUsersPage = () => <UserManagement />;
  const renderRolesPage = () => <RoleManagement />;

  if (!authUser) {
    return (
      <div className="min-h-screen overflow-hidden bg-[#f6f8fb] text-[#111827]">
        <div className="grid min-h-screen lg:grid-cols-[1.08fr_0.92fr]">
          <section className="relative hidden overflow-hidden bg-[#07111f] px-12 py-10 text-white lg:flex lg:flex-col lg:justify-between xl:px-16">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_18%,rgba(45,212,191,0.22),transparent_28%),linear-gradient(135deg,rgba(14,165,233,0.16),transparent_42%)]" />
            <div className="absolute right-10 top-12 h-72 w-72 rotate-6 rounded-[2rem] border border-white/10 bg-white/[0.03]" />
            <div className="absolute bottom-14 left-12 h-52 w-52 -rotate-12 rounded-[2rem] border border-cyan-200/10 bg-cyan-200/[0.04]" />

            <div className="relative z-10 flex items-center gap-3">
              <div className="flex size-11 items-center justify-center rounded-xl bg-white text-[#07111f] shadow-lg shadow-cyan-950/30">
                <Shield className="size-5" />
              </div>
              <div>
                <div className="text-sm font-medium uppercase tracking-[0.28em] text-cyan-100/80">SPD Portal</div>
                <div className="text-lg font-semibold">供应商协同平台</div>
              </div>
            </div>

            <div className="relative z-10 max-w-2xl">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2 text-sm text-cyan-50/90 shadow-xl shadow-black/10 backdrop-blur">
                <CheckCircle2 className="size-4 text-cyan-200" />
                医院供应链全流程在线协同
              </div>
              <h1 className="max-w-xl text-4xl font-semibold leading-tight tracking-normal xl:text-5xl">
                统一管理订单、资质、验收与结算
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-200/78">
                以供应商业务视角整合采购、配送、库存、发票和对账数据，让关键节点更清晰，处理效率更稳定。
              </p>

              <div className="mt-10 grid max-w-xl grid-cols-3 gap-3">
                {[
                  { label: '待处理订单', value: '128', icon: ClipboardList },
                  { label: '资质预警', value: '16', icon: FileCheck },
                  { label: '本月履约率', value: '96%', icon: TrendingUp },
                ].map((item) => {
                  const Icon = item.icon;
                  return (
                    <div key={item.label} className="rounded-lg border border-white/10 bg-white/[0.06] p-4 backdrop-blur">
                      <Icon className="mb-4 size-5 text-cyan-200" />
                      <div className="text-2xl font-semibold">{item.value}</div>
                      <div className="mt-1 text-xs text-slate-300">{item.label}</div>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="relative z-10 grid grid-cols-2 gap-3 text-sm text-slate-200/80">
              <div className="flex items-center gap-2">
                <Clock className="size-4 text-cyan-200" />
                7x24 小时业务访问
              </div>
              <div className="flex items-center gap-2">
                <Building2 className="size-4 text-cyan-200" />
                多医院授权协同
              </div>
            </div>
          </section>

          <main className="flex min-h-screen items-center justify-center px-5 py-8 sm:px-8">
            <form
              className="w-full max-w-[440px] rounded-lg border border-slate-200 bg-white p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] sm:p-8"
              onSubmit={(event) => {
                event.preventDefault();
                loginMutation.mutate();
              }}
            >
              <div className="mb-8">
                <div className="mb-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="flex size-11 items-center justify-center rounded-lg bg-[#0f172a] text-white shadow-md">
                      <Shield className="size-5" />
                    </div>
                    <div>
                      <div className="text-sm text-slate-500">SPD Portal</div>
                      <div className="font-semibold text-slate-950">供应商平台</div>
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700">安全登录</span>
                </div>
                <h1 className="text-2xl font-semibold leading-tight text-slate-950">欢迎回来</h1>
                <p className="mt-2 text-sm leading-6 text-slate-500">请输入管理员账号后继续访问业务系统。</p>
              </div>

              <div className="space-y-5">
                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">用户名</span>
                  <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 transition focus-within:border-[#0f172a] focus-within:bg-white focus-within:ring-4 focus-within:ring-slate-900/8">
                    <UserCheck className="mr-2 size-4 text-slate-400" />
                    <input
                      value={loginForm.username}
                      onChange={(event) => setLoginForm((current) => ({ ...current, username: event.target.value }))}
                      className="h-11 w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                      autoComplete="username"
                      placeholder="请输入用户名"
                    />
                  </div>
                </label>

                <label className="block">
                  <span className="mb-2 block text-sm font-medium text-slate-700">密码</span>
                  <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50 px-3 transition focus-within:border-[#0f172a] focus-within:bg-white focus-within:ring-4 focus-within:ring-slate-900/8">
                    <Shield className="mr-2 size-4 text-slate-400" />
                    <input
                      type="password"
                      value={loginForm.password}
                      onChange={(event) => setLoginForm((current) => ({ ...current, password: event.target.value }))}
                      className="h-11 w-full bg-transparent text-sm text-slate-950 outline-none placeholder:text-slate-400"
                      autoComplete="current-password"
                      placeholder="请输入密码"
                    />
                  </div>
                </label>

                <Button
                  type="submit"
                  size="lg"
                  className="mt-2 h-11 w-full rounded-lg bg-[#0f172a] text-white shadow-lg shadow-slate-900/15 hover:bg-[#1e293b]"
                  disabled={loginMutation.isPending}
                >
                  {loginMutation.isPending ? '登录中...' : '登录平台'}
                  <ChevronRight className="size-4" />
                </Button>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 border-t border-slate-100 pt-5 text-xs text-slate-500">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="size-4 text-emerald-500" />
                  权限实时校验
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-cyan-600" />
                  操作全程留痕
                </div>
              </div>
            </form>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#eef3f8] text-[#172033] md:flex">
      {isMobile && mobileNavOpen && (
        <button
          type="button"
          aria-label="关闭导航"
          className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-sm md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}
      {/* Sidebar */}
      <div
        className={`${
          isMobile
            ? `fixed inset-y-0 left-0 z-40 w-72 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}`
            : sidebarCollapsed
              ? 'w-20'
              : 'w-72'
        } flex flex-col border-r border-slate-900 bg-[#0b1628] text-slate-100 shadow-2xl shadow-slate-950/20 transition-all duration-300`}
      >
        {/* Logo */}
        <div className="border-b border-white/10 px-4 py-4">
          <div className="flex items-center gap-3">
          <div className="size-10 rounded-lg bg-cyan-400 text-slate-950 flex items-center justify-center shrink-0 shadow-lg shadow-cyan-500/20">
            <Package className="size-5" />
          </div>
          {(!sidebarCollapsed || isMobile) && (
            <div className="min-w-0">
              <div className="truncate font-semibold tracking-wide text-white">SPD供应商平台</div>
              <div className="text-xs text-slate-400">医疗器械采购协同</div>
            </div>
          )}
          </div>
          {(!sidebarCollapsed || isMobile) && (
            <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.04] p-3">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>当前工作流</span>
                <span className="rounded bg-emerald-400/15 px-2 py-0.5 text-emerald-200">运行中</span>
              </div>
              <div className="mt-2 text-sm font-medium text-white">计划转订单并配送</div>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {(!sidebarCollapsed || isMobile) && (
                <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                  {group.title}
                </div>
              )}
              {group.items.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveNav(item.id);
                    if (isMobile) {
                      setMobileNavOpen(false);
                    }
                  }}
                  className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${
                    activeNav === item.id
                      ? 'bg-white text-slate-950 shadow-lg shadow-slate-950/20'
                      : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'
                  }`}
                >
                  <span
                    className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${
                      activeNav === item.id ? 'bg-cyan-100 text-cyan-700' : 'bg-white/[0.06] text-slate-400 group-hover:text-cyan-200'
                    }`}
                  >
                    <item.icon className="size-4" />
                  </span>
                  {(!sidebarCollapsed || isMobile) && (
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium">{item.label}</span>
                    </span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        {/* Collapse Toggle */}
        <div className="hidden border-t border-white/10 p-3 md:block">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center px-3 py-2.5 rounded-lg text-slate-300 hover:bg-white/[0.07] hover:text-white transition-colors"
          >
            <Menu className="size-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="sticky top-0 z-20 flex min-h-20 flex-wrap items-start justify-between gap-3 border-b border-white/70 bg-white/90 px-4 py-3 shadow-sm shadow-slate-200/70 backdrop-blur md:h-20 md:flex-nowrap md:items-center md:px-6 md:py-0">
          <div className="flex min-w-0 items-start gap-3">
            <button
              type="button"
              aria-label="打开导航"
              className="rounded-lg p-2 transition-colors hover:bg-slate-100 md:hidden"
              onClick={() => setMobileNavOpen(true)}
            >
              <Menu className="size-5 text-slate-600" />
            </button>
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                <span>SPD</span>
                <ChevronRight className="size-3" />
                <span>{activeNavItem.label}</span>
              </div>
              <h1 className="text-xl font-semibold leading-tight text-slate-950">
              {activeNavItem.label}
              </h1>
              <p className="hidden text-sm text-slate-500 md:block">
              {navDescriptions[activeNav]}
              </p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 md:gap-4">
            <button
              type="button"
              onClick={() => setShowAiSearchDialog(true)}
              className="relative hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm transition-colors hover:bg-slate-50 md:flex"
            >
              <Search className="size-4" />
              <span>AI搜索</span>
            </button>
            <button className="relative rounded-lg border border-slate-200 bg-white p-2 shadow-sm transition-colors hover:bg-slate-50">
              <Bell className="size-5 text-slate-500" />
              <span className="absolute right-1.5 top-1.5 size-2 rounded-full bg-rose-500 ring-2 ring-white"></span>
            </button>
            <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white px-2 py-1.5 shadow-sm">
              <div className="hidden text-right sm:block">
                <div className="text-sm font-semibold text-slate-900">{authUser.username}</div>
                <div className="text-xs text-slate-500">{authUser.role}</div>
              </div>
              <div className="size-9 rounded-lg bg-slate-900 text-white flex items-center justify-center text-sm font-semibold">
                {authUser.username.slice(0, 2).toUpperCase()}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="border-slate-200"
                onClick={() => {
                  logout();
                  setAuthUser(null);
                  queryClient.clear();
                }}
              >
                退出
              </Button>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_32%),linear-gradient(180deg,#f7fafc_0%,#eef3f8_100%)] p-4 md:p-6">
          {activeNav === 'dashboard' && (
            <>
          {/* Key Metrics */}
          <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="p-5 border border-border rounded-lg bg-background hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="size-10 rounded-lg bg-[#3b82f6]/10 flex items-center justify-center">
                  <ShoppingCart className="size-5 text-[#3b82f6]" />
                </div>
                <div className="flex items-center gap-1 text-xs text-[#10b981]">
                  <TrendingUp className="size-3" />
                  <span>12.5%</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-medium">328</div>
                <div className="text-sm text-muted-foreground">本月订单</div>
              </div>
            </div>

            <div className="p-5 border border-border rounded-lg bg-background hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="size-10 rounded-lg bg-[#10b981]/10 flex items-center justify-center">
                  <CheckCircle2 className="size-5 text-[#10b981]" />
                </div>
                <div className="flex items-center gap-1 text-xs text-[#10b981]">
                  <TrendingUp className="size-3" />
                  <span>8.2%</span>
                </div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-medium">¥4.78M</div>
                <div className="text-sm text-muted-foreground">本月交易额</div>
              </div>
            </div>

            <div className="p-5 border border-border rounded-lg bg-background hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="size-10 rounded-lg bg-[#f59e0b]/10 flex items-center justify-center">
                  <AlertTriangle className="size-5 text-[#f59e0b]" />
                </div>
                <div className="text-xs text-muted-foreground">需关注</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-medium">7</div>
                <div className="text-sm text-muted-foreground">效期预警</div>
              </div>
            </div>

            <div className="p-5 border border-border rounded-lg bg-background hover:shadow-sm transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="size-10 rounded-lg bg-[#8b5cf6]/10 flex items-center justify-center">
                  <Clock className="size-5 text-[#8b5cf6]" />
                </div>
                <div className="text-xs text-muted-foreground">待处理</div>
              </div>
              <div className="space-y-1">
                <div className="text-3xl font-medium">12</div>
                <div className="text-sm text-muted-foreground">待确认订单</div>
              </div>
            </div>
          </div>

          <div className="mb-6 rounded-lg border border-border bg-background p-5">
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <h3>履约单据关系</h3>
                <p className="mt-1 text-sm text-muted-foreground">{workflowRelation}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-2 xl:grid-cols-4">
              {procurementWorkflow.map((item, index) => (
                <div key={item.code} className="rounded-lg border border-border p-4">
                  <div className="mb-2 flex items-center gap-2">
                    <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                      {index + 1}
                    </span>
                    <span className="font-medium">{item.name}</span>
                  </div>
                  <p className="mb-3 text-sm text-muted-foreground">{item.purpose}</p>
                  <div className="flex flex-wrap gap-1">
                    {item.statuses.slice(0, 4).map((status) => (
                      <span key={status} className="rounded bg-muted px-2 py-1 text-xs text-muted-foreground">
                        {status}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Charts Section */}
          <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-3">
            <div className="border border-border rounded-lg bg-background p-6 xl:col-span-2">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3>订单趋势</h3>
                  <p className="text-sm text-muted-foreground mt-1">近6个月订单量与金额走势</p>
                </div>
                <div className="flex gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="size-3 rounded-sm bg-[var(--chart-1)]"></div>
                    <span className="text-muted-foreground">订单数</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="size-3 rounded-sm bg-[var(--chart-2)]"></div>
                    <span className="text-muted-foreground">交易额(千元)</span>
                  </div>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={orderTrendData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
                  <YAxis stroke="var(--muted-foreground)" style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                  />
                  <Line key="orders-line" type="monotone" dataKey="orders" stroke="var(--chart-1)" strokeWidth={2} dot={{ r: 4 }} />
                  <Line
                    key="amount-line"
                    type="monotone"
                    dataKey="amount"
                    stroke="var(--chart-2)"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className="p-6 border border-border rounded-lg bg-background">
              <div className="mb-6">
                <h3>品类分布</h3>
                <p className="text-sm text-muted-foreground mt-1">本月采购品类占比</p>
              </div>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'var(--popover)',
                      border: '1px solid var(--border)',
                      borderRadius: '8px',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-2 mt-4">
                {categoryData.map((item, index) => (
                  <div key={`category-${item.name}-${index}`} className="flex items-center justify-between text-sm">
                    <div className="flex items-center gap-2">
                      <div className="size-3 rounded-sm" style={{ backgroundColor: item.color }}></div>
                      <span>{item.name}</span>
                    </div>
                    <span className="text-muted-foreground">{item.value}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Tables Section */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Recent Orders */}
            <div className="border border-border rounded-lg bg-background overflow-hidden">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div>
                  <h3>最近订单</h3>
                  <p className="text-sm text-muted-foreground mt-1">最新的采购订单动态</p>
                </div>
                <button className="text-sm text-primary hover:underline flex items-center gap-1">
                  查看全部
                  <ChevronRight className="size-4" />
                </button>
              </div>
              <div className="divide-y divide-border">
                {recentOrders.map((order) => (
                  <div key={order.id} className="p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <div className="font-medium mb-1">{order.id}</div>
                        <div className="text-sm text-muted-foreground">{order.hospital}</div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs ${getStatusBg(order.status)} ${getStatusColor(order.status)}`}>
                        {getStatusText(order.status)}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{order.items} 项商品</span>
                      <span className="font-medium">¥{order.amount.toLocaleString()}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* License Expiry Alerts */}
            <div className="border border-border rounded-lg bg-background overflow-hidden">
              <div className="p-5 border-b border-border flex items-center justify-between">
                <div>
                  <h3>证照到期提醒</h3>
                  <p className="text-sm text-muted-foreground mt-1">即将到期的证照清单</p>
                </div>
                <button className="text-sm text-primary hover:underline flex items-center gap-1">
                  查看全部
                  <ChevronRight className="size-4" />
                </button>
              </div>
              <div className="divide-y divide-border">
                {expiringLicenses.map((license) => (
                  <div key={license.id} className="p-4 hover:bg-accent/50 transition-colors">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="font-medium mb-1">{license.product}</div>
                        <div className="text-sm text-muted-foreground">{license.type}</div>
                      </div>
                      <div className={`px-2 py-1 rounded text-xs ${getStatusBg(license.status)} ${getStatusColor(license.status)}`}>
                        {license.days}天
                      </div>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      到期日期: {license.expiry}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Inventory Alerts */}
          <div className="mt-6 border border-border rounded-lg bg-background overflow-hidden">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div>
                <h3>库存效期预警</h3>
                <p className="text-sm text-muted-foreground mt-1">近效期商品批次明细</p>
              </div>
              <button className="text-sm text-primary hover:underline flex items-center gap-1">
                查看全部
                <ChevronRight className="size-4" />
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">商品名称</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">批号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">有效期</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">库存数量</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {inventoryAlerts.map((item) => (
                    <tr key={item.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="font-medium">{item.product}</div>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{item.batch}</td>
                      <td className="px-4 py-3 text-sm">{item.expiry}</td>
                      <td className="px-4 py-3 text-right font-medium">{item.qty.toLocaleString()}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <div className={`px-3 py-1 rounded-full text-xs inline-flex items-center gap-1.5 ${getStatusBg(item.status)} ${getStatusColor(item.status)}`}>
                            {item.status === 'urgent' && <XCircle className="size-3" />}
                            {item.status === 'warning' && <AlertTriangle className="size-3" />}
                            {item.status === 'normal' && <CheckCircle2 className="size-3" />}
                            {item.status === 'urgent' ? '紧急' : item.status === 'warning' ? '预警' : '正常'}
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          </>
          )}

          {activeNav === 'hospitals' && renderHospitalsPage()}
          {activeNav === 'suppliers' && renderSuppliersPage()}
          {activeNav === 'products' && renderProductsPage()}
          {activeNav === 'orders' && renderOrdersPage()}
          {activeNav === 'licenses' && renderLicensesPage()}
          {activeNav === 'acceptance' && renderAcceptancePage()}
          {activeNav === 'refunds' && renderRefundsPage()}
          {activeNav === 'inventory' && renderInventoryPage()}
          {activeNav === 'settlement' && renderSettlementPage()}
          {activeNav === 'invoice' && renderInvoicePage()}
          {activeNav === 'users' && renderUsersPage()}
          {activeNav === 'roles' && renderRolesPage()}
        </main>
        {showAiSearchDialog && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
            <div className="flex max-h-[86vh] w-[min(760px,96vw)] flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-xl">
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
                <div>
                  <h3 className="font-semibold text-slate-950">AI搜索</h3>
                  <p className="mt-1 text-sm text-slate-500">调用服务器本地AI大模型，辅助检索单据、商品、证照和业务流程。</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowAiSearchDialog(false)}
                  className="shrink-0 rounded-lg border border-slate-200 p-2 transition-colors hover:bg-slate-50"
                  title="关闭"
                >
                  <X className="size-4 text-slate-500" />
                </button>
              </div>
              <div className="space-y-4 overflow-auto p-5">
                <textarea
                  value={aiSearchQuery}
                  onChange={(event) => setAiSearchQuery(event.target.value)}
                  placeholder="例如：帮我找最近的采购订单、某个商品库存、即将过期的证照..."
                  className="min-h-28 w-full resize-y rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-ring"
                />
                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-slate-500">模型服务：服务器本地大模型</div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAiSearchQuery('');
                        setAiSearchAnswer('');
                      }}
                      className="rounded-lg border border-slate-200 px-4 py-2 text-sm transition-colors hover:bg-slate-50"
                    >
                      重置
                    </button>
                    <button
                      type="button"
                      disabled={aiSearchMutation.isPending}
                      onClick={handleAiSearch}
                      className="flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Search className="size-4" />
                      {aiSearchMutation.isPending ? '搜索中...' : '开始搜索'}
                    </button>
                  </div>
                </div>
                {(aiSearchMutation.isPending || aiSearchAnswer) && (
                  <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                    <div className="mb-2 text-sm font-medium text-slate-900">AI回答</div>
                    <div className="whitespace-pre-wrap text-sm leading-6 text-slate-700">
                      {aiSearchMutation.isPending ? '本地AI大模型正在思考...' : aiSearchAnswer}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <FeedbackProvider>
      <AppContent />
    </FeedbackProvider>
  );
}
