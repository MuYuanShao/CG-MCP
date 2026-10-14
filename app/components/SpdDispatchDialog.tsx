import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Button } from './ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from './ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { dispatchProducts, listInstances, syncStates } from '../services/integration';
import { useFeedback } from './AppFeedback';

export default function SpdDispatchDialog({ productIds }: { productIds: number[] }) {
  const [open, setOpen] = useState(false);
  const [instance, setInstance] = useState('');
  const { notify } = useFeedback();
  const client = useQueryClient();
  const instances = useQuery({ queryKey: ['spd-instances'], queryFn: listInstances, enabled: open });
  const dispatch = useMutation({
    mutationFn: (licensesOnly: boolean) => dispatchProducts(instance, productIds, licensesOnly),
    onSuccess: (results) => {
      client.invalidateQueries({ queryKey: ['spd-logs', instance] });
      const successful = results.filter(r => ['processed', 'accepted', 'ignored'].includes(r.state)).length;
      const failed = results.filter(r => r.state === 'failed').length;
      if (successful) notify.success(`商品及证照下发：已受理 ${successful} 项，失败 ${failed} 项`);
      else notify.error('商品及证照下发失败，请查看逐项处理结果');
    },
    onError: (e: Error) => notify.error(e.message),
  });
  const working = dispatch.isPending;
  return <>
    <Button variant="outline" disabled={!productIds.length} onClick={() => { setOpen(true); dispatch.reset(); }}>下发 SPD-PR</Button>
    <Dialog open={open} onOpenChange={(next) => { if (!working) setOpen(next); }}>
      <DialogContent className="max-w-3xl"><DialogHeader><DialogTitle>下发商品至 SPD-PR</DialogTitle><DialogDescription>已选择 {productIds.length} 个商品，每批最多 100 个。商品及证照进入 SPD-PR 待审批目录，审批通过后进入院内目录。请先上传对应厂家。</DialogDescription></DialogHeader>
        <Select value={instance} onValueChange={setInstance} disabled={working}><SelectTrigger aria-label="目标 SPD-PR 实例"><SelectValue placeholder="选择目标实例" /></SelectTrigger><SelectContent>{instances.data?.filter(i => i.enabled).map(i => <SelectItem key={i.id} value={i.id}>{i.name} · {i.organization}</SelectItem>)}</SelectContent></Select>
        {instances.error && <p role="alert" className="text-destructive">{instances.error.message}</p>}
        {instances.data?.length === 0 && <p>请在采购对接中配置实例。</p>}
        <div className="flex gap-2"><Button disabled={!instance || working || productIds.length > 100} onClick={() => dispatch.mutate(false)}>{working ? '下发中…' : '商品及证照下发'}</Button><Button variant="outline" disabled={!instance || working || productIds.length > 100} onClick={() => dispatch.mutate(true)}>仅重新下发证照</Button></div>
        <div className="max-h-80 overflow-auto" aria-live="polite">{dispatch.data?.map(log => <div key={log.id} className="border-b py-3 text-sm"><span className={log.state === 'failed' ? 'text-destructive' : 'text-blue-700'}>商品 {log.sourceCode} · {syncStates[log.state]}</span><p className="text-muted-foreground">{log.message}</p></div>)}</div>
      </DialogContent>
    </Dialog>
  </>;
}
