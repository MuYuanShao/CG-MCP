import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Search, Plus, Edit, Trash2, Download, Upload, ChevronDown, XCircle } from 'lucide-react';
import { useFeedback } from './AppFeedback';
import { Button } from './ui/button';
import {
  createHospital,
  deleteHospitals,
  hospitalQueryKey,
  listHospitals,
  updateHospital,
  type HospitalPayload,
} from '../services/hospitals';

export default function HospitalManagement() {
  const { confirm, notify } = useFeedback();
  const queryClient = useQueryClient();
  const [searchHospitalName, setSearchHospitalName] = useState('');
  const [selectedHospitals, setSelectedHospitals] = useState<number[]>([]);
  const [showSearchDialog, setShowSearchDialog] = useState(false);
  const [showImportMenu, setShowImportMenu] = useState(false);
  const [showAddHospitalDialog, setShowAddHospitalDialog] = useState(false);
  const [showEditHospitalDialog, setShowEditHospitalDialog] = useState(false);
  const [hospitalFormData, setHospitalFormData] = useState({
    code: '',
    name: '',
    level: '',
    city: '',
    contact: '',
    phone: '',
    status: 'active',
  });

  const hospitalsQuery = useQuery({
    queryKey: hospitalQueryKey,
    queryFn: () => listHospitals(),
  });
  const hospitals = hospitalsQuery.data?.records ?? [];

  const createHospitalMutation = useMutation({
    mutationFn: createHospital,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hospitalQueryKey }),
  });
  const updateHospitalMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: HospitalPayload }) => updateHospital(id, payload),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hospitalQueryKey }),
  });
  const deleteHospitalsMutation = useMutation({
    mutationFn: deleteHospitals,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: hospitalQueryKey }),
  });

  const toHospitalPayload = (): HospitalPayload => ({
    code: hospitalFormData.code,
    name: hospitalFormData.name,
    level: hospitalFormData.level,
    city: hospitalFormData.city,
    contact: hospitalFormData.contact,
    phone: hospitalFormData.phone,
    status: hospitalFormData.status as 'active' | 'inactive',
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-[#10b981]';
      case 'inactive': return 'text-muted-foreground';
      default: return 'text-foreground';
    }
  };

  const getStatusBg = (status: string) => {
    switch (status) {
      case 'active': return 'bg-[#10b981]/10';
      case 'inactive': return 'bg-muted';
      default: return 'bg-muted';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return '正常';
      case 'inactive': return '停用';
      default: return status;
    }
  };

  const renderActionBar = () => {
    const buttons = [
      { label: '查询', icon: Search },
      { label: '新增', icon: Plus },
      { label: '修改', icon: Edit },
      { label: '删除', icon: Trash2 },
      { label: '导出', icon: Download },
      { label: '导入', icon: Upload },
    ];

    const handleButtonClick = (label: string) => {
      if (label === '查询') {
        setShowSearchDialog(true);
      } else if (label === '新增') {
        setHospitalFormData({ code: '', name: '', level: '', city: '', contact: '', phone: '', status: 'active' });
        setShowAddHospitalDialog(true);
      } else if (label === '修改') {
        if (selectedHospitals.length === 1) {
          const hospital = hospitals.find((h) => h.id === selectedHospitals[0]);
          if (hospital) {
            setHospitalFormData({
              code: hospital.code,
              name: hospital.name,
              level: hospital.level,
              city: hospital.city,
              contact: hospital.contact,
              phone: hospital.phone,
              status: hospital.status,
            });
            setShowEditHospitalDialog(true);
          }
        }
      } else if (label === '删除') {
        if (selectedHospitals.length > 0) {
          confirm({
            title: '删除医院信息',
            description: `确定要删除选中的 ${selectedHospitals.length} 条医院信息吗？`,
            confirmText: '删除',
            destructive: true,
          }).then((confirmed) => {
            if (!confirmed) return;
            deleteHospitalsMutation.mutate(selectedHospitals, {
              onSuccess: () => {
                setSelectedHospitals([]);
                notify.success('医院信息已删除');
              },
              onError: (error) => {
                notify.error(error instanceof Error ? error.message : '医院信息删除失败');
              },
            });
          });
        }
      } else if (label === '导出') {
        const dataToExport = selectedHospitals.length > 0
          ? hospitals.filter((h) => selectedHospitals.includes(h.id))
          : hospitals;
        console.log('导出医院数据:', dataToExport);
        notify.success(`已导出 ${dataToExport.length} 条医院信息`);
      }
    };

    return (
      <div className="flex items-center gap-2 flex-wrap">
        {buttons.map((btn, index) => {
          const isDisabled =
            (btn.label === '修改' && selectedHospitals.length !== 1) ||
            (btn.label === '删除' && selectedHospitals.length === 0);

          if (btn.label === '导入') {
            return (
              <div key={`${btn.label}-${index}`} className="relative">
                <Button type="button" variant="outline" onClick={() => setShowImportMenu(!showImportMenu)} className="rounded-lg">
                  <btn.icon className="size-4" />
                  {btn.label}
                  <ChevronDown className="size-3" />
                </Button>
                {showImportMenu && (
                  <div className="absolute top-full left-0 mt-1 bg-background border border-border rounded-lg shadow-lg min-w-[180px] z-10">
                    <Button type="button" variant="ghost" onClick={() => { notify.success('下载导入模板'); setShowImportMenu(false); }} className="w-full justify-start rounded-none">
                      下载导入模板
                    </Button>
                    <Button type="button" variant="ghost" onClick={() => { notify.success('上传导入信息表'); setShowImportMenu(false); }} className="w-full justify-start rounded-none border-t border-border">
                      上传导入信息表
                    </Button>
                  </div>
                )}
              </div>
            );
          }

          return (
            <Button type="button" variant="outline" key={`${btn.label}-${index}`} onClick={() => handleButtonClick(btn.label)} disabled={isDisabled} className="rounded-lg">
              <btn.icon className="size-4" />
              {btn.label}
            </Button>
          );
        })}
      </div>
    );
  };

  const filteredHospitals = searchHospitalName
    ? hospitals.filter((h) => h.name.includes(searchHospitalName))
    : hospitals;

  return (
    <div className="space-y-4">
      <div className="p-4 border border-border rounded-lg bg-background">
        {renderActionBar()}
      </div>
      <div className="border border-border rounded-lg bg-background overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border bg-muted/30">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedHospitals.length === filteredHospitals.length && filteredHospitals.length > 0}
                    onChange={(e) => {
                      if (e.target.checked) {
                        setSelectedHospitals(filteredHospitals.map((h) => h.id));
                      } else {
                        setSelectedHospitals([]);
                      }
                    }}
                    className="size-4 rounded border-border"
                  />
                </th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">医院编号</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">医院名称</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">医院等级</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">所在城市</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">联系人</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">联系电话</th>
                <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">合作日期</th>
                <th className="px-4 py-3 text-center text-sm font-medium text-muted-foreground">状态</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filteredHospitals.map((hospital) => (
                <tr key={hospital.id} className="hover:bg-accent/50 transition-colors">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedHospitals.includes(hospital.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedHospitals([...selectedHospitals, hospital.id]);
                        } else {
                          setSelectedHospitals(selectedHospitals.filter((id) => id !== hospital.id));
                        }
                      }}
                      className="size-4 rounded border-border"
                    />
                  </td>
                  <td className="px-4 py-3 text-sm">{hospital.code}</td>
                  <td className="px-4 py-3 font-medium">{hospital.name}</td>
                  <td className="px-4 py-3 text-sm">{hospital.level}</td>
                  <td className="px-4 py-3 text-sm">{hospital.city}</td>
                  <td className="px-4 py-3 text-sm">{hospital.contact}</td>
                  <td className="px-4 py-3 text-sm">{hospital.phone}</td>
                  <td className="px-4 py-3 text-sm">{hospital.cooperationDate}</td>
                  <td className="px-4 py-3">
                    <div className="flex justify-center">
                      <div className={`px-3 py-1 rounded-full text-xs ${getStatusBg(hospital.status)} ${getStatusColor(hospital.status)}`}>
                        {getStatusText(hospital.status)}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredHospitals.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-sm text-muted-foreground">
                    {hospitalsQuery.isFetching ? '正在加载医院数据...' : '暂无医院数据'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showSearchDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-md">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between">
              <h3 className="font-semibold">医院查询</h3>
              <button onClick={() => setShowSearchDialog(false)} className="p-1 hover:bg-accent rounded transition-colors">
                <XCircle className="size-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm mb-2">医院名称</label>
                <input
                  type="text" placeholder="请输入医院名称"
                  value={searchHospitalName}
                  onChange={(e) => setSearchHospitalName(e.target.value)}
                  className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3">
              <button onClick={() => { setSearchHospitalName(''); setShowSearchDialog(false); }} className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors">
                重置
              </button>
              <button onClick={() => setShowSearchDialog(false)} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">
                查询
              </button>
            </div>
          </div>
        </div>
      )}

      {showAddHospitalDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
              <h3 className="font-semibold">新增医院</h3>
              <button onClick={() => setShowAddHospitalDialog(false)} className="p-1 hover:bg-accent rounded transition-colors">
                <XCircle className="size-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm mb-2">医院编号 <span className="text-destructive">*</span></label>
                  <input type="text" placeholder="请输入医院机构代码" value={hospitalFormData.code}
                    onChange={(e) => setHospitalFormData({ ...hospitalFormData, code: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm mb-2">医院名称 <span className="text-destructive">*</span></label>
                  <input type="text" list="hospital-names" placeholder="请选择或输入医院名称" value={hospitalFormData.name}
                    onChange={(e) => setHospitalFormData({ ...hospitalFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
                  <datalist id="hospital-names">
                    <option value="浙江省人民医院" /><option value="浙江大学医学院附属第一医院" />
                    <option value="宁波市第一医院" /><option value="温州医科大学附属第一医院" />
                    <option value="嘉兴市第一医院" /><option value="湖州市中心医院" />
                  </datalist>
                </div>
                <div>
                  <label className="block text-sm mb-2">医院等级 <span className="text-destructive">*</span></label>
                  <select value={hospitalFormData.level} onChange={(e) => setHospitalFormData({ ...hospitalFormData, level: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">请选择医院等级</option>
                    <option value="三级甲等">三级甲等</option><option value="三级乙等">三级乙等</option>
                    <option value="二级甲等">二级甲等</option><option value="二级乙等">二级乙等</option>
                    <option value="一级甲等">一级甲等</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2">所在城市 <span className="text-destructive">*</span></label>
                  <input type="text" placeholder="请输入所在城市" value={hospitalFormData.city}
                    onChange={(e) => setHospitalFormData({ ...hospitalFormData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm mb-2">联系人 <span className="text-destructive">*</span></label>
                  <input type="text" placeholder="请输入联系人" value={hospitalFormData.contact}
                    onChange={(e) => setHospitalFormData({ ...hospitalFormData, contact: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm mb-2">联系电话 <span className="text-destructive">*</span></label>
                  <input type="tel" placeholder="请输入联系电话" value={hospitalFormData.phone}
                    onChange={(e) => setHospitalFormData({ ...hospitalFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-2">状态 <span className="text-destructive">*</span></label>
                  <select value={hospitalFormData.status} onChange={(e) => setHospitalFormData({ ...hospitalFormData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="active">正常</option><option value="inactive">停用</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 sticky bottom-0 bg-background">
              <button onClick={() => setShowAddHospitalDialog(false)} className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors">取消</button>
              <button onClick={() => createHospitalMutation.mutate(toHospitalPayload(), {
                onSuccess: () => { notify.success('医院信息已保存'); setShowAddHospitalDialog(false); },
                onError: (error) => { notify.error(error instanceof Error ? error.message : '医院信息保存失败'); },
              })} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">保存</button>
            </div>
          </div>
        </div>
      )}

      {showEditHospitalDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-background rounded-lg shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-border flex items-center justify-between sticky top-0 bg-background z-10">
              <h3 className="font-semibold">编辑医院</h3>
              <button onClick={() => setShowEditHospitalDialog(false)} className="p-1 hover:bg-accent rounded transition-colors">
                <XCircle className="size-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="block text-sm mb-2">医院名称 <span className="text-destructive">*</span></label>
                  <input type="text" placeholder="请输入医院名称" value={hospitalFormData.name}
                    onChange={(e) => setHospitalFormData({ ...hospitalFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm mb-2">医院等级 <span className="text-destructive">*</span></label>
                  <select value={hospitalFormData.level} onChange={(e) => setHospitalFormData({ ...hospitalFormData, level: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="">请选择医院等级</option>
                    <option value="三级甲等">三级甲等</option><option value="三级乙等">三级乙等</option>
                    <option value="二级甲等">二级甲等</option><option value="二级乙等">二级乙等</option>
                    <option value="一级甲等">一级甲等</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-2">所在城市 <span className="text-destructive">*</span></label>
                  <input type="text" placeholder="请输入所在城市" value={hospitalFormData.city}
                    onChange={(e) => setHospitalFormData({ ...hospitalFormData, city: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm mb-2">联系人 <span className="text-destructive">*</span></label>
                  <input type="text" placeholder="请输入联系人" value={hospitalFormData.contact}
                    onChange={(e) => setHospitalFormData({ ...hospitalFormData, contact: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm mb-2">联系电话 <span className="text-destructive">*</span></label>
                  <input type="tel" placeholder="请输入联系电话" value={hospitalFormData.phone}
                    onChange={(e) => setHospitalFormData({ ...hospitalFormData, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <div>
                  <label className="block text-sm mb-2">状态 <span className="text-destructive">*</span></label>
                  <select value={hospitalFormData.status} onChange={(e) => setHospitalFormData({ ...hospitalFormData, status: e.target.value })}
                    className="w-full px-3 py-2 border border-border rounded-lg bg-input-background focus:outline-none focus:ring-2 focus:ring-ring">
                    <option value="active">正常</option><option value="inactive">停用</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="px-6 py-4 border-t border-border flex items-center justify-end gap-3 sticky bottom-0 bg-background">
              <button onClick={() => setShowEditHospitalDialog(false)} className="px-6 py-2 border border-border rounded-lg hover:bg-accent transition-colors">取消</button>
              <button onClick={() => {
                if (selectedHospitals.length !== 1) return;
                updateHospitalMutation.mutate({ id: selectedHospitals[0]!, payload: toHospitalPayload() }, {
                  onSuccess: () => { notify.success('医院信息已更新'); setShowEditHospitalDialog(false); },
                  onError: (error) => { notify.error(error instanceof Error ? error.message : '医院信息更新失败'); },
                });
              }} className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:opacity-90 transition-opacity">保存</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
