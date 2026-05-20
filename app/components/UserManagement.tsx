import { useState } from 'react';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  Download,
  Upload,
  Key,
  UserCheck,
  XCircle,
} from 'lucide-react';
import { useFeedback } from './AppFeedback';

interface User {
  id: number;
  username: string;
  realName: string;
  phone: string;
  email: string;
  deptName: string;
  roleName: string;
  status: 'active' | 'disabled' | 'locked';
}

const mockUsers: User[] = [
  {
    id: 1,
    username: 'zhangsan',
    realName: '张三',
    phone: '13800138000',
    email: 'zhangsan@example.com',
    deptName: '采购部',
    roleName: '采购员',
    status: 'active',
  },
  {
    id: 2,
    username: 'lisi',
    realName: '李四',
    phone: '13900139000',
    email: 'lisi@example.com',
    deptName: '销售部',
    roleName: '销售员',
    status: 'active',
  },
  {
    id: 3,
    username: 'wangwu',
    realName: '王五',
    phone: '13700137000',
    email: 'wangwu@example.com',
    deptName: '仓储部',
    roleName: '仓管员',
    status: 'disabled',
  },
  {
    id: 4,
    username: 'zhaoliu',
    realName: '赵六',
    phone: '13600136000',
    email: 'zhaoliu@example.com',
    deptName: '采购部',
    roleName: '采购经理',
    status: 'active',
  },
  {
    id: 5,
    username: 'sunqi',
    realName: '孙七',
    phone: '13500135000',
    email: 'sunqi@example.com',
    deptName: '销售部',
    roleName: '销售经理',
    status: 'locked',
  },
];

