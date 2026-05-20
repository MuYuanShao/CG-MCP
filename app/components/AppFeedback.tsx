import { ReactNode, createContext, useCallback, useContext, useMemo, useState } from 'react';
import { toast, Toaster } from 'sonner';
import { AlertTriangle } from 'lucide-react';
import { recordFrontendOperation } from '../services/operationLogs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Button } from './ui/button';

type ConfirmOptions = {
  title: string;
  description?: string;
  confirmText?: string;
  cancelText?: string;
  destructive?: boolean;
};

type ConfirmRequest = ConfirmOptions & {
  resolve: (confirmed: boolean) => void;
};

type FeedbackContextValue = {
  notify: typeof toast;
  confirm: (options: ConfirmOptions) => Promise<boolean>;
};

function inferModuleCode(message: string) {
  if (message.includes('医院')) return 'hospital';
  if (message.includes('退货')) return 'refund';
  if (message.includes('采购') || message.includes('订单')) return 'purchase';
  if (message.includes('配送')) return 'delivery';
  if (message.includes('发货')) return 'shipment';
  if (message.includes('验收')) return 'acceptance';
  if (message.includes('库存') || message.includes('盘点')) return 'inventory';
  if (message.includes('结算')) return 'settlement';
  if (message.includes('发票')) return 'invoice';
  if (message.includes('证照')) return 'license';
  if (message.includes('商品')) return 'product';
  if (message.includes('供应商')) return 'supplier';
  if (message.includes('用户')) return 'user';
  if (message.includes('角色') || message.includes('权限')) return 'permission';
  return 'ui';
}

function inferActionCode(message: string) {
  if (message.includes('新增') || message.includes('保存')) return 'save';
  if (message.includes('编辑') || message.includes('更新')) return 'update';
  if (message.includes('删除')) return 'delete';
  if (message.includes('审核') || message.includes('驳回')) return 'audit';
  if (message.includes('出库')) return 'outbound';
  if (message.includes('确认')) return 'confirm';
  if (message.includes('导出')) return 'export';
  if (message.includes('导入') || message.includes('上传')) return 'import';
  if (message.includes('绑定') || message.includes('授权') || message.includes('分配')) return 'bind';
  return 'success';
}

function createPersistedToast() {
  const persistedToast = Object.assign(
    ((...args: Parameters<typeof toast>) => toast(...args)) as typeof toast,
    toast,
  );

  persistedToast.success = ((message, options) => {
    const normalizedMessage = typeof message === 'string' ? message : '前端操作成功';
    void recordFrontendOperation({
      moduleCode: inferModuleCode(normalizedMessage),
      actionCode: inferActionCode(normalizedMessage),
      message: normalizedMessage,
      details: {
        source: 'toast.success',
      },
    });
    return toast.success(message, options);
  }) as typeof toast.success;

  return persistedToast;
}

const FeedbackContext = createContext<FeedbackContextValue | null>(null);

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [request, setRequest] = useState<ConfirmRequest | null>(null);
  const [queue, setQueue] = useState<ConfirmRequest[]>([]);

  const confirm = useCallback(
    (options: ConfirmOptions) =>
      new Promise<boolean>((resolve) => {
        const nextRequest = { ...options, resolve };

        setRequest((current) => {
          if (!current) return nextRequest;
          setQueue((items) => [...items, nextRequest]);
          return current;
        });
      }),
    [],
  );

  const value = useMemo<FeedbackContextValue>(
    () => ({
      notify: createPersistedToast(),
      confirm,
    }),
    [confirm],
  );

  const close = (confirmed: boolean) => {
    request?.resolve(confirmed);
    setQueue((items) => {
      const [next, ...rest] = items;
      setRequest(next ?? null);
      return rest;
    });
  };

  return (
    <FeedbackContext.Provider value={value}>
      {children}
      <Toaster position="top-right" richColors closeButton />
      <Dialog open={Boolean(request)} onOpenChange={(open) => !open && close(false)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 flex size-10 items-center justify-center rounded-md bg-destructive/10 text-destructive">
              <AlertTriangle className="size-5" />
            </div>
            <DialogTitle>{request?.title}</DialogTitle>
            {request?.description && (
              <DialogDescription>{request.description}</DialogDescription>
            )}
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => close(false)}>
              {request?.cancelText ?? '取消'}
            </Button>
            <Button
              variant={request?.destructive ? 'destructive' : 'default'}
              onClick={() => close(true)}
            >
              {request?.confirmText ?? '确认'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const value = useContext(FeedbackContext);
  if (!value) {
    throw new Error('useFeedback must be used within FeedbackProvider');
  }
  return value;
}
