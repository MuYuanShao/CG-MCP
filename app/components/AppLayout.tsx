import { useEffect, useState } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  FileCheck,
  Tag,
  Building2,
  ClipboardList,
  TrendingUp,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Menu,
  Bell,
  Search,
  ChevronRight,
  Users,
  Shield,
  RotateCcw,
  Truck,
  FileText,
  UserCheck,
  X,
} from 'lucide-react';
import ProductManagement from './ProductManagement';
import IntegrationManagement from './IntegrationManagement';
import LicenseManagement from './LicenseManagement';
import PurchaseManagement from './PurchaseManagement';
import AcceptanceManagement from './AcceptanceManagement';
import InventoryManagement from './InventoryManagement';
import SettlementManagement from './SettlementManagement';
import InvoiceManagement from './InvoiceManagement';
import UserManagement from './UserManagement';
import RoleManagement from './RoleManagement';
import SupplierManagement from './SupplierManagement';
import CategoryManagement from './CategoryManagement';
import RefundManagement from './RefundManagement';
import Dashboard from './Dashboard';
import HospitalManagement from './HospitalManagement';
import AiSearchDialog from './AiSearchDialog';
import { Button } from './ui/button';
import { useIsMobile } from './ui/use-mobile';
import { logout, refreshAuth, type StoredUser } from '../services/auth';

interface AppLayoutProps {
  authUser: StoredUser;
  onLogout: () => void;
}

const navItems = [
  { id: 'dashboard', label: '工作台', icon: LayoutDashboard },
  { id: 'hospitals', label: '医院管理', icon: Building2 },
  { id: 'suppliers', label: '供应商管理', icon: Truck },
  { id: 'products', label: '商品目录', icon: ClipboardList },
  { id: 'orders', label: '采购流程', icon: ShoppingCart },
  { id: 'integration', label: '采购对接', icon: RotateCcw },
  { id: 'licenses', label: '证照管理', icon: FileCheck },
  { id: 'categories', label: '分类管理', icon: Tag },
  { id: 'acceptance', label: '验收管理', icon: UserCheck },
  { id: 'refunds', label: '退货管理', icon: RotateCcw },
  { id: 'inventory', label: '库存管理', icon: Package },
  { id: 'settlement', label: '结算管理', icon: TrendingUp },
  { id: 'invoice', label: '发票管理', icon: FileText },
  { id: 'users', label: '用户管理', icon: Users },
  { id: 'roles', label: '角色管理', icon: Shield },
  { id: 'settings', label: '系统设置', icon: Shield },
];

const navDescriptions: Record<string, string> = {
  dashboard: '今日概览与待办事项',
  hospitals: '医院信息管理与供应商授权',
  suppliers: '供应商信息管理与医院授权',
  products: '商品目录维护与价格管理',
  orders: '采购计划转采购订单，订单状态统一跟踪履约进度',
  integration: 'SPD-PR 商品下发、采购数据上传与订购报表',
  licenses: '证照效期管理与合规审核',
  categories: '商品分类管理与配置',
  acceptance: '到货验收与质量检验',
  refunds: '退货申请、审核、出库与库存回退',
  inventory: '库存批次管理与效期预警',
  settlement: '结算单生成与对账确认',
  invoice: '发票登记与签收审核',
  users: '用户信息管理与角色分配',
  roles: '角色权限管理与菜单分配',
  settings: 'SPD-PR服务器IP地址、端口及对接实例配置',
};

const navGroups = [
  { title: '总览', items: navItems.filter((item) => ['dashboard'].includes(item.id)) },
  { title: '主数据', items: navItems.filter((item) => ['hospitals', 'suppliers', 'products', 'licenses', 'categories'].includes(item.id)) },
  { title: '业务流转', items: navItems.filter((item) => ['orders', 'integration', 'acceptance', 'refunds', 'inventory', 'settlement', 'invoice'].includes(item.id)) },
  { title: '系统', items: navItems.filter((item) => ['users', 'roles', 'settings'].includes(item.id)) },
];

