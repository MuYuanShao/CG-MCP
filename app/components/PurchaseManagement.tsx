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
  createDeliveryEditByPlan,
  deleteDeliveryOrders,
  getPurchaseOrderDetails,
  listPurchasePlans,
  listPurchaseOrders,
  saveDeliveryEdit,
  submitDelivery,
  type BusinessDocument,
  type DeliveryEdit,
  type PurchaseOrderDetailSearchParams,
  type PurchaseOrderSearchParams,
} from '../services/purchase';

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
  status: 'pending' | 'partial' | 'completed';
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
  {
    id: 1,
    orderNo: 'PP-DEMO-9001',
    productCode: 'YLQX20240001',
    productName: '医用口罩',
    spec: '10只/盒',
    model: 'KZ-01',
    unit: '盒',
    planQty: 100,
    unitPrice: 35.0,
    registrationNo: 'ZC123456',
    manufacturer: 'XX厂家',
    planDate: '2024-04-01',
    status: 'pending',
  },
  {
    id: 2,
    orderNo: 'PP202604130002',
    productCode: 'YLQX20240002',
    productName: '医用防护口罩',
    spec: '20支/盒',
    model: 'KZ-02',
    unit: '盒',
    planQty: 50,
    unitPrice: 68.0,
    registrationNo: 'ZC789012',
    manufacturer: 'YY厂家',
    planDate: '2024-04-02',
    status: 'pending',
  },
  {
    id: 3,
    orderNo: 'CG20240003',
    productCode: 'YLQX20240003',
    productName: '一次性手套',
    spec: '100只/盒',
    model: 'ST-01',
    unit: '盒',
    planQty: 200,
    unitPrice: 45.0,
    registrationNo: 'ZC345678',
    manufacturer: 'ZZ厂家',
    planDate: '2024-04-03',
    status: 'partial',
  },
];

const mockDeliveryOrders: DeliveryOrder[] = [
  {
    id: 1,
    deliveryNo: 'PS20240001',
    orderNo: 'PO202604120001',
    productCode: 'YLQX20240001',
    productName: '医用口罩',
    manufacturer: 'XX厂家',
    planDate: '2024-04-01',
    status: 'arrived',
  },
  {
    id: 2,
    deliveryNo: 'PS20240002',
    orderNo: 'PO202604120002',
    productCode: 'YLQX20240002',
    productName: '医用防护口罩',
    manufacturer: 'YY厂家',
    planDate: '2024-04-02',
    status: 'shipped',
  },
  {
    id: 3,
    deliveryNo: 'PS20240003',
    orderNo: 'PO202604110015',
    productCode: 'YLQX20240003',
    productName: '一次性手套',
    manufacturer: 'ZZ厂家',
    planDate: '2024-04-03',
    status: 'pending_ship',
  },
];

const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: 1,
    orderNo: 'PO202604120001',
    planNo: 'CG20240001',
    hospital: '浙江省人民医院',
    productName: '医用口罩',
    totalAmount: 3500,
    orderDate: '2026-04-12',
    status: 'confirmed',
  },
  {
    id: 2,
    orderNo: 'PO202604120002',
    planNo: 'CG20240002',
    hospital: '浙江大学医学院附属第一医院',
    productName: '医用防护口罩',
    totalAmount: 3400,
    orderDate: '2026-04-12',
    status: 'partial_shipped',
  },
  {
    id: 3,
    orderNo: 'PO202604110015',
    planNo: 'CG20240003',
    hospital: '宁波市第一医院',
    productName: '一次性手套',
    totalAmount: 9000,
    orderDate: '2026-04-11',
    status: 'pending_confirm',
  },
];

