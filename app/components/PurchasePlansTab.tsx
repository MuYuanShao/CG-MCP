import { Search, CheckCircle2, Truck, Download, XCircle, LockKeyhole, Settings2, Pencil } from 'lucide-react';
import { Button } from './ui/button';

interface PurchasePlan {
  id: number;
  orderNo: string;
  productCode: string;
  productName: string;
  spec: string;
  model: string;
  unit: string;
  planQty: number;
  unitPrice: number;
  registrationNo: string;
  manufacturer: string;
  planDate: string;
  status: 'draft' | 'pending_approval' | 'rejected' | 'pending_order' | 'partial' | 'completed';
  canApprove: boolean;
  canEdit: boolean;
}

interface PlanSearchForm {
  productCode: string;
  productName: string;
  manufacturer: string;
  orderNo: string;
  startDate: string;
  endDate: string;
  registrationNo: string;
}

interface PurchasePlansTabProps {
  purchasePlans: PurchasePlan[];
  selectedPlanRows: number[];
  onSelectPlanRow: (id: number) => void;
  onSelectPlanAll: () => void;
  onApprovePlans: () => void;
  onRejectPlans: () => void;
  onSubmitPlans: () => void;
  canSubmitPlans: boolean;
  error?: string;
  canConfigureApproval: boolean;
  onConfigureApproval: () => void;
  onEditPlan: () => void;
  onConvertPlanToOrder: () => void;
  isLoading: boolean;
  planSearchForm: PlanSearchForm;
  onUpdatePlanSearchForm: (form: PlanSearchForm) => void;
  onResetPlanSearch: () => void;
}

function getPlanStatusColor(status: string) {
  switch (status) {
    case 'pending_approval': return 'text-[#f59e0b] bg-[#f59e0b]/10';
    case 'pending_order': return 'text-[#0f766e] bg-[#0f766e]/10';
    case 'rejected': return 'text-destructive bg-destructive/10';
    case 'draft': return 'text-muted-foreground bg-muted';
    case 'partial': return 'text-[#3b82f6] bg-[#3b82f6]/10';
    case 'completed': return 'text-[#10b981] bg-[#10b981]/10';
    default: return 'text-foreground bg-muted';
  }
}

function getPlanStatusText(status: string) {
  switch (status) {
    case 'draft': return '草稿';
    case 'pending_approval': return '待审批';
    case 'rejected': return '已驳回';
    case 'pending_order': return '待转订单';
    case 'partial': return '部分转单';
    case 'completed': return '已转换';
    default: return status;
  }
}

