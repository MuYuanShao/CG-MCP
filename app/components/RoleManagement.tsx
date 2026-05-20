import { useState } from 'react';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  FileCheck,
  Copy,
  XCircle,
  ChevronRight,
  ChevronDown,
} from 'lucide-react';
import { useFeedback } from './AppFeedback';

interface Role {
  id: number;
  roleName: string;
  roleCode: string;
  dataScope: 'all' | 'tenant' | 'dept' | 'self';
  status: 'active' | 'disabled';
  description: string;
}

interface MenuNode {
  id: string;
  name: string;
  children?: MenuNode[];
  buttons?: string[];
}

const mockRoles: Role[] = [
  {
    id: 1,
    roleName: '采购员',
    roleCode: 'ROLE_BUYER',
    dataScope: 'dept',
    status: 'active',
    description: '负责采购业务',
  },
  {
    id: 2,
    roleName: '销售员',
    roleCode: 'ROLE_SELLER',
    dataScope: 'tenant',
    status: 'active',
    description: '负责销售业务',
  },
  {
    id: 3,
    roleName: '仓管员',
    roleCode: 'ROLE_WAREHOUSE',
    dataScope: 'self',
    status: 'active',
    description: '负责仓储管理',
  },
  {
    id: 4,
    roleName: '采购经理',
    roleCode: 'ROLE_BUYER_MANAGER',
    dataScope: 'dept',
    status: 'active',
    description: '负责采购部门管理',
  },
  {
    id: 5,
    roleName: '系统管理员',
    roleCode: 'ROLE_ADMIN',
    dataScope: 'all',
    status: 'active',
    description: '系统管理员，拥有所有权限',
  },
];

const mockMenuTree: MenuNode[] = [
  {
    id: 'system',
    name: '系统管理',
    children: [
      {
        id: 'user',
        name: '用户管理',
        buttons: ['新增用户', '编辑用户', '删除用户', '重置密码'],
      },
      {
        id: 'role',
        name: '角色管理',
        buttons: ['新增角色', '编辑角色', '删除角色', '分配菜单'],
      },
    ],
  },
  {
    id: 'purchase',
    name: '采购管理',
    children: [
      {
        id: 'products',
        name: '商品目录',
        buttons: ['新增商品', '编辑商品', '删除商品', '导入', '导出'],
      },
    ],
  },
  {
    id: 'inventory',
    name: '库存管理',
    children: [
      {
        id: 'stock',
        name: '库存台账',
        buttons: ['查看明细', '查看批次', '查看流水', '导出'],
      },
      {
        id: 'check',
        name: '库存盘点',
        buttons: ['新建盘点', '开始盘点', '确认盘点', '导出'],
      },
    ],
  },
];