const mockShipments: ShipmentOrder[] = [
  {
    id: 1,
    shipmentNo: 'FH202604120001',
    deliveryNo: 'PS20240001',
    carrier: '顺丰医药冷链',
    batchNo: 'B20240301',
    shipDate: '2026-04-13',
    status: 'signed',
  },
  {
    id: 2,
    shipmentNo: 'FH202604120002',
    deliveryNo: 'PS20240002',
    carrier: '京东物流',
    batchNo: 'B20240305',
    shipDate: '2026-04-13',
    status: 'transporting',
  },
  {
    id: 3,
    shipmentNo: 'FH202604110006',
    deliveryNo: 'PS20240003',
    carrier: '待分配',
    batchNo: '-',
    shipDate: '-',
    status: 'pending_outbound',
  },
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
  status: plan.status === 'ordered' ? 'completed' : plan.status === 'partial_ordered' ? 'partial' : 'pending',
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

export default function PurchaseManagement() {
  const { notify, confirm } = useFeedback();
  const [activeTab, setActiveTab] = useState<'plan' | 'order'>('plan');
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
    {
      id: 1,
      productCode: 'YLQX20240001',
      productName: '医用口罩',
      spec: '10只/盒',
      model: 'KZ-01',
      unit: '盒',
      unitPrice: 35.0,
      manufacturer: 'XX厂家',
      planQty: 100,
      deliveredQty: 100,
      productionDate: '2024-03-01',
      expiryDate: '2026-03-01',
      batchNo: 'B20240301',
      remark: '',
    },
    {
      id: 2,
      productCode: 'YLQX20240002',
      productName: '医用防护口罩',
      spec: '20支/盒',
      model: 'KZ-02',
      unit: '盒',
      unitPrice: 68.0,
      manufacturer: 'YY厂家',
      planQty: 50,
      deliveredQty: 30,
      productionDate: '2024-03-05',
      expiryDate: '2026-03-05',
      batchNo: 'B20240305',
      remark: '',
    },
  ]);

  const [planSearchForm, setPlanSearchForm] = useState({
    productCode: '',
    productName: '',
    manufacturer: '',
    orderNo: '',
    startDate: '',
    endDate: '',
    registrationNo: '',
  });

  const [deliverySearchForm, setDeliverySearchForm] = useState({
    productCode: '',
    productName: '',
    manufacturer: '',
    orderNo: '',
    startDate: '',
    endDate: '',
    registrationNo: '',
    deliveryNo: '',
  });

  const emptyOrderSearchForm: PurchaseOrderSearchParams = {
    orderNo: '',
    sourcePlan: '',
    productName: '',
    hospital: '',
    startDate: '',
    endDate: '',
  };
  const [orderSearchForm, setOrderSearchForm] = useState<PurchaseOrderSearchParams>(emptyOrderSearchForm);
  const [orderSearchParams, setOrderSearchParams] = useState<PurchaseOrderSearchParams>(emptyOrderSearchForm);
  const [orderDetailSearchForm, setOrderDetailSearchForm] = useState({
    productCode: '',
    productName: '',
    batchNo: '',
    manufacturer: '',
  });
  const [orderDetailSearchParams, setOrderDetailSearchParams] = useState<PurchaseOrderDetailSearchParams>({
    current: 1,
    size: 10,
  });

  const purchasePlansQuery = useQuery({
    queryKey: ['purchase-plans'],
    queryFn: listPurchasePlans,
  });
  const purchasePlans = (purchasePlansQuery.data ?? []).map(mapBusinessPlanToPurchasePlan);

  const purchaseOrdersQuery = useQuery({
    queryKey: ['purchase-orders', orderSearchParams],
    queryFn: () => listPurchaseOrders(orderSearchParams),
  });
  const purchaseOrders = (purchaseOrdersQuery.data ?? []).map(mapBusinessOrderToPurchaseOrder);

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
    if (selectedPlanRows.length === purchasePlans.length) {
      setSelectedPlanRows([]);
    } else {
      setSelectedPlanRows(purchasePlans.map((p) => p.id));
    }
  };

  const handlePlanSelectRow = (id: number) => {
    if (selectedPlanRows.includes(id)) {
      setSelectedPlanRows(selectedPlanRows.filter((rowId) => rowId !== id));
    } else {
      setSelectedPlanRows([...selectedPlanRows, id]);
    }
  };

  const handleOrderSelectAll = () => {
    if (selectedOrderRows.length === purchaseOrders.length) {
      setSelectedOrderRows([]);
    } else {
      setSelectedOrderRows(purchaseOrders.map((order) => order.id));
    }
  };

  const handleOrderSelectRow = (id: number) => {
    if (selectedOrderRows.includes(id)) {
      setSelectedOrderRows(selectedOrderRows.filter((rowId) => rowId !== id));
    } else {
      setSelectedOrderRows([...selectedOrderRows, id]);
    }
  };

  const handleSearchOrders = () => {
    setOrderSearchParams({ ...orderSearchForm });
    setSelectedOrderRows([]);
    setSelectedOrderDetailId(null);
    setShowOrderDetailDialog(false);
  };

  const handleResetOrderSearch = () => {
    const nextForm = { ...emptyOrderSearchForm };
    setOrderSearchForm(nextForm);
    setOrderSearchParams(nextForm);
    setSelectedOrderRows([]);
    setSelectedOrderDetailId(null);
    setShowOrderDetailDialog(false);
  };

  const handleShowOrderDetail = () => {
    if (selectedOrderRows.length !== 1) {
      notify.warning('请选择一张采购订单查看明细');
      return;
    }
    setOrderDetailSearchForm({
      productCode: '',
      productName: '',
      batchNo: '',
      manufacturer: '',
    });
    setOrderDetailSearchParams({ current: 1, size: 10 });
    setSelectedOrderDetailId(selectedOrderRows[0]);
    setShowOrderDetailDialog(true);
  };

  const handleSearchOrderDetails = () => {
    setOrderDetailSearchParams({
      ...orderDetailSearchForm,
      current: 1,
      size: orderDetailSize,
    });
  };

  const handleResetOrderDetailSearch = () => {
    setOrderDetailSearchForm({
      productCode: '',
      productName: '',
      batchNo: '',
      manufacturer: '',
    });
    setOrderDetailSearchParams({
      current: 1,
      size: orderDetailSize,
    });
  };

  const handleChangeOrderDetailPage = (nextPage: number) => {
    setOrderDetailSearchParams({
      ...orderDetailSearchParams,
      current: Math.min(Math.max(1, nextPage), orderDetailTotalPages),
    });
  };

  const handleChangeOrderDetailSize = (nextSize: number) => {
    setOrderDetailSearchParams({
      ...orderDetailSearchParams,
      current: 1,
      size: Math.min(50, Math.max(1, nextSize)),
    });
  };

  const handleExportOrderDetails = () => {
    if (orderDetailItems.length === 0) {
      notify.warning('当前没有可导出的订单明细');
      return;
    }
    const headers = ['商品编码', '商品名称', '规格', '型号', '单位', '订单数量', '单价', '生产日期', '有效期', '批号', '厂家', '备注'];
    const escapeCsv = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const rows = orderDetailItems.map((item) => [
      item.productCode,
      item.productName,
      item.spec,
      item.model,
      item.unit,
      item.deliveredQty,
      Number(item.unitPrice ?? 0).toFixed(2),
      item.productionDate ?? '',
      item.expiryDate ?? '',
      item.batchNo ?? '',
      item.manufacturer,
      item.remark ?? '',
    ]);
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
    if (selectedDeliveryRows.length === deliveryOrders.length) {
      setSelectedDeliveryRows([]);
    } else {
      setSelectedDeliveryRows(deliveryOrders.map((d) => d.id));
    }
  };

  const handleDeliverySelectRow = (id: number) => {
    if (selectedDeliveryRows.includes(id)) {
      setSelectedDeliveryRows(selectedDeliveryRows.filter((rowId) => rowId !== id));
    } else {
      setSelectedDeliveryRows([...selectedDeliveryRows, id]);
    }
  };

  const getPlanStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'text-[#f59e0b] bg-[#f59e0b]/10';
      case 'partial':
        return 'text-[#3b82f6] bg-[#3b82f6]/10';
      case 'completed':
        return 'text-[#10b981] bg-[#10b981]/10';
      default:
        return 'text-foreground bg-muted';
    }
  };

  const getPlanStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return '待转换';
      case 'partial':
        return '部分转单';
      case 'completed':
        return '已转换';
      default:
        return status;
    }
  };

  const getDeliveryStatusColor = (status: string) => {
    switch (status) {
      case 'pending_ship':
      case 'picking':
        return 'text-[#f59e0b] bg-[#f59e0b]/10';
      case 'shipped':
        return 'text-[#3b82f6] bg-[#3b82f6]/10';
      case 'arrived':
        return 'text-[#10b981] bg-[#10b981]/10';
      case 'logistics_exception':
        return 'text-destructive bg-destructive/10';
      case 'withdrawn':
        return 'text-muted-foreground bg-muted';
      default:
        return 'text-foreground bg-muted';
    }
  };

  const getDeliveryStatusText = (status: string) => {
    switch (status) {
      case 'pending_ship':
        return '待发货';
      case 'picking':
        return '拣货中';
      case 'shipped':
        return '已发货';
      case 'logistics_exception':
        return '物流异常';
      case 'arrived':
        return '已到货';
      case 'withdrawn':
        return '已撤销';
      default:
        return status;
    }
  };

  const getReadableDeliveryStatusText = (status: string) => {
    switch (status) {
      case 'pending_ship':
      case 'pending_shipment':
        return '待发货';
      case 'picking':
        return '拣货中';
      case 'shipped':
        return '已发货';
      case 'logistics_exception':
        return '物流异常';
      case 'arrived':
        return '已到货';
      case 'withdrawn':
        return '已撤销';
      default:
        return status;
    }
  };

  const getOrderStatusText = (status: string) => {
    switch (status) {
      case 'pending_confirm': return '待确认';
      case 'confirmed': return '已确认';
      case 'partial_shipped': return '部分发货';
      case 'shipped': return '已发货';
      case 'arrived': return '已到货';
      case 'accepted': return '已验收';
      case 'completed': return '已完成';
      case 'closed': return '已关闭';
      default: return status;
    }
  };

  const getShipmentStatusText = (status: string) => {
    switch (status) {
      case 'pending_outbound': return '待出库';
      case 'outbound': return '已出库';
      case 'transporting': return '运输中';
      case 'signed': return '已签收';
      case 'sign_exception': return '签收异常';
      default: return status;
    }
  };

  const getShipmentStatusColor = (status: string) => {
    switch (status) {
      case 'pending_outbound': return 'text-[#f59e0b] bg-[#f59e0b]/10';
      case 'outbound':
      case 'transporting': return 'text-[#3b82f6] bg-[#3b82f6]/10';
      case 'signed': return 'text-[#10b981] bg-[#10b981]/10';
      case 'sign_exception': return 'text-destructive bg-destructive/10';
      default: return 'text-foreground bg-muted';
    }
  };

  const updateDeliveryQty = (id: number, qty: number) => {
    setDeliveryItems(
      deliveryItems.map((item) =>
        item.id === id ? { ...item, deliveredQty: Math.min(Math.max(0, qty), item.planQty) } : item
      )
    );
  };

  const updateItemField = (id: number, field: string, value: string) => {
    setDeliveryItems(
      deliveryItems.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const selectedDeliveryOrder = deliveryOrders.find((order) => order.id === selectedDeliveryRows[0]);
  const selectedDeliverySubmitted = selectedDeliveryOrder
    ? ['shipped', 'arrived', 'withdrawn'].includes(selectedDeliveryOrder.status)
    : false;
  const deliveryDialogLocked = deliveryContext
    ? ['shipped', 'arrived', 'withdrawn', 'logistics_exception'].includes(deliveryContext.status)
    : false;

  const applyDeliveryEdit = (deliveryEdit: DeliveryEdit) => {
    setDeliveryContext(deliveryEdit);
    setDeliveryDate(deliveryEdit.deliveryDate ?? new Date().toISOString().slice(0, 10));
    setDeliveryRemark(deliveryEdit.remark ?? '');
    setDeliveryItems(
      deliveryEdit.items.map((item) => ({
        id: item.id,
        productCode: item.productCode,
        productName: item.productName,
        spec: item.spec ?? '',
        model: item.model ?? '',
        unit: item.unit ?? '',
        unitPrice: Number(item.unitPrice ?? 0),
        manufacturer: item.manufacturer ?? '',
        planQty: item.planQty,
        deliveredQty: item.deliveredQty,
        productionDate: item.productionDate ?? '',
        expiryDate: item.expiryDate ?? '',
        batchNo: item.batchNo ?? '',
        remark: item.remark ?? '',
      })),
    );
    setDeliveryOrders((orders) => {
      const firstItem = deliveryEdit.items[0];
      const nextOrder: DeliveryOrder = {
        id: deliveryEdit.deliveryId,
        deliveryNo: deliveryEdit.deliveryNo,
        orderNo: deliveryEdit.orderNo,
        productCode: firstItem?.productCode ?? '',
        productName: firstItem?.productName ?? '',
        manufacturer: firstItem?.manufacturer ?? '',
        planDate: deliveryEdit.deliveryDate ?? new Date().toISOString().slice(0, 10),
        status: deliveryEdit.status as DeliveryOrder['status'],
      };
      const exists = orders.some((order) => order.id === nextOrder.id);
      return exists
        ? orders.map((order) => (order.id === nextOrder.id ? nextOrder : order))
        : [nextOrder, ...orders];
    });
  };

  const handleConvertPlanToOrder = async () => {
    if (selectedPlanRows.length !== 1) {
      notify.warning('请选择一条采购计划进行计划转订单');
      return;
    }
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
    } finally {
      setDeliverySaving(false);
    }
    setSelectedDeliveryRows([]);
    setSelectedPlanRows([]);
  };

  const handleSaveDeliveryEdit = async (submitted = false) => {
    if (!deliveryContext) {
      notify.warning('请先选择采购计划进行计划转订单');
      return;
    }
    if (deliveryDialogLocked) {
      notify.warning(`采购订单 ${deliveryContext.orderNo} 已${getReadableDeliveryStatusText(deliveryContext.status)}，不可重复保存`);
      return;
    }
    setDeliverySaving(true);
    try {
      const saved = await saveDeliveryEdit(deliveryContext.deliveryId, {
        deliveryDate: deliveryDate || null,
        remark: deliveryRemark,
        submitted,
        items: deliveryItems.map((item) => ({
          id: item.id,
          productId: deliveryContext.items.find((source) => source.id === item.id)?.productId ?? 0,
          planQty: item.planQty,
          deliveredQty: item.deliveredQty,
          productionDate: item.productionDate || null,
          expiryDate: item.expiryDate || null,
          batchNo: item.batchNo,
          remark: item.remark,
        })),
      });
      applyDeliveryEdit(saved);
      setActiveTab('order');
      setSelectedDeliveryRows([saved.deliveryId]);
      setShowDeliveryDialog(false);
      notify.success(submitted ? `采购订单 ${saved.orderNo} 已生成` : `计划转订单草稿已保存`);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '采购订单保存失败');
    } finally {
      setDeliverySaving(false);
    }
  };

  const handleSubmitSelectedDelivery = async () => {
    if (!selectedDeliveryOrder) {
      notify.warning('请选择一张配送单');
      return;
    }
    if (selectedDeliverySubmitted) {
      notify.warning('已确认配送的配送单不可重复确认');
      return;
    }
    setDeliverySaving(true);
    try {
      await submitDelivery(selectedDeliveryOrder.id);
      setDeliveryOrders((orders) =>
        orders.map((order) =>
          order.id === selectedDeliveryOrder.id ? { ...order, status: 'shipped' } : order,
        ),
      );
      notify.success(`配送单 ${selectedDeliveryOrder.deliveryNo} 已确认配送`);
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '确认配送失败');
    } finally {
      setDeliverySaving(false);
    }
  };

  const handleDeleteDeliveryOrders = async () => {
    if (selectedDeliveryRows.length === 0) {
      notify.warning('请选择要删除的配送单');
      return;
    }
    const confirmed = await confirm({
      title: '确认删除配送单',
      description: `确定删除已选择 ${selectedDeliveryRows.length} 张配送单吗？`,
      confirmText: '删除',
      cancelText: '取消',
      destructive: true,
    });
    if (!confirmed) return;
    setDeliverySaving(true);
    try {
      await deleteDeliveryOrders(selectedDeliveryRows);
      setDeliveryOrders((orders) => orders.filter((order) => !selectedDeliveryRows.includes(order.id)));
      setSelectedDeliveryRows([]);
      notify.success('配送单已删除');
    } catch (error) {
      notify.error(error instanceof Error ? error.message : '配送单删除失败');
    } finally {
      setDeliverySaving(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Tab Navigation */}
      <div className="flex gap-2 border-b border-border">
        <button
          onClick={() => setActiveTab('plan')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'plan'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          采购计划
        </button>
        <button
          onClick={() => setActiveTab('order')}
          className={`px-4 py-2 border-b-2 transition-colors ${
            activeTab === 'order'
              ? 'border-primary text-primary font-medium'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          采购订单
        </button>
        </div>

      {/* Purchase Plan Tab */}
      {activeTab === 'plan' && (
        <div className="space-y-4">
          {/* Search Form */}
          <div className="p-5 border border-border rounded-lg bg-background">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm mb-2">商品编码</label>
                <input
                  type="text"
                  placeholder="请输入商品编码"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={planSearchForm.productCode}
                  onChange={(e) =>
                    setPlanSearchForm({ ...planSearchForm, productCode: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-2">商品名称</label>
                <input
                  type="text"
                  placeholder="请输入商品名称"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={planSearchForm.productName}
                  onChange={(e) =>
                    setPlanSearchForm({ ...planSearchForm, productName: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-2">厂家</label>
                <input
                  type="text"
                  placeholder="请输入厂家"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={planSearchForm.manufacturer}
                  onChange={(e) =>
                    setPlanSearchForm({ ...planSearchForm, manufacturer: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-2">订单号</label>
                <input
                  type="text"
                  placeholder="请输入订单号"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={planSearchForm.orderNo}
                  onChange={(e) => setPlanSearchForm({ ...planSearchForm, orderNo: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-2">计划时间</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={planSearchForm.startDate}
                    onChange={(e) =>
                      setPlanSearchForm({ ...planSearchForm, startDate: e.target.value })
                    }
                  />
                  <span className="text-muted-foreground">~</span>
                  <input
                    type="date"
                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={planSearchForm.endDate}
                    onChange={(e) =>
                      setPlanSearchForm({ ...planSearchForm, endDate: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-2">注册证号</label>
                <input
                  type="text"
                  placeholder="请输入注册证号"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={planSearchForm.registrationNo}
                  onChange={(e) =>
                    setPlanSearchForm({ ...planSearchForm, registrationNo: e.target.value })
                  }
                />
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
                disabled={selectedPlanRows.length === 0}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <CheckCircle2 className="size-4" />
                确认
              </button>
              <button
                disabled={selectedPlanRows.length === 0}
                onClick={handleConvertPlanToOrder}
                className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Truck className="size-4" />
                计划转订单
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
                        checked={purchasePlans.length > 0 && selectedPlanRows.length === purchasePlans.length}
                        onChange={handlePlanSelectAll}
                        className="size-4 rounded border-border"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      订单号
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
                      型号
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      单位
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      采购数量
                    </th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">
                      单价(¥)
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      注册证号
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      厂家
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      计划时间
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                      状态
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {purchasePlans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedPlanRows.includes(plan.id)}
                          onChange={() => handlePlanSelectRow(plan.id)}
                          className="size-4 rounded border-border"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">{plan.orderNo}</td>
                      <td className="px-4 py-3 text-sm font-mono">{plan.productCode}</td>
                      <td className="px-4 py-3">{plan.productName}</td>
                      <td className="px-4 py-3 text-sm">{plan.spec}</td>
                      <td className="px-4 py-3 text-sm">{plan.model}</td>
                      <td className="px-4 py-3 text-sm">{plan.unit}</td>
                      <td className="px-4 py-3 text-right">{plan.planQty}</td>
                      <td className="px-4 py-3 text-right font-medium">
                        {plan.unitPrice.toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono">{plan.registrationNo}</td>
                      <td className="px-4 py-3 text-sm">{plan.manufacturer}</td>
                      <td className="px-4 py-3 text-sm">{plan.planDate}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <span
                            className={`px-2 py-1 rounded text-xs ${getPlanStatusColor(
                              plan.status
                            )}`}
                          >
                            {getPlanStatusText(plan.status)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {purchasePlansQuery.isLoading ? '采购计划加载中...' : `每页25条 · 共${purchasePlans.length}条`}
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
                  下一页
                </button>
                <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">
                  末页
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'order' && (
        <div className="space-y-4">
          <div className="p-5 border border-border rounded-lg bg-background">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm mb-2">采购订单号</label>
                <input
                  type="text"
                  placeholder="请输入采购订单号"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={orderSearchForm.orderNo}
                  onChange={(e) => setOrderSearchForm({ ...orderSearchForm, orderNo: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-2">来源计划</label>
                <input
                  type="text"
                  placeholder="请输入来源计划号"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={orderSearchForm.sourcePlan}
                  onChange={(e) => setOrderSearchForm({ ...orderSearchForm, sourcePlan: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-2">商品名称</label>
                <input
                  type="text"
                  placeholder="请输入明细商品名称"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={orderSearchForm.productName}
                  onChange={(e) => setOrderSearchForm({ ...orderSearchForm, productName: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-2">医院</label>
                <input
                  type="text"
                  placeholder="请输入医院名称"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={orderSearchForm.hospital}
                  onChange={(e) => setOrderSearchForm({ ...orderSearchForm, hospital: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm mb-2">订单日期</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={orderSearchForm.startDate}
                    onChange={(e) => setOrderSearchForm({ ...orderSearchForm, startDate: e.target.value })}
                  />
                  <span className="text-muted-foreground">~</span>
                  <input
                    type="date"
                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={orderSearchForm.endDate}
                    onChange={(e) => setOrderSearchForm({ ...orderSearchForm, endDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleSearchOrders}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
              >
                <Search className="size-4" />
                查询
              </button>
              <button
                onClick={handleResetOrderSearch}
                className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                重置
              </button>
            </div>
          </div>

          <div className="p-4 border border-border rounded-lg bg-background">
            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="text-sm text-muted-foreground">
                采购订单按单号汇总展示，商品名称查询会匹配订单明细商品。
              </div>
              <button
                disabled={selectedOrderRows.length !== 1}
                onClick={handleShowOrderDetail}
                className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Search className="size-4" />
                查看明细
              </button>
            </div>
          </div>

          <div className="border border-border rounded-lg bg-background overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border bg-muted/30">
                    <th className="px-4 py-3 text-left">
                      <input
                        type="checkbox"
                        checked={purchaseOrders.length > 0 && selectedOrderRows.length === purchaseOrders.length}
                        onChange={handleOrderSelectAll}
                        className="size-4 rounded border-border"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">采购订单号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">来源计划</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">医院</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">明细商品</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">订单数量</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">金额(¥)</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">订单日期</th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">状态</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {purchaseOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedOrderRows.includes(order.id)}
                          onChange={() => handleOrderSelectRow(order.id)}
                          className="size-4 rounded border-border"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">{order.orderNo}</td>
                      <td className="px-4 py-3 text-sm">{order.planNo}</td>
                      <td className="px-4 py-3">{order.hospital}</td>
                      <td className="px-4 py-3">{order.productName}</td>
                      <td className="px-4 py-3 text-right">{purchaseOrdersQuery.data?.find((source) => source.id === order.id)?.quantity ?? 0}</td>
                      <td className="px-4 py-3 text-right">{order.totalAmount.toLocaleString()}</td>
                      <td className="px-4 py-3 text-sm">{order.orderDate}</td>
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${getDeliveryStatusColor(order.status === 'pending_confirm' ? 'pending_ship' : order.status === 'completed' ? 'arrived' : 'shipped')}`}>
                          {getOrderStatusText(order.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {!purchaseOrdersQuery.isLoading && purchaseOrders.length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={9}>
                        暂无采购订单数据
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                {purchaseOrdersQuery.isLoading ? '采购订单加载中...' : `按单号汇总 · 共${purchaseOrders.length}条`}
              </div>
              <button
                onClick={() => purchaseOrdersQuery.refetch()}
                className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm"
              >
                刷新
              </button>
            </div>
          </div>

        </div>
      )}

      {showOrderDetailDialog && selectedOrderDetailId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-6">
          <div className="w-[min(1180px,96vw)] max-h-[88vh] bg-background border border-border rounded-lg shadow-xl flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-4">
              <div>
                <div className="font-medium">订单明细 - {selectedOrderDetail?.orderNo ?? ''}</div>
                <div className="text-sm text-muted-foreground mt-1">
                  来源计划：{selectedOrderDetail?.planNo || '-'} · 医院：{selectedOrderDetail?.hospital || '-'}
                </div>
              </div>
              <button
                onClick={() => setShowOrderDetailDialog(false)}
                className="p-2 rounded-lg border border-border hover:bg-accent transition-colors shrink-0"
                title="关闭明细"
              >
                <X className="size-4" />
              </button>
            </div>

            <div className="p-4 border-b border-border">
              <div className="grid grid-cols-4 gap-3 mb-4">
                <div>
                  <label className="block text-sm mb-2">商品编码</label>
                  <input
                    type="text"
                    placeholder="请输入商品编码"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={orderDetailSearchForm.productCode}
                    onChange={(e) => setOrderDetailSearchForm({ ...orderDetailSearchForm, productCode: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">商品名称</label>
                  <input
                    type="text"
                    placeholder="请输入商品名称"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={orderDetailSearchForm.productName}
                    onChange={(e) => setOrderDetailSearchForm({ ...orderDetailSearchForm, productName: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">批号</label>
                  <input
                    type="text"
                    placeholder="请输入批号"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={orderDetailSearchForm.batchNo}
                    onChange={(e) => setOrderDetailSearchForm({ ...orderDetailSearchForm, batchNo: e.target.value })}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2">厂家</label>
                  <input
                    type="text"
                    placeholder="请输入厂家"
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={orderDetailSearchForm.manufacturer}
                    onChange={(e) => setOrderDetailSearchForm({ ...orderDetailSearchForm, manufacturer: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between gap-3">
                <div className="text-sm text-muted-foreground">
                  {orderDetailQuery.isLoading
                    ? '明细加载中...'
                    : `当前第 ${orderDetailCurrent}/${orderDetailTotalPages} 页 · 共 ${orderDetailTotal} 条明细`}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSearchOrderDetails}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2"
                  >
                    <Search className="size-4" />
                    查询
                  </button>
                  <button
                    onClick={handleResetOrderDetailSearch}
                    className="px-4 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
                  >
                    重置
                  </button>
                  <button
                    onClick={handleExportOrderDetails}
                    className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2"
                  >
                    <Download className="size-4" />
                    导出
                  </button>
                </div>
              </div>
            </div>

            <div className="overflow-auto">
              <table className="w-full">
                <thead className="sticky top-0 z-10">
                  <tr className="border-b border-border bg-muted">
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">商品编码</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">商品名称</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">规格</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">型号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">单位</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">订单数量</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">单价(¥)</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">生产日期</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">有效期</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">批号</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">厂家</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">备注</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {orderDetailItems.map((item) => (
                    <tr key={item.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3 text-sm font-mono">{item.productCode}</td>
                      <td className="px-4 py-3">{item.productName}</td>
                      <td className="px-4 py-3 text-sm">{item.spec}</td>
                      <td className="px-4 py-3 text-sm">{item.model}</td>
                      <td className="px-4 py-3 text-sm">{item.unit}</td>
                      <td className="px-4 py-3 text-right">{item.deliveredQty}</td>
                      <td className="px-4 py-3 text-right">{Number(item.unitPrice ?? 0).toFixed(2)}</td>
                      <td className="px-4 py-3 text-sm">{item.productionDate ?? '-'}</td>
                      <td className="px-4 py-3 text-sm">{item.expiryDate ?? '-'}</td>
                      <td className="px-4 py-3 text-sm">{item.batchNo || '-'}</td>
                      <td className="px-4 py-3 text-sm">{item.manufacturer}</td>
                      <td className="px-4 py-3 text-sm">{item.remark || '-'}</td>
                    </tr>
                  ))}
                  {!orderDetailQuery.isLoading && orderDetailItems.length === 0 && (
                    <tr>
                      <td className="px-4 py-8 text-center text-sm text-muted-foreground" colSpan={12}>
                        暂无订单明细
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            <div className="px-5 py-4 border-t border-border flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>每页</span>
                <select
                  className="px-3 py-1.5 border border-border rounded bg-background text-foreground"
                  value={orderDetailSize}
                  onChange={(e) => handleChangeOrderDetailSize(Number(e.target.value))}
                >
                  <option value={10}>10条</option>
                  <option value={20}>20条</option>
                  <option value={50}>50条</option>
                </select>
                <span>最多50条</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  disabled={orderDetailCurrent <= 1}
                  onClick={() => handleChangeOrderDetailPage(1)}
                  className="px-3 py-1.5 border border-border rounded hover:bg-accent transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  首页
                </button>
                <button
                  disabled={orderDetailCurrent <= 1}
                  onClick={() => handleChangeOrderDetailPage(orderDetailCurrent - 1)}
                  className="px-3 py-1.5 border border-border rounded hover:bg-accent transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                <span className="px-3 py-1.5 text-sm text-muted-foreground">
                  {orderDetailCurrent} / {orderDetailTotalPages}
                </span>
                <button
                  disabled={orderDetailCurrent >= orderDetailTotalPages}
                  onClick={() => handleChangeOrderDetailPage(orderDetailCurrent + 1)}
                  className="px-3 py-1.5 border border-border rounded hover:bg-accent transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
                <button
                  disabled={orderDetailCurrent >= orderDetailTotalPages}
                  onClick={() => handleChangeOrderDetailPage(orderDetailTotalPages)}
                  className="px-3 py-1.5 border border-border rounded hover:bg-accent transition-colors text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  末页
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivery Order Tab is intentionally hidden: fulfillment is represented by purchase order status. */}
      {false && (
        <div className="space-y-4">
          {/* Search Form */}
          <div className="p-5 border border-border rounded-lg bg-background">
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <label className="block text-sm mb-2">商品编码</label>
                <input
                  type="text"
                  placeholder="请输入商品编码"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={deliverySearchForm.productCode}
                  onChange={(e) =>
                    setDeliverySearchForm({ ...deliverySearchForm, productCode: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-2">商品名称</label>
                <input
                  type="text"
                  placeholder="请输入商品名称"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={deliverySearchForm.productName}
                  onChange={(e) =>
                    setDeliverySearchForm({ ...deliverySearchForm, productName: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-2">厂家</label>
                <input
                  type="text"
                  placeholder="请输入厂家"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={deliverySearchForm.manufacturer}
                  onChange={(e) =>
                    setDeliverySearchForm({ ...deliverySearchForm, manufacturer: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-2">采购订单号</label>
                <input
                  type="text"
                  placeholder="请输入采购订单号"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={deliverySearchForm.orderNo}
                  onChange={(e) =>
                    setDeliverySearchForm({ ...deliverySearchForm, orderNo: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-2">计划时间</label>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={deliverySearchForm.startDate}
                    onChange={(e) =>
                      setDeliverySearchForm({ ...deliverySearchForm, startDate: e.target.value })
                    }
                  />
                  <span className="text-muted-foreground">~</span>
                  <input
                    type="date"
                    className="flex-1 px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    value={deliverySearchForm.endDate}
                    onChange={(e) =>
                      setDeliverySearchForm({ ...deliverySearchForm, endDate: e.target.value })
                    }
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-2">注册证号</label>
                <input
                  type="text"
                  placeholder="请输入注册证号"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={deliverySearchForm.registrationNo}
                  onChange={(e) =>
                    setDeliverySearchForm({ ...deliverySearchForm, registrationNo: e.target.value })
                  }
                />
              </div>
              <div>
                <label className="block text-sm mb-2">配送单号</label>
                <input
                  type="text"
                  placeholder="请输入配送单号"
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                  value={deliverySearchForm.deliveryNo}
                  onChange={(e) =>
                    setDeliverySearchForm({ ...deliverySearchForm, deliveryNo: e.target.value })
                  }
                />
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
                onClick={() => setShowDeliveryDialog(true)}
                disabled={selectedDeliveryRows.length !== 1 || selectedDeliverySubmitted}
                className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Edit className="size-4" />
                编辑
              </button>
              <button
                onClick={handleSubmitSelectedDelivery}
                disabled={selectedDeliveryRows.length !== 1 || selectedDeliverySubmitted || deliverySaving}
                className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Send className="size-4" />
                确认配送
              </button>
              <button
                onClick={handleDeleteDeliveryOrders}
                disabled={selectedDeliveryRows.length === 0 || deliverySaving}
                className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="size-4" />
                删除
              </button>
              <button
                disabled={selectedDeliveryRows.length !== 1}
                className="px-4 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Printer className="size-4" />
                打印
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
                          checked={selectedDeliveryRows.length === deliveryOrders.length && deliveryOrders.length > 0}
                        onChange={handleDeliverySelectAll}
                        className="size-4 rounded border-border"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      配送单号
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      采购订单号
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      商品编码
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      商品名称
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      厂家
                    </th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">
                      计划时间
                    </th>
                    <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">
                      状态
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {deliveryOrders.map((order) => (
                    <tr key={order.id} className="hover:bg-accent/50 transition-colors">
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedDeliveryRows.includes(order.id)}
                          onChange={() => handleDeliverySelectRow(order.id)}
                          className="size-4 rounded border-border"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium">{order.deliveryNo}</td>
                      <td className="px-4 py-3 text-sm">{order.orderNo}</td>
                      <td className="px-4 py-3 text-sm font-mono">{order.productCode}</td>
                      <td className="px-4 py-3">{order.productName}</td>
                      <td className="px-4 py-3 text-sm">{order.manufacturer}</td>
                      <td className="px-4 py-3 text-sm">{order.planDate}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-center">
                          <span
                            className={`px-2 py-1 rounded text-xs ${getDeliveryStatusColor(
                              order.status
                            )}`}
                          >
                            {getReadableDeliveryStatusText(order.status)}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                每页25条 · 共{deliveryOrders.length}条
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
                  下一页
                </button>
                <button className="px-3 py-1 border border-border rounded hover:bg-accent transition-colors text-sm">
                  末页
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {false && (
        <div className="space-y-4">
          <div className="p-4 border border-border rounded-lg bg-background">
            <div className="text-sm text-muted-foreground">
              发货单是配送单的实际出库与物流凭证，记录批号、承运方、出库和签收状态。
            </div>
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
                      <td className="px-4 py-3 text-center">
                        <span className={`px-2 py-1 rounded text-xs ${getShipmentStatusColor(shipment.status)}`}>
                          {getShipmentStatusText(shipment.status)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        </div>
      )}

      {/* Delivery Order Edit Dialog */}
      {showDeliveryDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <div>
                <h2 className="text-xl font-medium">计划转订单</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  该操作会生成采购订单，请补充订单数量、生产日期、失效日期、批号、UID 等履约信息后确认生成。
                </p>
                {deliveryDialogLocked && (
                  <p className="mt-2 text-sm text-destructive">
                    当前采购订单已{getReadableDeliveryStatusText(deliveryContext.status)}，不能再次保存。
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowDeliveryDialog(false)}
                className="p-1 hover:bg-accent rounded transition-colors"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* Basic Information */}
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-4">订单信息</h3>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm mb-2">采购订单号</label>
                    <input
                      type="text"
                      value={deliveryContext?.orderNo ?? ''}
                      disabled
                      className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">订单状态</label>
                    <input
                      type="text"
                      value={deliveryContext ? getReadableDeliveryStatusText(deliveryContext.status) : ''}
                      disabled
                      className="w-full px-3 py-2 border border-border rounded-lg bg-muted text-muted-foreground cursor-not-allowed"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-2">
                      订单日期 <span className="text-destructive">*</span>
                    </label>
                    <input
                      type="date"
                      value={deliveryDate}
                      onChange={(e) => setDeliveryDate(e.target.value)}
                      disabled={deliveryDialogLocked}
                      className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                    />
                  </div>
                </div>
              </div>

              {/* Delivery Items */}
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-4">订单商品明细</h3>
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border bg-muted/30">
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
                          商品编码
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
                          商品名称
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
                          规格
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-muted-foreground">
                          计划数量
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-muted-foreground">
                          订单数量
                        </th>
                        <th className="px-3 py-2 text-right text-sm font-medium text-muted-foreground">
                          剩余数量
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
                          生产日期
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
                          失效日期
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
                          批号
                        </th>
                        <th className="px-3 py-2 text-left text-sm font-medium text-muted-foreground">
                          备注
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {deliveryItems.map((item) => (
                        <tr key={item.id} className="hover:bg-accent/50 transition-colors">
                          <td className="px-3 py-2 text-sm font-mono">{item.productCode}</td>
                          <td className="px-3 py-2 text-sm">{item.productName}</td>
                          <td className="px-3 py-2 text-sm">{item.spec}</td>
                          <td className="px-3 py-2 text-right text-sm">{item.planQty}</td>
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => updateDeliveryQty(item.id, item.deliveredQty - 1)}
                                disabled={deliveryDialogLocked}
                                className="p-1 hover:bg-accent rounded transition-colors"
                              >
                                <Minus className="size-3" />
                              </button>
                              <input
                                type="number"
                                value={item.deliveredQty}
                                onChange={(e) =>
                                  updateDeliveryQty(item.id, parseInt(e.target.value) || 0)
                                }
                                disabled={deliveryDialogLocked}
                                className="w-16 px-2 py-1 text-center border border-border rounded bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                                min="0"
                                max={item.planQty}
                              />
                              <button
                                onClick={() => updateDeliveryQty(item.id, item.deliveredQty + 1)}
                                disabled={deliveryDialogLocked}
                                className="p-1 hover:bg-accent rounded transition-colors"
                              >
                                <Plus className="size-3" />
                              </button>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right text-sm font-medium">
                            {item.planQty - item.deliveredQty}
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              value={item.productionDate}
                              onChange={(e) =>
                                updateItemField(item.id, 'productionDate', e.target.value)
                              }
                              disabled={deliveryDialogLocked}
                              className="w-full px-2 py-1 border border-border rounded bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="date"
                              value={item.expiryDate}
                              onChange={(e) =>
                                updateItemField(item.id, 'expiryDate', e.target.value)
                              }
                              disabled={deliveryDialogLocked}
                              className="w-full px-2 py-1 border border-border rounded bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.batchNo}
                              onChange={(e) => updateItemField(item.id, 'batchNo', e.target.value)}
                              disabled={deliveryDialogLocked}
                              className="w-24 px-2 py-1 border border-border rounded bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                            />
                          </td>
                          <td className="px-3 py-2">
                            <input
                              type="text"
                              value={item.remark}
                              onChange={(e) => updateItemField(item.id, 'remark', e.target.value)}
                              placeholder="备注"
                              disabled={deliveryDialogLocked}
                              className="w-32 px-2 py-1 border border-border rounded bg-input-background focus:outline-none focus:ring-2 focus:ring-ring text-sm"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Remark */}
              <div className="border border-border rounded-lg p-4">
                <h3 className="font-medium mb-4">备注</h3>
                <textarea
                  rows={3}
                  placeholder="请输入备注信息..."
                  value={deliveryRemark}
                  onChange={(e) => setDeliveryRemark(e.target.value)}
                  disabled={deliveryDialogLocked}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring resize-none"
                />
              </div>
            </div>

            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button
                onClick={() => setShowDeliveryDialog(false)}
                className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleSaveDeliveryEdit(false)}
                disabled={deliverySaving || deliveryDialogLocked}
                className="px-6 py-2 bg-background border border-border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                保存草稿
              </button>
              <button
                onClick={() => handleSaveDeliveryEdit(true)}
                disabled={deliverySaving || deliveryDialogLocked}
                className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认生成订单
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