export default function PurchasePlansTab({
  purchasePlans,
  selectedPlanRows,
  onSelectPlanRow,
  onSelectPlanAll,
  onApprovePlans,
  onRejectPlans,
  onSubmitPlans,
  canSubmitPlans,
  error,
  canConfigureApproval,
  onConfigureApproval,
  onEditPlan,
  onConvertPlanToOrder,
  isLoading,
  planSearchForm,
  onUpdatePlanSearchForm,
}: PurchasePlansTabProps) {
  const selectedPlans = purchasePlans.filter((plan) => selectedPlanRows.includes(plan.id));
  const selectedPlan = selectedPlans[0];
  const canApproveSelection = selectedPlans.length > 0 && selectedPlans.every((plan) => plan.canApprove);
  const canConvertSelection = selectedPlans.length === 1
    && selectedPlan !== undefined
    && ['pending_order', 'partial'].includes(selectedPlan.status);
  const canEditSelection = selectedPlans.length === 1 && selectedPlan?.canEdit === true;
  const selectablePlans = purchasePlans.filter((plan) => plan.status !== 'pending_approval' || plan.canEdit);
  const hasReadOnlyPendingPlans = purchasePlans.some((plan) => plan.status === 'pending_approval' && !plan.canApprove);

  return (
    <div className="space-y-4">
      {error && <p role="alert" className="rounded-lg border border-destructive p-3 text-destructive">采购计划加载失败：{error}</p>}
      <div className="p-5 border border-border rounded-lg bg-background">
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div>
            <label className="block text-sm mb-2">商品编码</label>
            <input type="text" placeholder="请输入商品编码" value={planSearchForm.productCode}
              onChange={(e) => onUpdatePlanSearchForm({ ...planSearchForm, productCode: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm mb-2">商品名称</label>
            <input type="text" placeholder="请输入商品名称" value={planSearchForm.productName}
              onChange={(e) => onUpdatePlanSearchForm({ ...planSearchForm, productName: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm mb-2">厂家</label>
            <input type="text" placeholder="请输入厂家" value={planSearchForm.manufacturer}
              onChange={(e) => onUpdatePlanSearchForm({ ...planSearchForm, manufacturer: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm mb-2">订单号</label>
            <input type="text" placeholder="请输入订单号" value={planSearchForm.orderNo}
              onChange={(e) => onUpdatePlanSearchForm({ ...planSearchForm, orderNo: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
          <div>
            <label className="block text-sm mb-2">计划时间</label>
            <div className="flex items-center gap-2">
              <input type="date" value={planSearchForm.startDate}
                onChange={(e) => onUpdatePlanSearchForm({ ...planSearchForm, startDate: e.target.value })}
                className="flex-1 px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
              <span className="text-muted-foreground">~</span>
              <input type="date" value={planSearchForm.endDate}
                onChange={(e) => onUpdatePlanSearchForm({ ...planSearchForm, endDate: e.target.value })}
                className="flex-1 px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
            </div>
          </div>
          <div>
            <label className="block text-sm mb-2">注册证号</label>
            <input type="text" placeholder="请输入注册证号" value={planSearchForm.registrationNo}
              onChange={(e) => onUpdatePlanSearchForm({ ...planSearchForm, registrationNo: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
          </div>
        </div>
        <div className="flex gap-3">
          <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2">
            <Search className="size-4" /> 查询
          </button>
          <button className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors">重置</button>
        </div>
      </div>

      <div className="p-4 border border-border rounded-lg bg-background">
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" onClick={onSubmitPlans} disabled={!canSubmitPlans || isLoading || !selectedPlans.length || selectedPlans.some(plan => plan.status !== 'draft')}>提交审批</Button>
          <button disabled={!canApproveSelection} onClick={onApprovePlans}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <CheckCircle2 className="size-4" /> 审批通过
          </button>
          <button disabled={!canApproveSelection} onClick={onRejectPlans}
            className="px-4 py-2 bg-background border border-border text-destructive rounded-lg hover:bg-destructive/5 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <XCircle className="size-4" /> 驳回
          </button>
          <button disabled={!canEditSelection} onClick={onEditPlan}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <Pencil className="size-4" /> 编辑
          </button>
          <button disabled={!canConvertSelection} onClick={onConvertPlanToOrder}
            className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
            <Truck className="size-4" /> 计划转订单
          </button>
          <button className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2">
            <Download className="size-4" /> 导出
          </button>
          {canConfigureApproval && (
            <button onClick={onConfigureApproval}
              className="ml-auto px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2">
              <Settings2 className="size-4" /> 审批范围
            </button>
          )}
        </div>
        {hasReadOnlyPendingPlans && (
          <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
            <LockKeyhole className="size-4" /> 未配置审批角色或用户的待审批数据仅支持查看。
          </div>
        )}
      </div>

      <div className="border border-border rounded-lg bg-background overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left">
                  <input type="checkbox" checked={selectablePlans.length > 0 && selectedPlanRows.length === selectablePlans.length}
                    onChange={onSelectPlanAll} className="size-4 rounded border-border" />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">订单号</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">商品编码</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">商品名称</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">规格</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">型号</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">单位</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">采购数量</th>
                <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">单价(¥)</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">注册证号</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">厂家</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">计划时间</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {!isLoading && !error && purchasePlans.length === 0 && <tr><td colSpan={13} className="px-4 py-8 text-center text-muted-foreground">暂无采购计划数据</td></tr>}
              {purchasePlans.map((plan) => (
                <tr key={plan.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3">
                    <input type="checkbox" checked={selectedPlanRows.includes(plan.id)} onChange={() => onSelectPlanRow(plan.id)}
                      disabled={plan.status === 'pending_approval' && !plan.canEdit}
                      aria-label={plan.status === 'pending_approval' && !plan.canEdit ? `${plan.orderNo} 仅可查看` : `选择 ${plan.orderNo}`}
                      title={plan.status === 'pending_approval' && !plan.canEdit ? '未配置审批角色或用户，仅可查看' : undefined}
                      className="size-4 rounded border-border disabled:cursor-not-allowed disabled:opacity-40" />
                  </td>
                  <td className="px-4 py-3 font-medium">{plan.orderNo}</td>
                  <td className="px-4 py-3 text-sm font-mono">{plan.productCode}</td>
                  <td className="px-4 py-3">{plan.productName}</td>
                  <td className="px-4 py-3 text-sm">{plan.spec}</td>
                  <td className="px-4 py-3 text-sm">{plan.model}</td>
                  <td className="px-4 py-3 text-sm">{plan.unit}</td>
                  <td className="px-4 py-3 text-right">{plan.planQty}</td>
                  <td className="px-4 py-3 text-right font-medium">{plan.unitPrice.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm font-mono">{plan.registrationNo}</td>
                  <td className="px-4 py-3 text-sm">{plan.manufacturer}</td>
                  <td className="px-4 py-3 text-sm">{plan.planDate}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <span className={`px-2 py-1 rounded text-xs ${getPlanStatusColor(plan.status)}`}>{getPlanStatusText(plan.status)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-6 py-4 border-t border-border flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            {isLoading ? '采购计划加载中...' : `每页25条 · 共${purchasePlans.length}条`}
          </div>
          <div className="flex items-center gap-2">
            <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">首页</button>
            <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">上一页</button>
            <button className="px-3 py-1 bg-primary text-primary-foreground rounded text-sm">1</button>
            <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">下一页</button>
            <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">末页</button>
          </div>
        </div>
      </div>
    </div>
  );
}