export default function RoleManagement() {
  const { notify } = useFeedback();
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [expandedMenus, setExpandedMenus] = useState<string[]>(['system', 'purchase', 'inventory']);
  const [selectedMenus, setSelectedMenus] = useState<string[]>([]);
  const [formData, setFormData] = useState({
    roleName: '',
    roleCode: '',
    dataScope: 'tenant' as 'all' | 'tenant' | 'dept' | 'self',
    description: '',
  });

  const getDataScopeColor = (scope: string) => {
    switch (scope) {
      case 'all':
        return 'text-[#8b5cf6] bg-[#8b5cf6]/10';
      case 'tenant':
        return 'text-[#3b82f6] bg-[#3b82f6]/10';
      case 'dept':
        return 'text-[#10b981] bg-[#10b981]/10';
      case 'self':
        return 'text-[#f59e0b] bg-[#f59e0b]/10';
      default:
        return 'text-foreground bg-muted';
    }
  };

  const getDataScopeText = (scope: string) => {
    switch (scope) {
      case 'all':
        return '全部数据';
      case 'tenant':
        return '本供应商';
      case 'dept':
        return '本部门';
      case 'self':
        return '本人';
      default:
        return scope;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-[#10b981] bg-[#10b981]/10';
      case 'disabled':
        return 'text-muted-foreground bg-muted';
      default:
        return 'text-foreground bg-muted';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active':
        return '启用';
      case 'disabled':
        return '禁用';
      default:
        return status;
    }
  };

  const handleSelectAll = () => {
    if (selectedRows.length === mockRoles.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(mockRoles.map((r) => r.id));
    }
  };

  const handleSelectRow = (id: number) => {
    if (selectedRows.includes(id)) {
      setSelectedRows(selectedRows.filter((rowId) => rowId !== id));
    } else {
      setSelectedRows([...selectedRows, id]);
    }
  };

  const handleOpenDialog = (mode: 'add' | 'edit') => {
    setDialogMode(mode);
    if (mode === 'edit' && selectedRows.length === 1) {
      const role = mockRoles.find((r) => r.id === selectedRows[0]);
      if (role) {
        setFormData({
          roleName: role.roleName,
          roleCode: role.roleCode,
          dataScope: role.dataScope,
          description: role.description,
        });
      }
    } else {
      setFormData({
        roleName: '',
        roleCode: '',
        dataScope: 'tenant',
        description: '',
      });
      setSelectedMenus([]);
    }
    setShowDialog(true);
  };

  const toggleMenu = (menuId: string) => {
    if (expandedMenus.includes(menuId)) {
      setExpandedMenus(expandedMenus.filter((id) => id !== menuId));
    } else {
      setExpandedMenus([...expandedMenus, menuId]);
    }
  };

  const toggleMenuSelection = (menuId: string) => {
    if (selectedMenus.includes(menuId)) {
      setSelectedMenus(selectedMenus.filter((id) => id !== menuId));
    } else {
      setSelectedMenus([...selectedMenus, menuId]);
    }
  };

  const renderMenuTree = (nodes: MenuNode[], level: number = 0) => {
    return nodes.map((node) => {
      const isExpanded = expandedMenus.includes(node.id);
      const isSelected = selectedMenus.includes(node.id);
      const hasChildren = node.children && node.children.length > 0;

      return (
        <div key={node.id} style={{ marginLeft: `${level * 20}px` }}>
          <div className="flex items-center gap-2 py-1 hover:bg-accent/50 rounded px-2">
            {hasChildren ? (
              <button onClick={() => toggleMenu(node.id)} className="p-0.5">
                {isExpanded ? (
                  <ChevronDown className="size-4 text-muted-foreground" />
                ) : (
                  <ChevronRight className="size-4 text-muted-foreground" />
                )}
              </button>
            ) : (
              <div className="w-5" />
            )}
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => toggleMenuSelection(node.id)}
              className="size-4 rounded border-border"
            />
            <span className="text-sm">{node.name}</span>
          </div>
          {isExpanded && hasChildren && renderMenuTree(node.children!, level + 1)}
        </div>
      );
    });
  };

  return (
    <div className="space-y-4">
      {/* Search Form */}
      <div className="p-5 border border-border rounded-lg bg-background">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm mb-2">角色名称</label>
            <input
              type="text"
              placeholder="请输入角色名称"
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm mb-2">数据范围</label>
            <select className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">全部</option>
              <option value="all">全部数据</option>
              <option value="tenant">本供应商</option>
              <option value="dept">本部门</option>
              <option value="self">本人</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-2">状态</label>
            <select className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">全部</option>
              <option value="active">启用</option>
              <option value="disabled">禁用</option>
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
          <button
            onClick={() => handleOpenDialog('add')}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
          >
            <Plus className="size-4" />
            新增
          </button>
          <button
            disabled={selectedRows.length !== 1}
            onClick={() => handleOpenDialog('edit')}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Edit className="size-4" />
            修改
          </button>
          <button
            disabled={selectedRows.length === 0}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Trash2 className="size-4" />
            删除
          </button>
          <button
            disabled={selectedRows.length !== 1}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FileCheck className="size-4" />
            分配菜单
          </button>
          <button
            disabled={selectedRows.length !== 1}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Copy className="size-4" />
            复制
          </button>
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
                    checked={selectedRows.length === mockRoles.length}
                    onChange={handleSelectAll}
                    className="size-4 rounded border-border"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  角色名称
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  角色编码
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  数据范围
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  状态
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  描述
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockRoles.map((role) => (
                <tr key={role.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(role.id)}
                      onChange={() => handleSelectRow(role.id)}
                      className="size-4 rounded border-border"
                    />
                  </td>
                  <td className="px-4 py-3 font-medium">{role.roleName}</td>
                  <td className="px-4 py-3 font-mono text-sm">{role.roleCode}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <span
                        className={`px-2 py-1 rounded text-xs ${getDataScopeColor(role.dataScope)}`}
                      >
                        {getDataScopeText(role.dataScope)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(role.status)}`}>
                        {getStatusText(role.status)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground">{role.description}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <div className="text-sm text-muted-foreground">每页25条 · 共{mockRoles.length}条</div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">
              首页
            </button>
            <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">
              上一页
            </button>
            <button className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">1</button>
            <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">
              下一页
            </button>
            <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">
              末页
            </button>
          </div>
        </div>
      </div>

      {/* Add/Edit Role Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
              <h3 className="font-semibold">{dialogMode === 'add' ? '新增角色' : '编辑角色'}</h3>
              <button
                onClick={() => setShowDialog(false)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Basic Info */}
              <div className="border border-border rounded-lg p-4">
                <h4 className="font-medium mb-4">基本信息</h4>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm mb-2">
                        角色名称 <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="请输入角色名称"
                        value={formData.roleName}
                        onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                    <div>
                      <label className="block text-sm mb-2">
                        角色编码 <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="请输入角色编码，如：ROLE_BUYER"
                        value={formData.roleCode}
                        onChange={(e) => setFormData({ ...formData, roleCode: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      数据范围 <span className="text-destructive">*</span>
                    </label>
                    <div className="flex gap-6 pt-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="dataScope"
                          value="all"
                          checked={formData.dataScope === 'all'}
                          onChange={(e) =>
                            setFormData({ ...formData, dataScope: e.target.value as any })
                          }
                          className="size-4"
                        />
                        <span className="text-sm">全部数据</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="dataScope"
                          value="tenant"
                          checked={formData.dataScope === 'tenant'}
                          onChange={(e) =>
                            setFormData({ ...formData, dataScope: e.target.value as any })
                          }
                          className="size-4"
                        />
                        <span className="text-sm">本供应商</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="dataScope"
                          value="dept"
                          checked={formData.dataScope === 'dept'}
                          onChange={(e) =>
                            setFormData({ ...formData, dataScope: e.target.value as any })
                          }
                          className="size-4"
                        />
                        <span className="text-sm">本部门</span>
                      </label>
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="radio"
                          name="dataScope"
                          value="self"
                          checked={formData.dataScope === 'self'}
                          onChange={(e) =>
                            setFormData({ ...formData, dataScope: e.target.value as any })
                          }
                          className="size-4"
                        />
                        <span className="text-sm">本人</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Menu Permissions */}
              <div className="border border-border rounded-lg p-4">
                <h4 className="font-medium mb-4">菜单权限</h4>
                <div className="border border-border rounded-lg p-3 max-h-80 overflow-y-auto bg-muted/20">
                  {renderMenuTree(mockMenuTree)}
                </div>
              </div>

              {/* Description */}
              <div className="border border-border rounded-lg p-4">
                <h4 className="font-medium mb-4">描述</h4>
                <textarea
                  rows={3}
                  placeholder="请输入角色描述..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                ></textarea>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 sticky bottom-0 bg-background">
              <button
                onClick={() => setShowDialog(false)}
                className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  console.log('保存角色:', formData, '选中菜单:', selectedMenus);
                  notify.error('角色保存接口尚未接入，未保存变更');
                }}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                确认保存
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
