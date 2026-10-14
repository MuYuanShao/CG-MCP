import { useEffect, useState } from 'react';
import { Loader2, ShieldCheck, X } from 'lucide-react';
import { useFeedback } from './AppFeedback';
import {
  getPurchasePlanApprovalScope,
  updatePurchasePlanApprovalScope,
  type ApprovalScopeConfig,
} from '../services/purchase';

interface ApprovalScopeDialogProps {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function ApprovalScopeDialog({ open, onClose, onSaved }: ApprovalScopeDialogProps) {
  const { notify } = useFeedback();
  const [config, setConfig] = useState<ApprovalScopeConfig | null>(null);
  const [roleIds, setRoleIds] = useState<number[]>([]);
  const [userIds, setUserIds] = useState<number[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getPurchasePlanApprovalScope()
      .then((data) => {
        setConfig(data);
        setRoleIds(data.selectedRoleIds);
        setUserIds(data.selectedUserIds);
      })
      .catch((error) => notify.error(error instanceof Error ? error.message : '审批范围加载失败'))
      .finally(() => setLoading(false));
  }, [open]);

  const toggleId = (ids: number[], id: number, setter: (next: number[]) => void) => {
    setter(ids.includes(id) ? ids.filter((value) => value !== id) : [...ids, id]);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updatePurchasePlanApprovalScope(roleIds, userIds);
      notify.success('采购计划审批范围已更新');
      onSaved();
      onClose();
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '审批范围保存失败');
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border px-6 py-4">
          <div>
            <h3 className="flex items-center gap-2 font-semibold"><ShieldCheck className="size-5" /> 采购计划审批范围</h3>
            <p className="mt-1 text-sm text-muted-foreground">所选角色和用户可审批、驳回及修改待审批数据，管理员始终拥有全部权限。</p>
          </div>
          <button type="button" onClick={onClose} aria-label="关闭" className="rounded p-1 hover:bg-accent"><X className="size-5" /></button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex min-h-48 items-center justify-center text-muted-foreground"><Loader2 className="mr-2 size-5 animate-spin" /> 加载中</div>
          ) : (
            <div className="grid gap-6 md:grid-cols-2">
              <section>
                <h4 className="mb-3 text-sm font-medium">按角色配置</h4>
                <div className="max-h-80 space-y-1 overflow-y-auto rounded border border-border p-2">
                  {config?.roles.map((role) => (
                    <label key={role.id} className="flex cursor-pointer items-center gap-3 rounded px-3 py-2 hover:bg-accent">
                      <input type="checkbox" checked={roleIds.includes(role.id)} onChange={() => toggleId(roleIds, role.id, setRoleIds)} className="size-4" />
                      <span className="min-w-0"><span className="block text-sm font-medium">{role.name}</span><span className="block truncate text-xs text-muted-foreground">{role.code}</span></span>
                    </label>
                  ))}
                </div>
              </section>
              <section>
                <h4 className="mb-3 text-sm font-medium">按用户配置</h4>
                <div className="max-h-80 space-y-1 overflow-y-auto rounded border border-border p-2">
                  {config?.users.map((user) => (
                    <label key={user.id} className="flex cursor-pointer items-center gap-3 rounded px-3 py-2 hover:bg-accent">
                      <input type="checkbox" checked={userIds.includes(user.id)} onChange={() => toggleId(userIds, user.id, setUserIds)} className="size-4" />
                      <span className="min-w-0"><span className="block text-sm font-medium">{user.name}</span><span className="block truncate text-xs text-muted-foreground">{user.code}</span></span>
                    </label>
                  ))}
                </div>
              </section>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
          <button type="button" onClick={onClose} className="rounded-lg border border-border px-5 py-2 hover:bg-accent">取消</button>
          <button type="button" onClick={handleSave} disabled={loading || saving}
            className="flex items-center gap-2 rounded-lg bg-primary px-5 py-2 text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
            {saving && <Loader2 className="size-4 animate-spin" />} 保存配置
          </button>
        </div>
      </div>
    </div>
  );
}