export default function UserManagement() {
  const { notify } = useFeedback();
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showDialog, setShowDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [dialogMode, setDialogMode] = useState<'add' | 'edit'>('add');
  const [formData, setFormData] = useState({
    username: '',
    realName: '',
    phone: '',
    email: '',
    password: '',
    deptId: '',
    roleId: '',
    remark: '',
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'text-[#10b981] bg-[#10b981]/10';
      case 'disabled':
        return 'text-muted-foreground bg-muted';
      case 'locked':
        return 'text-destructive bg-destructive/10';
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
      case 'locked':
        return '锁定';
      default:
        return status;
    }
  };

  const handleSelectAll = () => {
    if (selectedRows.length === mockUsers.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(mockUsers.map((u) => u.id));
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
      const user = mockUsers.find((u) => u.id === selectedRows[0]);
      if (user) {
        setFormData({
          username: user.username,
          realName: user.realName,
          phone: user.phone,
          email: user.email,
          password: '',
          deptId: '',
          roleId: '',
          remark: '',
        });
      }
    } else {
      setFormData({
        username: '',
        realName: '',
        phone: '',
        email: '',
        password: '',
        deptId: '',
        roleId: '',
        remark: '',
      });
    }
    setShowDialog(true);
  };

  return (
    <div className="space-y-4">
      {/* Search Form */}
      <div className="p-5 border border-border rounded-lg bg-background">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm mb-2">用户名</label>
            <input
              type="text"
              placeholder="请输入用户名"
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm mb-2">真实姓名</label>
            <input
              type="text"
              placeholder="请输入真实姓名"
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm mb-2">手机号</label>
            <input
              type="text"
              placeholder="请输入手机号"
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div>
            <label className="block text-sm mb-2">部门</label>
            <select className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">全部</option>
              <option value="1">采购部</option>
              <option value="2">销售部</option>
              <option value="3">仓储部</option>
            </select>
          </div>
          <div>
            <label className="block text-sm mb-2">状态</label>
            <select className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring">
              <option value="">全部</option>
              <option value="active">启用</option>
              <option value="disabled">禁用</option>
              <option value="locked">锁定</option>
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
            <Key className="size-4" />
            重置密码
          </button>
          <button
            disabled={selectedRows.length !== 1}
            onClick={() => setShowRoleDialog(true)}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <UserCheck className="size-4" />
            分配角色
          </button>
          <button className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2">
            <Upload className="size-4" />
            导入
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
                    checked={selectedRows.length === mockUsers.length}
                    onChange={handleSelectAll}
                    className="size-4 rounded border-border"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  用户名
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  真实姓名
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  手机号
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  邮箱
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  部门
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                  角色
                </th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                  状态
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {mockUsers.map((user) => (
                <tr key={user.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(user.id)}
                      onChange={() => handleSelectRow(user.id)}
                      className="size-4 rounded border-border"
                    />
                  </td>
                  <td className="px-4 py-3 font-mono text-sm">{user.username}</td>
                  <td className="px-4 py-3 font-medium">{user.realName}</td>
                  <td className="px-4 py-3 text-sm">{user.phone}</td>
                  <td className="px-4 py-3 text-sm">{user.email}</td>
                  <td className="px-4 py-3 text-sm">{user.deptName}</td>
                  <td className="px-4 py-3 text-sm">{user.roleName}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <span className={`px-2 py-1 rounded text-xs ${getStatusColor(user.status)}`}>
                        {getStatusText(user.status)}
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <div className="text-sm text-muted-foreground">每页25条 · 共{mockUsers.length}条</div>
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

      {/* Add/Edit User Dialog */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
              <h3 className="font-semibold">{dialogMode === 'add' ? '新增用户' : '编辑用户'}</h3>
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
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">
                      用户名 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="请输入用户名"
                      value={formData.username}
                      onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      真实姓名 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="请输入真实姓名"
                      value={formData.realName}
                      onChange={(e) => setFormData({ ...formData, realName: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      手机号 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="请输入手机号"
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">邮箱</label>
                    <input
                      type="email"
                      placeholder="请输入邮箱"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                  {dialogMode === 'add' && (
                    <div className="col-span-2">
                      <label className="block text-sm mb-2">
                        密码 <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="password"
                        placeholder="请输入密码"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Organization Info */}
              <div className="border border-border rounded-lg p-4">
                <h4 className="font-medium mb-4">组织信息</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm mb-2">
                      部门 <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={formData.deptId}
                      onChange={(e) => setFormData({ ...formData, deptId: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">请选择部门</option>
                      <option value="1">采购部</option>
                      <option value="2">销售部</option>
                      <option value="3">仓储部</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      角色 <span className="text-destructive">*</span>
                    </label>
                    <select
                      value={formData.roleId}
                      onChange={(e) => setFormData({ ...formData, roleId: e.target.value })}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    >
                      <option value="">请选择角色</option>
                      <option value="1">采购员</option>
                      <option value="2">销售员</option>
                      <option value="3">仓管员</option>
                      <option value="4">采购经理</option>
                      <option value="5">销售经理</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Remark */}
              <div className="border border-border rounded-lg p-4">
                <h4 className="font-medium mb-4">备注</h4>
                <textarea
                  rows={3}
                  placeholder="请输入备注信息..."
                  value={formData.remark}
                  onChange={(e) => setFormData({ ...formData, remark: e.target.value })}
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
                  console.log('保存用户:', formData);
                  notify.error('用户保存接口尚未接入，未保存变更');
                }}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                确认保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Role Assignment Dialog */}
      {showRoleDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">分配角色</h3>
              <button
                onClick={() => setShowRoleDialog(false)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <XCircle className="size-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm mb-2 text-muted-foreground">
                  当前用户: <span className="text-foreground font-medium">张三</span>
                </label>
              </div>
              <div>
                <label className="block text-sm mb-2">
                  选择角色 <span className="text-destructive">*</span>
                </label>
                <div className="space-y-2 border border-border rounded-lg p-3 max-h-60 overflow-y-auto">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="size-4 rounded border-border" />
                    <span className="text-sm">采购员</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="size-4 rounded border-border" />
                    <span className="text-sm">销售员</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="size-4 rounded border-border" />
                    <span className="text-sm">仓管员</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="size-4 rounded border-border" />
                    <span className="text-sm">采购经理</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" className="size-4 rounded border-border" />
                    <span className="text-sm">销售经理</span>
                  </label>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setShowRoleDialog(false)}
                className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => {
                  notify.error('角色分配接口尚未接入，未保存变更');
                }}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity"
              >
                确认分配
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
