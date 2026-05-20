import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { z } from 'zod';
import {
  CheckCircle2,
  Download,
  Eye,
  Plus,
  RotateCcw,
  Search,
  Truck,
  XCircle,
} from 'lucide-react';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { useFeedback } from './AppFeedback';
import {
  approveRefund,
  createRefund,
  listRefunds,
  outboundRefund,
  refundQueryKey,
  rejectRefund,
  updateRefund,
  type RefundItem,
  type RefundPayload,
  type RefundStatus,
} from '../services/refunds';

type StatusFilter = RefundStatus | 'all';

type RefundFormData = RefundPayload;

const statusMeta: Record<RefundStatus, { label: string; className: string }> = {
  pending_audit: { label: '待审核', className: 'text-[#f59e0b] bg-[#f59e0b]/10' },
  approved: { label: '已审核', className: 'text-[#3b82f6] bg-[#3b82f6]/10' },
  returning: { label: '退货中', className: 'text-[#8b5cf6] bg-[#8b5cf6]/10' },
  completed: { label: '已完成', className: 'text-[#10b981] bg-[#10b981]/10' },
  rejected: { label: '已驳回', className: 'text-destructive bg-destructive/10' },
  closed: { label: '已关闭', className: 'text-muted-foreground bg-muted' },
};

const emptyForm: RefundFormData = {
  relatedOrderNo: '',
  hospital: '',
  productName: '',
  batchNo: '',
  refundQty: 1,
  refundAmount: 0,
  reason: '',
  applyDate: new Date().toISOString().slice(0, 10),
};

const refundFormSchema = z.object({
  relatedOrderNo: z.string().trim().min(1, '请填写关联订单'),
  hospital: z.string().trim().min(1, '请填写医院'),
  productName: z.string().trim().min(1, '请填写商品'),
  batchNo: z.string().trim().min(1, '请填写批号'),
  refundQty: z.number().int('退货数量必须为整数').min(1, '退货数量必须大于 0'),
  refundAmount: z.number().min(0, '退货金额不能小于 0'),
  reason: z.string().trim(),
  applyDate: z.string().trim().min(1, '请选择申请日期'),
});

function toFormData(item: RefundItem): RefundFormData {
  return {
    relatedOrderNo: item.relatedOrderNo,
    hospital: item.hospital,
    productName: item.productName,
    batchNo: item.batchNo,
    refundQty: item.refundQty,
    refundAmount: item.refundAmount,
    reason: item.reason,
    applyDate: item.applyDate,
  };
}

