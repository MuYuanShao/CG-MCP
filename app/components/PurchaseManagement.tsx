import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Download,
  CheckCircle2,
  Truck,
  Edit,
  Send,
  Trash2,
  Printer,
  X,
  Plus,
  Minus,
} from 'lucide-react';
import { useFeedback } from './AppFeedback';
import {
  approvePurchasePlan,
  createDeliveryEditByPlan,
  deleteDeliveryOrders,
  getPurchaseOrderDetails,
  listPurchasePlans,
  listPurchaseOrders,
  rejectPurchasePlan,
  submitPurchasePlan,
  updatePurchasePlan,
  saveDeliveryEdit,
  submitDelivery,
  type BusinessDocument,
  type DeliveryEdit,
  type PurchaseOrderDetailSearchParams,
  type PurchaseOrderSearchParams,
} from '../services/purchase';
import PurchasePlansTab from './PurchasePlansTab';
import PurchaseOrdersTab from './PurchaseOrdersTab';
import DeliveryEditDialog from './DeliveryEditDialog';
import ApprovalScopeDialog from './ApprovalScopeDialog';
import { getStoredAuthUser } from '../services/auth';

interface PurchaseManagementProps {
  isAdministrator?: boolean;
}

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

interface DeliveryOrder {
  id: number;
  deliveryNo: string;
  orderNo: string;
  productCode: string;
  productName: string;
  manufacturer: string;
  planDate: string;
  status: 'pending_ship' | 'picking' | 'shipped' | 'logistics_exception' | 'arrived' | 'withdrawn';
}

interface PurchaseOrder {
  id: number;
  orderNo: string;
  planNo: string;
  hospital: string;
  productName: string;
  totalAmount: number;
  orderDate: string;
  status: 'pending_confirm' | 'confirmed' | 'partial_shipped' | 'shipped' | 'arrived' | 'accepted' | 'completed' | 'closed';
}

interface ShipmentOrder {
  id: number;
  shipmentNo: string;
  deliveryNo: string;
  carrier: string;
  batchNo: string;
  shipDate: string;
  status: 'pending_outbound' | 'outbound' | 'transporting' | 'signed' | 'sign_exception';
}

interface DeliveryItem {
  id: number;
  productCode: string;
  productName: string;
  spec: string;
  model: string;
  unit: string;
  unitPrice: number;
  manufacturer: string;
  planQty: number;
  deliveredQty: number;
  productionDate: string;
  expiryDate: string;
  batchNo: string;
  remark: string;
}

const mockPlans: PurchasePlan[] = [
  { id: 1, orderNo: 'PP-DEMO-9001', productCode: 'YLQX20240001', productName: '医用口罩', spec: '10只/盒', model: 'KZ-01', unit: '盒', planQty: 100, unitPrice: 35.0, registrationNo: 'ZC123456', manufacturer: 'XX厂家', planDate: '2024-04-01', status: 'pending_approval', canApprove: true, canEdit: true },
  { id: 2, orderNo: 'PP202604130002', productCode: 'YLQX20240002', productName: '医用防护口罩', spec: '20支/盒', model: 'KZ-02', unit: '盒', planQty: 50, unitPrice: 68.0, registrationNo: 'ZC789012', manufacturer: 'YY厂家', planDate: '2024-04-02', status: 'pending_order', canApprove: false, canEdit: true },
  { id: 3, orderNo: 'CG20240003', productCode: 'YLQX20240003', productName: '一次性手套', spec: '100只/盒', model: 'ST-01', unit: '盒', planQty: 200, unitPrice: 45.0, registrationNo: 'ZC345678', manufacturer: 'ZZ厂家', planDate: '2024-04-03', status: 'partial', canApprove: false, canEdit: true },
];

const mockDeliveryOrders: DeliveryOrder[] = [
  { id: 1, deliveryNo: 'PS20240001', orderNo: 'PO202604120001', productCode: 'YLQX20240001', productName: '医用口罩', manufacturer: 'XX厂家', planDate: '2024-04-01', status: 'arrived' },
  { id: 2, deliveryNo: 'PS20240002', orderNo: 'PO202604120002', productCode: 'YLQX20240002', productName: '医用防护口罩', manufacturer: 'YY厂家', planDate: '2024-04-02', status: 'shipped' },
  { id: 3, deliveryNo: 'PS20240003', orderNo: 'PO202604110015', productCode: 'YLQX20240003', productName: '一次性手套', manufacturer: 'ZZ厂家', planDate: '2024-04-03', status: 'pending_ship' },
];

const mockPurchaseOrders: PurchaseOrder[] = [
  { id: 1, orderNo: 'PO202604120001', planNo: 'CG20240001', hospital: '浙江省人民医院', productName: '医用口罩', totalAmount: 3500, orderDate: '2026-04-12', status: 'confirmed' },
  { id: 2, orderNo: 'PO202604120002', planNo: 'CG20240002', hospital: '浙江大学医学院附属第一医院', productName: '医用防护口罩', totalAmount: 3400, orderDate: '2026-04-12', status: 'partial_shipped' },
  { id: 3, orderNo: 'PO202604110015', planNo: 'CG20240003', hospital: '宁波市第一医院', productName: '一次性手套', totalAmount: 9000, orderDate: '2026-04-11', status: 'pending_confirm' },
];