export default function AppLayout({ authUser, onLogout }: AppLayoutProps) {
  const isMobile = useIsMobile();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [showAiSearchDialog, setShowAiSearchDialog] = useState(false);

  useEffect(() => {
    if (!isMobile) setMobileNavOpen(false);
  }, [isMobile]);

  useEffect(() => {
    refreshAuth().catch(() => onLogout());
  }, []);

  const activeNavItem = navItems.find((item) => item.id === activeNav) ?? navItems[0];
  const normalizedRole = authUser.role.toUpperCase();
  const isAdministrator = authUser.username.toLowerCase() === 'admin'
    || ['ADMIN', 'ROLE_ADMIN', 'SPD_ADMIN', 'SYSTEM_ADMIN'].includes(normalizedRole);

  const renderPage = () => {
    switch (activeNav) {
      case 'dashboard': return <Dashboard />;
      case 'hospitals': return <HospitalManagement />;
      case 'suppliers': return <SupplierManagement />;
      case 'products': return <ProductManagement canDispatch={authUser.permissions.includes('integration:manage')} />;
      case 'integration': return <IntegrationManagement permissions={authUser.permissions} />;
      case 'settings': return <IntegrationManagement permissions={authUser.permissions} settingsOnly />;
      case 'orders': return <PurchaseManagement isAdministrator={isAdministrator} />;
      case 'licenses': return <LicenseManagement />;
      case 'categories': return <CategoryManagement canManage={authUser.permissions.includes('categories:manage')} />;
      case 'acceptance': return <AcceptanceManagement />;
      case 'refunds': return <RefundManagement />;
      case 'inventory': return <InventoryManagement />;
      case 'settlement': return <SettlementManagement />;
      case 'invoice': return <InvoiceManagement />;
      case 'users': return <UserManagement />;
      case 'roles': return <RoleManagement />;
      default: return <Dashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-[#eef3f8] text-[#172033] md:flex">
      {isMobile && mobileNavOpen && (
        <button type="button" aria-label="关闭导航" className="fixed inset-0 z-30 bg-slate-950/45 backdrop-blur-sm md:hidden" onClick={() => setMobileNavOpen(false)} />
      )}
      <div className={`${isMobile ? `fixed inset-y-0 left-0 z-40 w-72 ${mobileNavOpen ? 'translate-x-0' : '-translate-x-full'}` : sidebarCollapsed ? 'w-20' : 'w-72'} flex flex-col border-r border-slate-900 bg-[#0b1628] text-slate-100 shadow-2xl shadow-slate-950/20 transition-all duration-300`}>
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
        <nav className="flex-1 space-y-5 overflow-y-auto px-3 py-4">
          {navGroups.map((group) => (
            <div key={group.title} className="space-y-1">
              {(!sidebarCollapsed || isMobile) && (
                <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">{group.title}</div>
              )}
              {group.items.filter(item => !['integration', 'settings'].includes(item.id) || authUser.permissions.includes('integration:read')).map((item) => (
                <button key={item.id} onClick={() => { setActiveNav(item.id); if (isMobile) setMobileNavOpen(false); }}
                  className={`group relative flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all ${activeNav === item.id ? 'bg-white text-slate-950 shadow-lg shadow-slate-950/20' : 'text-slate-300 hover:bg-white/[0.07] hover:text-white'}`}>
                  <span className={`flex size-8 shrink-0 items-center justify-center rounded-lg ${activeNav === item.id ? 'bg-cyan-100 text-cyan-700' : 'bg-white/[0.06] text-slate-400 group-hover:text-cyan-200'}`}>
                    <item.icon className="size-4" />
                  </span>
                  {(!sidebarCollapsed || isMobile) && (
                    <span className="min-w-0 flex-1"><span className="block truncate text-sm font-medium">{item.label}</span></span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>
        <div className="hidden border-t border-white/10 p-3 md:block">
          <button onClick={() => setSidebarCollapsed(!sidebarCollapsed)} className="w-full flex items-center justify-center px-3 py-2.5 rounded-lg text-slate-300 hover:bg-white/[0.07] hover:text-white transition-colors">
            <Menu className="size-5" />
          </button>
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="sticky top-0 z-20 flex min-h-20 flex-wrap items-start justify-between gap-3 border-b border-white/70 bg-white/90 px-4 py-3 shadow-sm shadow-slate-200/70 backdrop-blur md:h-20 md:flex-nowrap md:items-center md:px-6 md:py-0">
          <div className="flex min-w-0 items-start gap-3">
            <button type="button" aria-label="打开导航" className="rounded-lg p-2 transition-colors hover:bg-slate-100 md:hidden" onClick={() => setMobileNavOpen(true)}>
              <Menu className="size-5 text-slate-600" />
            </button>
            <div className="min-w-0">
              <div className="mb-1 flex items-center gap-2 text-xs text-slate-500">
                <span>SPD</span>
                <ChevronRight className="size-3" />
                <span>{activeNavItem!.label}</span>
              </div>
              <h1 className="text-xl font-semibold leading-tight text-slate-950">{activeNavItem!.label}</h1>
              <p className="hidden text-sm text-slate-500 md:block">{navDescriptions[activeNav]}</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2 md:gap-4">
            <button type="button" onClick={() => setShowAiSearchDialog(true)} className="relative hidden items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-500 shadow-sm transition-colors hover:bg-slate-50 md:flex">
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
              <Button type="button" variant="outline" size="sm" className="border-slate-200" onClick={() => { logout(); onLogout(); }}>
                退出
              </Button>
            </div>
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.10),transparent_32%),linear-gradient(180deg,#f7fafc_0%,#eef3f8_100%)] p-4 md:p-6">
          {renderPage()}
        </main>
      </div>
      <AiSearchDialog open={showAiSearchDialog} onClose={() => setShowAiSearchDialog(false)} />
    </div>
  );
}