export default function RefundManagement() {
  const { confirm, notify } = useFeedback();
  const queryClient = useQueryClient();
  const [selectedRows, setSelectedRows] = useState<number[]>([]);
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [showDetailDialog, setShowDetailDialog] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<RefundFormData>(emptyForm);
  const [keyword, setKeyword] = useState('');
  const [status, setStatus] = useState<StatusFilter>('all');
  const [applyDate, setApplyDate] = useState('');

  const refundsQuery = useQuery({
    queryKey: refundQueryKey,
    queryFn: listRefunds,
  });

  const refunds = refundsQuery.data ?? [];

  const updateRefundCache = (updated: RefundItem) => {
    queryClient.setQueryData<RefundItem[]>(refundQueryKey, (current = refunds) =>
      current.map((item) => (item.id === updated.id ? updated : item)),
    );
  };

  const approveMutation = useMutation({
    mutationFn: approveRefund,
    onSuccess: updateRefundCache,
  });
  const rejectMutation = useMutation({
    mutationFn: rejectRefund,
    onSuccess: updateRefundCache,
  });
  const outboundMutation = useMutation({
    mutationFn: outboundRefund,
    onSuccess: updateRefundCache,
  });
  const createMutation = useMutation({
    mutationFn: createRefund,
    onSuccess: (created) => {
      queryClient.setQueryData<RefundItem[]>(refundQueryKey, (current = refunds) => [created, ...current]);
      setSelectedRows([created.id]);
    },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: RefundPayload }) => updateRefund(id, payload),
    onSuccess: updateRefundCache,
  });

  const filteredRefunds = useMemo(
    () =>
      refunds.filter((item) => {
        const trimmedKeyword = keyword.trim();
        const matchesKeyword =
          !trimmedKeyword ||
          item.refundNo.includes(trimmedKeyword) ||
          item.hospital.includes(trimmedKeyword) ||
          item.productName.includes(trimmedKeyword);
        const matchesStatus = status === 'all' || item.status === status;
        const matchesApplyDate = !applyDate || item.applyDate === applyDate;
        return matchesKeyword && matchesStatus && matchesApplyDate;
      }),
    [refunds, keyword, status, applyDate],
  );

  const visibleIds = useMemo(() => filteredRefunds.map((item) => item.id), [filteredRefunds]);
  const selectedRefund = refunds.find((item) => item.id === selectedRows[0]);
  const selectedVisibleCount = selectedRows.filter((id) => visibleIds.includes(id)).length;
  const isSingleSelected = selectedRows.length === 1 && Boolean(selectedRefund);
  const canAudit = isSingleSelected && selectedRefund?.status === 'pending_audit';
  const canEdit = canAudit;
  const canStartReturn = isSingleSelected && selectedRefund?.status === 'approved';
  const allVisibleSelected = filteredRefunds.length > 0 && selectedVisibleCount === filteredRefunds.length;
  const isActionSubmitting =
    approveMutation.isPending || rejectMutation.isPending || outboundMutation.isPending ||
    createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    setSelectedRows((rows) => rows.filter((id) => visibleIds.includes(id)));
  }, [visibleIds]);

  const updateFormField = <K extends keyof RefundFormData>(key: K, value: RefundFormData[K]) => {
    setFormData((current) => ({ ...current, [key]: value }));
  };

  const toggleSelectAll = () => {
    setSelectedRows(allVisibleSelected ? [] : visibleIds);
  };

  const toggleSelectRow = (id: number, checked: boolean) => {
    setSelectedRows((rows) =>
      checked ? Array.from(new Set([...rows, id])) : rows.filter((rowId) => rowId !== id),
    );
  };

  const requireSingleSelection = (message: string) => {
    if (!isSingleSelected) {
      notify.warning(message);
      return false;
    }
    return true;
  };

  const requireStatus = (allowed: RefundStatus[], message: string) => {
    if (!selectedRefund || !allowed.includes(selectedRefund.status)) {
      notify.warning(message);
      return false;
    }
    return true;
  };

  const openCreateDialog = () => {
    setEditingId(null);
    setFormData({ ...emptyForm });
    setShowEditDialog(true);
  };

  const openEditDialog = () => {
    if (!requireSingleSelection('请选择一条退货单进行编辑')) return;
    if (!requireStatus(['pending_audit'], '仅待审核退货单允许编辑')) return;
    setEditingId(selectedRefund!.id);
    setFormData(toFormData(selectedRefund!));
    setShowEditDialog(true);
  };

  const handleAudit = async (approved: boolean) => {
    if (!requireSingleSelection('请选择一条退货单进行审核')) return;
    if (!requireStatus(['pending_audit'], '仅待审核退货单允许审核')) return;

    const nextStatus: RefundStatus = approved ? 'approved' : 'rejected';
    const confirmed = await confirm({
      title: approved ? '确认审核通过' : '确认驳回退货',
      description: `${selectedRefund?.refundNo} 将进入“${statusMeta[nextStatus].label}”状态。`,
      confirmText: approved ? '通过' : '驳回',
      destructive: !approved,
    });

    if (!confirmed) return;

    try {
      if (approved) {
        await approveMutation.mutateAsync(selectedRefund!.id);
      } else {
        await rejectMutation.mutateAsync(selectedRefund!.id);
      }
      notify.success(approved ? '退货单已审核通过' : '退货单已驳回');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '退货审核提交失败');
    }
  };

  const handleStartReturn = async () => {
    if (!requireSingleSelection('请选择一条已审核退货单发起退货出库')) return;
    if (!requireStatus(['approved'], '仅已审核退货单允许发起退货出库')) return;

    const confirmed = await confirm({
      title: '确认退货出库',
      description: '退货出库后将锁定对应批次库存，并生成退货物流跟踪记录。',
      confirmText: '确认出库',
    });

    if (!confirmed) return;

    try {
      await outboundMutation.mutateAsync(selectedRefund!.id);
      notify.success('退货出库已提交');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '退货出库提交失败');
    }
  };

  const handleSave = async () => {
    const parsed = refundFormSchema.safeParse(formData);
    if (!parsed.success) {
      notify.warning(parsed.error.issues[0]?.message ?? '请完整填写退货单信息');
      return;
    }

    try {
      if (editingId) {
        await updateMutation.mutateAsync({ id: editingId, payload: parsed.data });
        notify.success('退货单已保存');
      } else {
        await createMutation.mutateAsync(parsed.data);
        notify.success('退货单已新增');
      }
      setShowEditDialog(false);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '退货单保存失败');
    }
  };

  const resetFilters = () => {
    setKeyword('');
    setStatus('all');
    setApplyDate('');
  };

  return (
    <div className="space-y-4">
      {refundsQuery.isError && (
        <div className="rounded-md border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          退货数据暂时无法从 API 加载，当前显示本地缓存数据。
        </div>
      )}

      <div className="rounded-lg border border-border bg-background p-5">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <div>
            <Label htmlFor="refund-keyword" className="mb-2 block text-sm">
              退货单/医院/商品
            </Label>
            <Input
              id="refund-keyword"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="请输入关键字"
            />
          </div>
          <div>
            <Label htmlFor="refund-status" className="mb-2 block text-sm">
              状态
            </Label>
            <Select value={status} onValueChange={(value) => setStatus(value as StatusFilter)}>
              <SelectTrigger id="refund-status">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                {Object.entries(statusMeta).map(([value, meta]) => (
                  <SelectItem key={value} value={value}>
                    {meta.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="refund-apply-date" className="mb-2 block text-sm">
              申请日期
            </Label>
            <Input
              id="refund-apply-date"
              type="date"
              value={applyDate}
              onChange={(event) => setApplyDate(event.target.value)}
            />
          </div>
          <div className="flex items-end gap-2">
            <Button type="button">
              <Search className="size-4" />
              查询
            </Button>
            <Button type="button" variant="outline" onClick={resetFilters}>
              重置
            </Button>
          </div>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-background p-4">
        <div className="flex flex-wrap items-center gap-2">
          <Button type="button" onClick={openCreateDialog}>
            <Plus className="size-4" />
            新增
          </Button>
          <Button type="button" variant="outline" disabled={!canEdit} onClick={openEditDialog}>
            <RotateCcw className="size-4" />
            修改
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!canAudit || isActionSubmitting}
            onClick={() => handleAudit(true)}
          >
            <CheckCircle2 className="size-4" />
            审核通过
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!canAudit || isActionSubmitting}
            onClick={() => handleAudit(false)}
          >
            <XCircle className="size-4" />
            驳回
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!canStartReturn || isActionSubmitting}
            onClick={handleStartReturn}
          >
            <Truck className="size-4" />
            退货出库
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled={!isSingleSelected}
            onClick={() => {
              if (requireSingleSelection('请选择一条退货单查看明细')) setShowDetailDialog(true);
            }}
          >
            <Eye className="size-4" />
            明细
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => notify.success(`已导出 ${filteredRefunds.length} 条退货数据`)}
          >
            <Download className="size-4" />
            导出
          </Button>
        </div>
      </div>

      <div className="overflow-hidden rounded-lg border border-border bg-background">
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30">
              <TableHead className="w-12">
                <Checkbox
                  aria-label="选择全部退货单"
                  checked={allVisibleSelected}
                  disabled={filteredRefunds.length === 0}
                  onCheckedChange={toggleSelectAll}
                />
              </TableHead>
              <TableHead>退货单号</TableHead>
              <TableHead>医院</TableHead>
              <TableHead>关联订单</TableHead>
              <TableHead>商品</TableHead>
              <TableHead>批号</TableHead>
              <TableHead className="text-right">数量</TableHead>
              <TableHead className="text-right">金额</TableHead>
              <TableHead>原因</TableHead>
              <TableHead>申请日期</TableHead>
              <TableHead className="text-center">状态</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {refundsQuery.isFetching && refunds.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="h-28 text-center text-muted-foreground">
                  正在加载退货数据...
                </TableCell>
              </TableRow>
            )}
            {filteredRefunds.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <Checkbox
                    aria-label={`选择退货单 ${item.refundNo}`}
                    checked={selectedRows.includes(item.id)}
                    onCheckedChange={(checked) => toggleSelectRow(item.id, checked === true)}
                  />
                </TableCell>
                <TableCell className="font-medium">{item.refundNo}</TableCell>
                <TableCell>{item.hospital}</TableCell>
                <TableCell>{item.relatedOrderNo}</TableCell>
                <TableCell>{item.productName}</TableCell>
                <TableCell>{item.batchNo}</TableCell>
                <TableCell className="text-right">{item.refundQty}</TableCell>
                <TableCell className="text-right">¥{item.refundAmount.toLocaleString()}</TableCell>
                <TableCell>{item.reason}</TableCell>
                <TableCell>{item.applyDate}</TableCell>
                <TableCell className="text-center">
                  <span className={`inline-flex rounded-full px-3 py-1 text-xs ${statusMeta[item.status].className}`}>
                    {statusMeta[item.status].label}
                  </span>
                </TableCell>
              </TableRow>
            ))}
            {filteredRefunds.length === 0 && (
              <TableRow>
                <TableCell colSpan={11} className="h-28 text-center text-muted-foreground">
                  暂无匹配退货数据
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editingId ? '编辑退货单' : '新增退货单'}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label htmlFor="refund-order-no" className="mb-2 block text-sm">
                关联订单
              </Label>
              <Input
                id="refund-order-no"
                value={formData.relatedOrderNo}
                onChange={(event) => updateFormField('relatedOrderNo', event.target.value)}
                placeholder="请选择采购订单"
              />
            </div>
            <div>
              <Label htmlFor="refund-hospital" className="mb-2 block text-sm">
                医院
              </Label>
              <Input
                id="refund-hospital"
                value={formData.hospital}
                onChange={(event) => updateFormField('hospital', event.target.value)}
                placeholder="请输入医院名称"
              />
            </div>
            <div>
              <Label htmlFor="refund-product" className="mb-2 block text-sm">
                商品
              </Label>
              <Input
                id="refund-product"
                value={formData.productName}
                onChange={(event) => updateFormField('productName', event.target.value)}
                placeholder="请选择商品"
              />
            </div>
            <div>
              <Label htmlFor="refund-batch-no" className="mb-2 block text-sm">
                批号
              </Label>
              <Input
                id="refund-batch-no"
                value={formData.batchNo}
                onChange={(event) => updateFormField('batchNo', event.target.value)}
                placeholder="请输入批号"
              />
            </div>
            <div>
              <Label htmlFor="refund-qty" className="mb-2 block text-sm">
                退货数量
              </Label>
              <Input
                id="refund-qty"
                type="number"
                value={formData.refundQty}
                min={1}
                onChange={(event) => updateFormField('refundQty', Math.max(1, Number(event.target.value)))}
              />
            </div>
            <div>
              <Label htmlFor="refund-amount" className="mb-2 block text-sm">
                退货金额
              </Label>
              <Input
                id="refund-amount"
                type="number"
                value={formData.refundAmount}
                min={0}
                onChange={(event) => updateFormField('refundAmount', Math.max(0, Number(event.target.value)))}
              />
            </div>
            <div>
              <Label htmlFor="refund-form-apply-date" className="mb-2 block text-sm">
                申请日期
              </Label>
              <Input
                id="refund-form-apply-date"
                type="date"
                value={formData.applyDate}
                onChange={(event) => updateFormField('applyDate', event.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="refund-reason" className="mb-2 block text-sm">
                退货原因
              </Label>
              <Input
                id="refund-reason"
                value={formData.reason}
                onChange={(event) => updateFormField('reason', event.target.value)}
                placeholder="质量问题/数量差异/效期问题/其他"
              />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setShowEditDialog(false)}>
              取消
            </Button>
            <Button type="button" onClick={handleSave}>
              保存
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={showDetailDialog} onOpenChange={setShowDetailDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>退货明细</DialogTitle>
          </DialogHeader>
          {selectedRefund && (
            <div className="grid grid-cols-1 gap-4 text-sm md:grid-cols-2">
              <div>
                <span className="text-muted-foreground">退货单号：</span>
                {selectedRefund.refundNo}
              </div>
              <div>
                <span className="text-muted-foreground">关联订单：</span>
                {selectedRefund.relatedOrderNo}
              </div>
              <div>
                <span className="text-muted-foreground">商品：</span>
                {selectedRefund.productName}
              </div>
              <div>
                <span className="text-muted-foreground">批号：</span>
                {selectedRefund.batchNo}
              </div>
              <div>
                <span className="text-muted-foreground">数量：</span>
                {selectedRefund.refundQty}
              </div>
              <div>
                <span className="text-muted-foreground">金额：</span>
                ¥{selectedRefund.refundAmount.toLocaleString()}
              </div>
              <div className="md:col-span-2">
                <span className="text-muted-foreground">处理链路：</span>
                退货申请 {'->'} 审核确认 {'->'} 退货出库 {'->'} 物流跟踪 {'->'} 库存回退/差异结算
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