const mockShipments: ShipmentOrder[] = [
  { id: 1, shipmentNo: 'FH202604120001', deliveryNo: 'PS20240001', carrier: '顺丰医药冷链', batchNo: 'B20240301', shipDate: '2026-04-13', status: 'signed' },
  { id: 2, shipmentNo: 'FH202604120002', deliveryNo: 'PS20240002', carrier: '京东物流', batchNo: 'B20240305', shipDate: '2026-04-13', status: 'transporting' },
  { id: 3, shipmentNo: 'FH202604110006', deliveryNo: 'PS20240003', carrier: '待分配', batchNo: '-', shipDate: '-', status: 'pending_outbound' },
];

const mapBusinessPlanToPurchasePlan = (plan: BusinessDocument): PurchasePlan => ({
  id: plan.id,
  orderNo: plan.documentNo,
  productCode: '',
  productName: plan.productName,
  spec: '',
  model: '',
  unit: '',
  planQty: plan.quantity ?? 0,
  unitPrice: plan.quantity ? Number(plan.amount ?? 0) / plan.quantity : 0,
  registrationNo: '',
  manufacturer: '',
  planDate: plan.businessDate ?? '',
  status: plan.status === 'ordered'
    ? 'completed'
    : plan.status === 'partial_ordered'
      ? 'partial'
      : plan.status as PurchasePlan['status'],
  canApprove: Boolean(plan.canApprove),
  canEdit: plan.canEdit !== false,
});

const mapBusinessOrderToPurchaseOrder = (order: BusinessDocument): PurchaseOrder => ({
  id: order.id,
  orderNo: order.documentNo,
  planNo: order.sourceNo,
  hospital: order.hospital,
  productName: order.productName || '-',
  totalAmount: Number(order.amount ?? 0),
  orderDate: order.businessDate ?? '',
  status: order.status as PurchaseOrder['status'],
});

