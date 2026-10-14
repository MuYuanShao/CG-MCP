import { useState } from 'react';
import { Input } from './ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { buildConnectionAddress, parseConnectionAddress, type ConnectionAddress } from '../lib/integrationAddress';

export default function SpdConnectionAddressFields({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const [address, setAddress] = useState(() => parseConnectionAddress(value));
  const update = (patch: Partial<ConnectionAddress>) => {
    const next = { ...address, ...patch };
    setAddress(next);
    onChange(buildConnectionAddress(next));
  };
  return <div className="space-y-3">
    <label className="block space-y-1 text-sm"><span>连接协议</span><Select value={address.protocol} onValueChange={protocol => update({ protocol: protocol as ConnectionAddress['protocol'] })}><SelectTrigger aria-label="连接协议"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="http">HTTP</SelectItem><SelectItem value="https">HTTPS</SelectItem></SelectContent></Select></label>
    <label className="block space-y-1 text-sm"><span>SPD-PR IP地址／域名</span><Input required maxLength={253} placeholder="例如 192.168.1.10" value={address.host} onChange={e => update({ host: e.target.value })} /></label>
    <label className="block space-y-1 text-sm"><span>端口</span><Input required type="number" min={1} max={65535} step={1} value={address.port || ''} onChange={e => update({ port: Number(e.target.value) })} /></label>
    <p className="break-all text-xs text-muted-foreground">接收地址：{address.host ? buildConnectionAddress(address) : '填写IP地址后自动生成'}</p>
  </div>;
}