export default function PurchaseManagement({ isAdministrator = false }: PurchaseManagementProps) {
  const { notify, confirm } = useFeedback();
  const [activeTab, setActiveTab] = useState<'plan' | 'order'>('plan');
  const [showApprovalScopeDialog, setShowApprovalScopeDialog] = useState(false);
  const [showPlanEditDialog, setShowPlanEditDialog] = useState(false);
  const [planEditForm, setPlanEditForm] = useState({ quantity: 1, unitPrice: 0.01, expectedDeliveryDate: '' });
  const [planEditSaving, setPlanEditSaving] = useState(false);
  const [selectedPlanRows, setSelectedPlanRows] = useState<number[]>([]);
  const [selectedOrderRows, setSelectedOrderRows] = useState<number[]>([]);
  const [selectedOrderDetailId, setSelectedOrderDetailId] = useState<number | null>(null);
  const [showOrderDetailDialog, setShowOrderDetailDialog] = useState(false);
  const [selectedDeliveryRows, setSelectedDeliveryRows] = useState<number[]>([]);
  const [showDeliveryDialog, setShowDeliveryDialog] = useState(false);
  const [deliveryContext, setDeliveryContext] = useState<DeliveryEdit | null>(null);
  const [deliveryDate, setDeliveryDate] = useState('');
  const [deliveryRemark, setDeliveryRemark] = useState('');
  const [deliverySaving, setDeliverySaving] = useState(false);
  const [deliveryOrders, setDeliveryOrders] = useState<DeliveryOrder[]>(mockDeliveryOrders);
  const [deliveryItems, setDeliveryItems] = useState<DeliveryItem[]>([
    { id: 1, productCode: 'YLQX20240001', productName: '医用口罩', spec: '10只/盒', model: 'KZ-01', unit: '盒', unitPrice: 35.0, manufacturer: 'XX厂家', planQty: 100, deliveredQty: 100, productionDate: '2024-03-01', expiryDate: '2026-03-01', batchNo: 'B20240301', remark: '' },
    { id: 2, productCode: 'YLQX20240002', productName: '医用防护口罩', spec: '20支/盒', model: 'KZ-02', unit: '盒', unitPrice: 68.0, manufacturer: 'YY厂家', planQty: 50, deliveredQty: 30, productionDate: '2024-03-05', expiryDate: '2026-03-05', batchNo: 'B20240305', remark: '' },
  ]);

  const [planSearchForm, setPlanSearchForm] = useState({ productCode: '', productName: '', manufacturer: '', orderNo: '', startDate: '', endDate: '', registrationNo: '' });

  const [deliverySearchForm, setDeliverySearchForm] = useState({ productCode: '', productName: '', manufacturer: '', orderNo: '', startDate: '', endDate: '', registrationNo: '', deliveryNo: '' });

  const emptyOrderSearchForm: PurchaseOrderSearchParams = { orderNo: '', sourcePlan: '', productName: '', hospital: '', startDate: '', endDate: '' };
  const [orderSearchForm, setOrderSearchForm] = useState<PurchaseOrderSearchParams>(emptyOrderSearchForm);
  const [orderSearchParams, setOrderSearchParams] = useState<PurchaseOrderSearchParams>(emptyOrderSearchForm);
  const [orderDetailSearchForm, setOrderDetailSearchForm] = useState({ productCode: '', productName: '', batchNo: '', manufacturer: '' });
  const [orderDetailSearchParams, setOrderDetailSearchParams] = useState<PurchaseOrderDetailSearchParams>({ current: 1, size: 10 });

  const purchasePlansQuery = useQuery({ queryKey: ['purchase-plans'], queryFn: () => listPurchasePlans() });
  const purchasePlans = (purchasePlansQuery.data?.records ?? []).map(mapBusinessPlanToPurchasePlan);

  const purchaseOrdersQuery = useQuery({ queryKey: ['purchase-orders', orderSearchParams], queryFn: () => listPurchaseOrders(orderSearchParams) });
  const purchaseOrders = (purchaseOrdersQuery.data?.records ?? []).map(mapBusinessOrderToPurchaseOrder);

  const orderDetailQuery = useQuery({
    queryKey: ['purchase-order-items', selectedOrderDetailId, orderDetailSearchParams],
    queryFn: () => getPurchaseOrderDetails(selectedOrderDetailId as number, orderDetailSearchParams),
    enabled: selectedOrderDetailId !== null,
  });
  const selectedOrderDetail = purchaseOrders.find((order) => order.id === selectedOrderDetailId);
  const orderDetailPage = orderDetailQuery.data;
  const orderDetailItems = orderDetailPage?.records ?? [];
  const orderDetailTotal = orderDetailPage?.total ?? 0;
  const orderDetailCurrent = orderDetailPage?.current ?? orderDetailSearchParams.current ?? 1;
  const orderDetailSize = orderDetailPage?.size ?? orderDetailSearchParams.size ?? 10;
  const orderDetailTotalPages = Math.max(1, Math.ceil(orderDetailTotal / orderDetailSize));

  const handlePlanSelectAll = () => {
    const selectableIds = purchasePlans.filter((plan) => plan.status !== 'pending_approval' || plan.canEdit).map((plan) => plan.id);
    if (selectedPlanRows.length === selectableIds.length) setSelectedPlanRows([]);
    else setSelectedPlanRows(selectableIds);
  };
  const handlePlanSelectRow = (id: number) => {
    const plan = purchasePlans.find((item) => item.id === id);
    if (plan?.status === 'pending_approval' && !plan.canEdit) return;
    if (selectedPlanRows.includes(id)) setSelectedPlanRows(selectedPlanRows.filter((rowId) => rowId !== id));
    else setSelectedPlanRows([...selectedPlanRows, id]);
  };

  const handleApprovePlans = async () => {
    const plans = purchasePlans.filter((plan) => selectedPlanRows.includes(plan.id));
    if (plans.length === 0 || plans.some((plan) => !plan.canApprove)) {
      notify.warning('请选择有审批权限的待审批采购计划');
      return;
    }
    try {
      await Promise.all(plans.map((plan) => approvePurchasePlan(plan.id)));
      setSelectedPlanRows([]);
      await purchasePlansQuery.refetch();
      notify.success(`已通过 ${plans.length} 条采购计划`);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '采购计划审批失败');
    }
  };

  const handleRejectPlans = async () => {
    const plans = purchasePlans.filter((plan) => selectedPlanRows.includes(plan.id));
    if (plans.length === 0 || plans.some((plan) => !plan.canApprove)) {
      notify.warning('请选择有审批权限的待审批采购计划');
      return;
    }
    if (!await confirm({ title: '确认驳回采购计划', description: `确定驳回已选择的 ${plans.length} 条采购计划吗？修改后需重新提交审批。`, confirmText: '驳回', cancelText: '取消', destructive: true })) return;
    try {
      await Promise.all(plans.map((plan) => rejectPurchasePlan(plan.id)));
      setSelectedPlanRows([]);
      await purchasePlansQuery.refetch();
      notify.success(`已驳回 ${plans.length} 条采购计划`);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '采购计划驳回失败');
    }
  };

  const handleSubmitPlans = async () => {
    const plans = purchasePlans.filter(plan => selectedPlanRows.includes(plan.id));
    if (!plans.length || plans.some(plan => plan.status !== 'draft')) { notify.warning('请选择草稿采购计划；驳回计划请先编辑保存'); return; }
    try {
      await Promise.all(plans.map(plan => submitPurchasePlan(plan.id)));
      setSelectedPlanRows([]);
      await purchasePlansQuery.refetch();
      notify.success(`已提交 ${plans.length} 条采购计划审批`);
    } catch (error) { notify.error(error instanceof Error ? error.message : '采购计划提交失败'); }
  };

  const handleOpenPlanEdit = () => {
    const plan = purchasePlans.find((item) => item.id === selectedPlanRows[0]);
    if (!plan?.canEdit) {
      notify.warning('当前采购计划仅可查看');
      return;
    }
    setPlanEditForm({ quantity: plan.planQty, unitPrice: plan.unitPrice, expectedDeliveryDate: plan.planDate });
    setShowPlanEditDialog(true);
  };

  const handleSavePlanEdit = async () => {
    const planId = selectedPlanRows[0];
    if (planId === undefined) return;
    setPlanEditSaving(true);
    try {
      await updatePurchasePlan(planId, planEditForm);
      await purchasePlansQuery.refetch();
      setShowPlanEditDialog(false);
      setSelectedPlanRows([]);
      notify.success('采购计划已更新');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '采购计划更新失败');
    } finally {
      setPlanEditSaving(false);
    }
  };
  const handleOrderSelectAll = () => {
    if (selectedOrderRows.length === purchaseOrders.length) setSelectedOrderRows([]);
    else setSelectedOrderRows(purchaseOrders.map((order) => order.id));
  };
  const handleOrderSelectRow = (id: number) => {
    if (selectedOrderRows.includes(id)) setSelectedOrderRows(selectedOrderRows.filter((rowId) => rowId !== id));
    else setSelectedOrderRows([...selectedOrderRows, id]);
  };
  const handleSearchOrders = () => { setOrderSearchParams({ ...orderSearchForm }); setSelectedOrderRows([]); setSelectedOrderDetailId(null); setShowOrderDetailDialog(false); };
  const handleResetOrderSearch = () => { const nextForm: PurchaseOrderSearchParams = {}; setOrderSearchForm(nextForm); setOrderSearchParams(nextForm); setSelectedOrderRows([]); setSelectedOrderDetailId(null); setShowOrderDetailDialog(false); };
  const handleShowOrderDetail = () => {
    if (selectedOrderRows.length !== 1) { notify.warning('请选择一张采购订单查看明细'); return; }
    setOrderDetailSearchForm({ productCode: '', productName: '', batchNo: '', manufacturer: '' });
    setOrderDetailSearchParams({ current: 1, size: 10 });
    setSelectedOrderDetailId(selectedOrderRows[0]!);
    setShowOrderDetailDialog(true);
  };
  const handleSearchOrderDetails = () => { setOrderDetailSearchParams({ ...orderDetailSearchForm, current: 1, size: orderDetailSize }); };
  const handleResetOrderDetailSearch = () => { setOrderDetailSearchForm({ productCode: '', productName: '', batchNo: '', manufacturer: '' }); setOrderDetailSearchParams({ current: 1, size: orderDetailSize }); };
  const handleChangeOrderDetailPage = (nextPage: number) => { setOrderDetailSearchParams({ ...orderDetailSearchParams, current: Math.min(Math.max(1, nextPage), orderDetailTotalPages) }); };
  const handleChangeOrderDetailSize = (nextSize: number) => { setOrderDetailSearchParams({ ...orderDetailSearchParams, current: 1, size: Math.min(50, Math.max(1, nextSize)) }); };

  const handleExportOrderDetails = () => {
    if (orderDetailItems.length === 0) { notify.warning('当前没有可导出的订单明细'); return; }
    const headers = ['商品编码', '商品名称', '规格', '型号', '单位', '订单数量', '单价', '生产日期', '有效期', '批号', '厂家', '备注'];
    const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = orderDetailItems.map((item) => [item.productCode, item.productName, item.spec, item.model, item.unit, item.deliveredQty, Number(item.unitPrice ?? 0).toFixed(2), item.productionDate ?? '', item.expiryDate ?? '', item.batchNo ?? '', item.manufacturer, item.remark ?? '']);
    const csv = [headers, ...rows].map((row) => row.map(escapeCsv).join(',')).join('\n');
    const blob = new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${selectedOrderDetail?.orderNo ?? 'purchase-order'}-details.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleDeliverySelectAll = () => {
    if (selectedDeliveryRows.length === deliveryOrders.length) setSelectedDeliveryRows([]);
    else setSelectedDeliveryRows(deliveryOrders.map((d) => d.id));
  };
  const handleDeliverySelectRow = (id: number) => {
    if (selectedDeliveryRows.includes(id)) setSelectedDeliveryRows(selectedDeliveryRows.filter((rowId) => rowId !== id));
    else setSelectedDeliveryRows([...selectedDeliveryRows, id]);
  };

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case 'pending_ship': case 'picking': return 'text-[#f59e0b] bg-[#f59e0b]/10';
      case 'shipped': return 'text-[#3b82f6] bg-[#3b82f6]/10';
      case 'arrived': return 'text-[#10b981] bg-[#10b981]/10';
      case 'logistics_exception': return 'text-destructive bg-destructive/10';
      case 'withdrawn': return 'text-muted-foreground bg-muted';
      default: return 'text-foreground bg-muted';
    }
  };
  const getReadableDeliveryStatusText = (status: string) => {
    switch (status) {
      case 'pending_ship': case 'pending_shipment': return '待发货';
      case 'picking': return '拣货中';
      case 'shipped': return '已发货';
      case 'logistics_exception': return '物流异常';
      case 'arrived': return '已到货';
      case 'withdrawn': return '已撤销';
      default: return status;
    }
  };
  const getShipmentStatusText = (status: string) => {
    switch (status) {
      case 'pending_outbound': return '待出库'; case 'outbound': return '已出库';
      case 'transporting': return '运输中'; case 'signed': return '已签收';
      case 'sign_exception': return '签收异常';
      default: return status;
    }
  };
  const getShipmentStatusColor = (status: string) => {
    switch (status) {
      case 'pending_outbound': return 'text-[#f59e0b] bg-[#f59e0b]/10';
      case 'outbound': case 'transporting': return 'text-[#3b82f6] bg-[#3b82f6]/10';
      case 'signed': return 'text-[#10b981] bg-[#10b981]/10';
      case 'sign_exception': return 'text-destructive bg-destructive/10';
      default: return 'text-foreground bg-muted';
    }
  };

  const updateDeliveryQty = (id: number, qty: number) => {
    setDeliveryItems(deliveryItems.map((item) => item.id === id ? { ...item, deliveredQty: Math.min(Math.max(0, qty), item.planQty) } : item));
  };
  const updateItemField = (id: number, field: string, value: string) => {
    setDeliveryItems(deliveryItems.map((item) => item.id === id ? { ...item, [field]: value } : item));
  };

  const selectedDeliveryOrder = deliveryOrders.find((order) => order.id === selectedDeliveryRows[0]);
  const selectedDeliverySubmitted = selectedDeliveryOrder ? ['shipped', 'arrived', 'withdrawn'].includes(selectedDeliveryOrder.status) : false;
  const deliveryDialogLocked = deliveryContext ? ['shipped', 'arrived', 'withdrawn', 'logistics_exception'].includes(deliveryContext.status) : false;

  const applyDeliveryEdit = (deliveryEdit: DeliveryEdit) => {
    setDeliveryContext(deliveryEdit);
    setDeliveryDate(deliveryEdit.deliveryDate ?? new Date().toISOString().slice(0, 10));
    setDeliveryRemark(deliveryEdit.remark ?? '');
    setDeliveryItems(deliveryEdit.items.map((item) => ({
      id: item.id, productCode: item.productCode, productName: item.productName, spec: item.spec ?? '', model: item.model ?? '',
      unit: item.unit ?? '', unitPrice: Number(item.unitPrice ?? 0), manufacturer: item.manufacturer ?? '', planQty: item.planQty,
      deliveredQty: item.deliveredQty, productionDate: item.productionDate ?? '', expiryDate: item.expiryDate ?? '',
      batchNo: item.batchNo ?? '', remark: item.remark ?? '',
    })));
    setDeliveryOrders((orders) => {
      const firstItem = deliveryEdit.items[0];
      const nextOrder: DeliveryOrder = {
        id: deliveryEdit.deliveryId, deliveryNo: deliveryEdit.deliveryNo, orderNo: deliveryEdit.orderNo,
        productCode: firstItem?.productCode ?? '', productName: firstItem?.productName ?? '',
        manufacturer: firstItem?.manufacturer ?? '', planDate: deliveryEdit.deliveryDate ?? new Date().toISOString().slice(0, 10),
        status: deliveryEdit.status as DeliveryOrder['status'],
      };
      const exists = orders.some((order) => order.id === nextOrder.id);
      return exists ? orders.map((order) => order.id === nextOrder.id ? nextOrder : order) : [nextOrder, ...orders];
    });
  };

  const handleConvertPlanToOrder = async () => {
    if (selectedPlanRows.length !== 1) { notify.warning('请选择一条采购计划进行计划转订单'); return; }
    const selectedPlan = purchasePlans.find((plan) => plan.id === selectedPlanRows[0]);
    if (!selectedPlan) return;
    setDeliverySaving(true);
    try {
      const deliveryEdit = await createDeliveryEditByPlan(selectedPlan.orderNo);
      applyDeliveryEdit(deliveryEdit);
      setActiveTab('order');
      setShowDeliveryDialog(true);
      notify.success(`计划转订单已创建：采购计划 ${deliveryEdit.planNo}、采购订单 ${deliveryEdit.orderNo}`);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '计划转订单失败');
    } finally { setDeliverySaving(false); }
    setSelectedDeliveryRows([]);
    setSelectedPlanRows([]);
  };

  const handleSaveDeliveryEdit = async (submitted = false) => {
    if (!deliveryContext) { notify.warning('请先选择采购计划进行计划转订单'); return; }
    if (deliveryDialogLocked) { notify.warning(`采购订单 ${deliveryContext.orderNo} 已${getReadableDeliveryStatusText(deliveryContext.status)}，不可重复保存`); return; }
    setDeliverySaving(true);
    try {
      const saved = await saveDeliveryEdit(deliveryContext.deliveryId, {
        deliveryDate: deliveryDate || null, remark: deliveryRemark, submitted,
        items: deliveryItems.map((item) => ({
          id: item.id, productId: deliveryContext.items.find((source) => source.id === item.id)?.productId ?? 0,
          planQty: item.planQty, deliveredQty: item.deliveredQty, productionDate: item.productionDate || null,
          expiryDate: item.expiryDate || null, batchNo: item.batchNo, remark: item.remark,
        })),
      });
      applyDeliveryEdit(saved);
      setActiveTab('order');
      setSelectedDeliveryRows([saved.deliveryId]);
      setShowDeliveryDialog(false);
      notify.success(submitted ? `采购订单 ${saved.orderNo} 已生成` : `计划转订单草稿已保存`);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '采购订单保存失败');
    } finally { setDeliverySaving(false); }
  };

  const handleSubmitSelectedDelivery = async () => {
    if (!selectedDeliveryOrder) { notify.warning('请选择一张配送单'); return; }
    if (selectedDeliverySubmitted) { notify.warning('已确认配送的配送单不可重复确认'); return; }
    setDeliverySaving(true);
    try {
      await submitDelivery(selectedDeliveryOrder.id);
      setDeliveryOrders((orders) => orders.map((order) => order.id === selectedDeliveryOrder.id ? { ...order, status: 'shipped' } : order));
      notify.success(`配送单 ${selectedDeliveryOrder.deliveryNo} 已确认配送`);
    } catch (error) { notify.error(error instanceof Error ? error.message : '确认配送失败'); } finally { setDeliverySaving(false); }
  };

  const handleDeleteDeliveryOrders = async () => {
    if (selectedDeliveryRows.length === 0) { notify.warning('请选择要删除的配送单'); return; }
    const confirmed = await confirm({ title: '确认删除配送单', description: `确定删除已选择 ${selectedDeliveryRows.length} 张配送单吗？`, confirmText: '删除', cancelText: '取消', destructive: true });
    if (!confirmed) return;
    setDeliverySaving(true);
    try {
      await deleteDeliveryOrders(selectedDeliveryRows);
      setDeliveryOrders((orders) => orders.filter((order) => !selectedDeliveryRows.includes(order.id)));
      setSelectedDeliveryRows([]);
      notify.success('配送单已删除');
    } catch (error) { notify.error(error instanceof Error ? error.message : '配送单删除失败'); } finally { setDeliverySaving(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 border-b border-border">
        <button onClick={() => setActiveTab('plan')}
          className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'plan' ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          采购计划
        </button>
        <button onClick={() => setActiveTab('order')}
          className={`px-4 py-2 border-b-2 transition-colors ${activeTab === 'order' ? 'border-primary text-primary font-medium' : 'border-transparent text-muted-foreground hover:text-foreground'}`}>
          采购订单
        </button>
      </div>

      {activeTab === 'plan' && (
        <PurchasePlansTab
          purchasePlans={purchasePlans}
          selectedPlanRows={selectedPlanRows}
          onSelectPlanRow={handlePlanSelectRow}
          onSelectPlanAll={handlePlanSelectAll}
          onApprovePlans={handleApprovePlans}
          onRejectPlans={handleRejectPlans}
          onSubmitPlans={handleSubmitPlans}
          canSubmitPlans={isAdministrator || getStoredAuthUser()?.permissions.includes('purchasePlans:submit') === true}
          error={purchasePlansQuery.error?.message}
          canConfigureApproval={isAdministrator}
          onConfigureApproval={() => setShowApprovalScopeDialog(true)}
          onEditPlan={handleOpenPlanEdit}
          onConvertPlanToOrder={handleConvertPlanToOrder}
          isLoading={purchasePlansQuery.isLoading}
          planSearchForm={planSearchForm}
          onUpdatePlanSearchForm={setPlanSearchForm}
          onResetPlanSearch={() => setPlanSearchForm({ productCode: '', productName: '', manufacturer: '', orderNo: '', startDate: '', endDate: '', registrationNo: '' })}
        />
      )}

      {activeTab === 'order' && (
        <PurchaseOrdersTab
          purchaseOrders={purchaseOrders}
          selectedOrderRows={selectedOrderRows}
          onSelectOrderRow={handleOrderSelectRow}
          onSelectOrderAll={handleOrderSelectAll}
          orderSearchForm={orderSearchForm}
          onUpdateOrderSearchForm={setOrderSearchForm}
          onSearchOrders={handleSearchOrders}
          onResetOrderSearch={handleResetOrderSearch}
          onShowOrderDetail={handleShowOrderDetail}
          showOrderDetailDialog={showOrderDetailDialog}
          onCloseOrderDetail={() => setShowOrderDetailDialog(false)}
          selectedOrderDetail={selectedOrderDetail}
          orderDetailSearchForm={orderDetailSearchForm}
          onUpdateDetailSearchForm={setOrderDetailSearchForm}
          onSearchDetails={handleSearchOrderDetails}
          onResetDetailSearch={handleResetOrderDetailSearch}
          onExportDetails={handleExportOrderDetails}
          orderDetailItems={orderDetailItems}
          orderDetailCurrent={orderDetailCurrent}
          orderDetailTotalPages={orderDetailTotalPages}
          orderDetailTotal={orderDetailTotal}
          orderDetailSize={orderDetailSize}
          onChangeDetailPage={handleChangeOrderDetailPage}
          onChangeDetailSize={handleChangeOrderDetailSize}
          isLoading={purchaseOrdersQuery.isFetching}
          error={purchaseOrdersQuery.error?.message}
          isDetailLoading={orderDetailQuery.isFetching}
          detailError={orderDetailQuery.error?.message}
        />
      )}

      {/* Hidden delivery & shipment tabs (preserved for reference) */}
      {false && (
        <div className="space-y-4">
          <div className="p-5 border border-border rounded-lg bg-background">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div><label className="block text-sm mb-2">商品编码</label>
                <input type="text" placeholder="请输入商品编码" value={deliverySearchForm.productCode}
                  onChange={(e) => setDeliverySearchForm({ ...deliverySearchForm, productCode: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="block text-sm mb-2">商品名称</label>
                <input type="text" placeholder="请输入商品名称" value={deliverySearchForm.productName}
                  onChange={(e) => setDeliverySearchForm({ ...deliverySearchForm, productName: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="block text-sm mb-2">厂家</label>
                <input type="text" placeholder="请输入厂家" value={deliverySearchForm.manufacturer}
                  onChange={(e) => setDeliverySearchForm({ ...deliverySearchForm, manufacturer: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="block text-sm mb-2">采购订单号</label>
                <input type="text" placeholder="请输入采购订单号" value={deliverySearchForm.orderNo}
                  onChange={(e) => setDeliverySearchForm({ ...deliverySearchForm, orderNo: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="block text-sm mb-2">计划时间</label>
                <div className="flex items-center gap-2">
                  <input type="date" value={deliverySearchForm.startDate}
                    onChange={(e) => setDeliverySearchForm({ ...deliverySearchForm, startDate: e.target.value })}
                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
                  <span className="text-muted-foreground">~</span>
                  <input type="date" value={deliverySearchForm.endDate}
                    onChange={(e) => setDeliverySearchForm({ ...deliverySearchForm, endDate: e.target.value })}
                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" /></div></div>
              <div><label className="block text-sm mb-2">注册证号</label>
                <input type="text" placeholder="请输入注册证号" value={deliverySearchForm.registrationNo}
                  onChange={(e) => setDeliverySearchForm({ ...deliverySearchForm, registrationNo: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" /></div>
              <div><label className="block text-sm mb-2">配送单号</label>
                <input type="text" placeholder="请输入配送单号" value={deliverySearchForm.deliveryNo}
                  onChange={(e) => setDeliverySearchForm({ ...deliverySearchForm, deliveryNo: e.target.value })}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" /></div>
            </div>
            <div className="flex gap-3">
              <button className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"><Search className="size-4" /> 查询</button>
              <button className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors">重置</button>
            </div>
          </div>
          <div className="p-4 border border-border rounded-lg bg-background">
            <div className="flex items-center gap-2 flex-wrap">
              <button onClick={() => setShowDeliveryDialog(true)} disabled={selectedDeliveryRows.length !== 1 || selectedDeliverySubmitted}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <Edit className="size-4" /> 编辑
              </button>
              <button onClick={handleSubmitSelectedDelivery} disabled={selectedDeliveryRows.length !== 1 || selectedDeliverySubmitted || deliverySaving}
                className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <Send className="size-4" /> 确认配送
              </button>
              <button onClick={handleDeleteDeliveryOrders} disabled={selectedDeliveryRows.length === 0 || deliverySaving}
                className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <Trash2 className="size-4" /> 删除
              </button>
              <button disabled={selectedDeliveryRows.length !== 1}
                className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed">
                <Printer className="size-4" /> 打印
              </button>
            </div>
          </div>
          <div className="border border-border rounded-lg bg-background overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left"><input type="checkbox" checked={selectedDeliveryRows.length === deliveryOrders.length && deliveryOrders.length > 0} onChange={handleDeliverySelectAll} className="size-4 rounded border-border" /></th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">配送单号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">采购订单号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">商品编码</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">商品名称</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">厂家</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">计划时间</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {deliveryOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3"><input type="checkbox" checked={selectedDeliveryRows.includes(order.id)} onChange={() => handleDeliverySelectRow(order.id)} className="size-4 rounded border-border" /></td>
                      <td className="px-4 py-3 font-medium">{order.deliveryNo}</td>
                      <td className="px-4 py-3 text-sm">{order.orderNo}</td>
                      <td className="px-4 py-3 text-sm font-mono">{order.productCode}</td>
                      <td className="px-4 py-3">{order.productName}</td>
                      <td className="px-4 py-3 text-sm">{order.manufacturer}</td>
                      <td className="px-4 py-3 text-sm">{order.planDate}</td>
                      <td className="px-4 py-3"><div className="flex justify-center"><span className={`px-2 py-1 rounded text-xs ${getDeliveryStatusColor(order.status)}`}>{getReadableDeliveryStatusText(order.status)}</span></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">每页25条 · 共{deliveryOrders.length}条</div>
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
      )}
      {false && (
        <div className="space-y-4">
          <div className="p-4 border border-border rounded-lg bg-background">
            <div className="text-sm text-muted-foreground">发货单是配送单的实际出库与物流凭证，记录批号、承运方、出库和签收状态。</div>
            <div className="border border-border rounded-lg bg-background overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">发货单号</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">配送单号</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">承运方</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">批号</th>
                      <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">发货日期</th>
                      <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">状态</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border">
                    {mockShipments.map((shipment) => (
                      <tr key={shipment.id} className="hover:bg-accent/50 transition-colors">
                        <td className="px-4 py-3 font-medium">{shipment.shipmentNo}</td>
                        <td className="px-4 py-3 text-sm">{shipment.deliveryNo}</td>
                        <td className="px-4 py-3">{shipment.carrier}</td>
                        <td className="px-4 py-3 text-sm">{shipment.batchNo}</td>
                        <td className="px-4 py-3 text-sm">{shipment.shipDate}</td>
                        <td className="px-4 py-3 text-center"><span className={`px-2 py-1 rounded text-xs ${getShipmentStatusColor(shipment.status)}`}>{getShipmentStatusText(shipment.status)}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      <DeliveryEditDialog
        open={showDeliveryDialog}
        onClose={() => setShowDeliveryDialog(false)}
        deliveryContext={deliveryContext}
        deliveryDate={deliveryDate}
        deliveryRemark={deliveryRemark}
        deliveryItems={deliveryItems}
        deliverySaving={deliverySaving}
        deliveryDialogLocked={deliveryDialogLocked}
        onSave={handleSaveDeliveryEdit}
        onUpdateDate={setDeliveryDate}
        onUpdateRemark={setDeliveryRemark}
        onUpdateItemField={updateItemField}
        onUpdateItemQty={updateDeliveryQty}
      />
      <ApprovalScopeDialog
        open={showApprovalScopeDialog}
        onClose={() => setShowApprovalScopeDialog(false)}
        onSaved={() => purchasePlansQuery.refetch()}
      />
      {showPlanEditDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-lg bg-background shadow-xl">
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <div>
                <h3 className="font-semibold">编辑采购计划</h3>
                <p className="mt-1 text-sm text-muted-foreground">待审批数据仅限已配置的角色、用户及管理员修改。</p>
              </div>
              <button type="button" onClick={() => setShowPlanEditDialog(false)} aria-label="关闭" className="rounded p-1 hover:bg-accent"><X className="size-5" /></button>
            </div>
            <div className="grid gap-4 p-6 sm:grid-cols-2">
              <label className="text-sm">计划数量
                <input type="number" min="1" value={planEditForm.quantity}
                  onChange={(event) => setPlanEditForm({ ...planEditForm, quantity: Number(event.target.value) })}
                  className="mt-2 w-full rounded-lg border border-border bg-input-background px-3 py-2" />
              </label>
              <label className="text-sm">单价
                <input type="number" min="0.0001" step="0.0001" value={planEditForm.unitPrice}
                  onChange={(event) => setPlanEditForm({ ...planEditForm, unitPrice: Number(event.target.value) })}
                  className="mt-2 w-full rounded-lg border border-border bg-input-background px-3 py-2" />
              </label>
              <label className="text-sm sm:col-span-2">预计配送日期
                <input type="date" value={planEditForm.expectedDeliveryDate}
                  onChange={(event) => setPlanEditForm({ ...planEditForm, expectedDeliveryDate: event.target.value })}
                  className="mt-2 w-full rounded-lg border border-border bg-input-background px-3 py-2" />
              </label>
            </div>
            <div className="flex justify-end gap-3 border-t border-border px-6 py-4">
              <button type="button" onClick={() => setShowPlanEditDialog(false)} className="rounded-lg border border-border px-5 py-2 hover:bg-accent">取消</button>
              <button type="button" onClick={handleSavePlanEdit}
                disabled={planEditSaving || planEditForm.quantity < 1 || planEditForm.unitPrice <= 0 || !planEditForm.expectedDeliveryDate}
                className="rounded-lg bg-primary px-5 py-2 text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50">
                {planEditSaving ? '保存中...' : '确认保存'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
