import { useState, useMemo } from 'react';
import { Plus, Edit2, Trash2, Download, Search, FileText } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { BillStatusBadge, OwnerStatusBadge } from '@/components/ui/StatusBadge';
import { useAppStore, useFilteredBills } from '@/store';
import type { BillStatus } from '@/types';
import { formatCurrency, formatDate, todayStr } from '@/utils/format';
import { cn } from '@/utils/helpers';

const statusOptions: { value: '' | BillStatus; label: string }[] = [
  { value: '', label: '全部状态' },
  { value: 'unpaid', label: '未缴' },
  { value: 'partial', label: '部分缴费' },
  { value: 'paid', label: '已缴' },
  { value: 'void', label: '作废' },
];

const periods = ['', '2026-06', '2026-05', '2026-04', '2026-03', '2026-02', '2026-01'];
const buildings = ['', '1号楼', '2号楼', '3号楼', '4号楼', '5号楼', '6号楼', '7号楼', '8号楼'];

type Tab = 'list' | 'generate' | 'adjust' | 'void';

export const Bills = () => {
  const bills = useFilteredBills();
  const owners = useAppStore((s) => s.owners);
  const { billFilters, setBillFilters, resetBillFilters, addBill, updateBill, voidBill } = useAppStore();

  const [tab, setTab] = useState<Tab>('list');
  const [generateOpen, setGenerateOpen] = useState(false);
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [voidOpen, setVoidOpen] = useState(false);
  const [selectedBillId, setSelectedBillId] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState(billFilters.keyword || '');

  const [genForm, setGenForm] = useState({ period: '2026-06', building: '', feeType: 'all' });
  const [adjForm, setAdjForm] = useState({ propertyFee: 0, waterFee: 0, electricFee: 0, otherFee: 0, reason: '' });
  const [voidReason, setVoidReason] = useState('');

  const selectedBill = useMemo(() => bills.find((b) => b.id === selectedBillId), [bills, selectedBillId]);

  const openAdjust = (bill: typeof bills[0]) => {
    setSelectedBillId(bill.id);
    setAdjForm({
      propertyFee: bill.propertyFee,
      waterFee: bill.waterFee,
      electricFee: bill.electricFee,
      otherFee: bill.otherFee,
      reason: '',
    });
    setAdjustOpen(true);
  };

  const openVoid = (bill: typeof bills[0]) => {
    setSelectedBillId(bill.id);
    setVoidReason('');
    setVoidOpen(true);
  };

  const handleGenerate = () => {
    const targetOwners = genForm.building ? owners.filter((o) => o.building === genForm.building) : owners;
    targetOwners.forEach((o) => {
      const exists = bills.find((b) => b.ownerId === o.id && b.period === genForm.period);
      if (exists) return;
      const baseFee = o.area * 2.5;
      addBill({
        ownerId: o.id,
        ownerName: o.name,
        building: o.building,
        room: o.room,
        period: genForm.period,
        propertyFee: Math.round(baseFee * 100) / 100,
        waterFee: Math.round((30 + Math.random() * 50) * 100) / 100,
        electricFee: Math.round((100 + Math.random() * 200) * 100) / 100,
        otherFee: 0,
        totalAmount: Math.round((baseFee + 80 + Math.random() * 250) * 100) / 100,
        dueDate: `${genForm.period}-28`,
      });
    });
    setGenerateOpen(false);
  };

  const handleAdjust = () => {
    if (!selectedBillId) return;
    const total = Math.round((adjForm.propertyFee + adjForm.waterFee + adjForm.electricFee + adjForm.otherFee) * 100) / 100;
    updateBill(selectedBillId, {
      propertyFee: adjForm.propertyFee,
      waterFee: adjForm.waterFee,
      electricFee: adjForm.electricFee,
      otherFee: adjForm.otherFee,
      totalAmount: total,
      remark: adjForm.reason || undefined,
    });
    setAdjustOpen(false);
  };

  const handleVoid = () => {
    if (!selectedBillId || !voidReason.trim()) return;
    voidBill(selectedBillId, `作废原因：${voidReason}`);
    setVoidOpen(false);
  };

  const totalStats = useMemo(() => {
    const valid = bills.filter((b) => b.status !== 'void');
    return {
      count: valid.length,
      receivable: valid.reduce((s, b) => s + b.totalAmount, 0),
      received: valid.reduce((s, b) => s + b.paidAmount, 0),
      unpaid: valid.reduce((s, b) => s + (b.totalAmount - b.paidAmount), 0),
    };
  }, [bills]);

  const tabs: { key: Tab; label: string; icon: any }[] = [
    { key: 'list', label: '账单列表', icon: FileText },
    { key: 'generate', label: '生成账单', icon: Plus },
    { key: 'adjust', label: '调整记录', icon: Edit2 },
    { key: 'void', label: '作废记录', icon: Trash2 },
  ];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-card">
          <p className="text-xs text-slate-500">账单总数</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 font-serif tabular-nums">{totalStats.count}</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-card">
          <p className="text-xs text-slate-500">应收总额</p>
          <p className="mt-1 text-2xl font-bold text-primary-700 font-serif">{formatCurrency(totalStats.receivable)}</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-card">
          <p className="text-xs text-slate-500">已收金额</p>
          <p className="mt-1 text-2xl font-bold text-success-700 font-serif">{formatCurrency(totalStats.received)}</p>
        </div>
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-card">
          <p className="text-xs text-slate-500">待收金额</p>
          <p className="mt-1 text-2xl font-bold text-danger-500 font-serif">{formatCurrency(totalStats.unpaid)}</p>
        </div>
      </div>

      <Card>
        <div className="border-b border-slate-200 px-5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => {
                    setTab(t.key);
                    if (t.key === 'generate') setGenerateOpen(true);
                  }}
                  className={cn(
                    'flex items-center gap-2 px-4 py-3.5 text-sm font-medium border-b-2 -mb-px transition-colors',
                    active
                      ? 'border-primary-700 text-primary-800'
                      : 'border-transparent text-slate-500 hover:text-slate-700'
                  )}
                >
                  <Icon className="w-4 h-4" />
                  {t.label}
                </button>
              );
            })}
          </div>
          <div className="flex items-center gap-2 py-2">
            <Button size="sm" variant="outline" icon={<Download className="w-4 h-4" />}>导出</Button>
            <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setGenerateOpen(true)}>生成账单</Button>
          </div>
        </div>

        {tab === 'list' && (
          <>
            <div className="px-5 py-4 border-b border-slate-100 grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50/50">
              <div className="relative md:col-span-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setBillFilters({ keyword: e.target.value || undefined });
                  }}
                  placeholder="搜索业主 / 房号 / 账单号"
                  className="w-full h-9 pl-9 pr-4 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400/30"
                />
              </div>
              <select
                value={billFilters.period || ''}
                onChange={(e) => setBillFilters({ period: e.target.value || undefined })}
                className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400/30"
              >
                {periods.map((p) => (<option key={p} value={p}>{p || '全部账期'}</option>))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={billFilters.building || ''}
                  onChange={(e) => setBillFilters({ building: e.target.value || undefined })}
                  className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400/30"
                >
                  {buildings.map((b) => (<option key={b} value={b}>{b || '全部楼栋'}</option>))}
                </select>
                <select
                  value={billFilters.status || ''}
                  onChange={(e) => setBillFilters({ status: (e.target.value as any) || undefined })}
                  className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400/30"
                >
                  {statusOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
                </select>
              </div>
            </div>

            <CardBody className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-left text-xs font-semibold text-slate-600 uppercase">
                      <th className="px-5 py-3">账单信息</th>
                      <th className="px-5 py-3">业主 / 房号</th>
                      <th className="px-5 py-3 text-right">物业费</th>
                      <th className="px-5 py-3 text-right">水电费</th>
                      <th className="px-5 py-3 text-right">应收总额</th>
                      <th className="px-5 py-3 text-right">已收/待收</th>
                      <th className="px-5 py-3">账期/到期</th>
                      <th className="px-5 py-3">状态</th>
                      <th className="px-5 py-3 text-right">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bills.map((b, i) => {
                      const owner = owners.find((o) => o.id === b.ownerId);
                      return (
                        <tr key={b.id} className="border-b border-slate-50 hover:bg-primary-50/40 transition-colors animate-fade-in-stagger" style={{ animationDelay: `${i * 20}ms` }}>
                          <td className="px-5 py-3.5">
                            <p className="font-mono text-xs text-primary-700 font-semibold">{b.id.slice(-10).toUpperCase()}</p>
                            <p className="text-[11px] text-slate-500 mt-0.5">生成于 {formatDate(b.generateDate, 'MM-dd')}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-[11px] font-bold text-primary-700">
                                {b.ownerName[0]}
                              </div>
                              <div>
                                <p className="font-medium text-slate-900">{b.ownerName}</p>
                                <p className="text-[11px] text-slate-500">{b.building} · {b.room}</p>
                              </div>
                              {owner && <OwnerStatusBadge status={owner.status} />}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-right tabular-nums text-slate-700">{formatCurrency(b.propertyFee)}</td>
                          <td className="px-5 py-3.5 text-right tabular-nums text-slate-700">{formatCurrency(b.waterFee + b.electricFee)}</td>
                          <td className="px-5 py-3.5 text-right tabular-nums font-bold text-slate-900">{formatCurrency(b.totalAmount)}</td>
                          <td className="px-5 py-3.5 text-right">
                            <p className="text-xs font-medium text-success-700 tabular-nums">{formatCurrency(b.paidAmount)}</p>
                            <p className="text-xs text-danger-500 tabular-nums">{formatCurrency(b.totalAmount - b.paidAmount)}</p>
                          </td>
                          <td className="px-5 py-3.5">
                            <p className="text-xs font-medium text-slate-900">{b.period}</p>
                            <p className="text-[11px] text-slate-500">到期：{formatDate(b.dueDate, 'MM-dd')}</p>
                          </td>
                          <td className="px-5 py-3.5"><BillStatusBadge status={b.status} /></td>
                          <td className="px-5 py-3.5 text-right">
                            {b.status !== 'void' && b.status !== 'paid' && (
                              <>
                                <Button size="sm" variant="ghost" icon={<Edit2 className="w-3.5 h-3.5" />} onClick={() => openAdjust(b)}>调整</Button>
                                <Button size="sm" variant="ghost" className="text-danger-500 hover:!text-danger-600" icon={<Trash2 className="w-3.5 h-3.5" />} onClick={() => openVoid(b)}>作废</Button>
                              </>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardBody>
          </>
        )}
      </Card>

      <Modal
        open={generateOpen}
        title="批量生成账单"
        subtitle="选择账期、楼栋和费用类型"
        onClose={() => setGenerateOpen(false)}
        size="lg"
        footer={
          <>
            <Button variant="outline" onClick={() => setGenerateOpen(false)}>取消</Button>
            <Button onClick={handleGenerate}>确认生成</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">账期月份</label>
              <select
                value={genForm.period}
                onChange={(e) => setGenForm({ ...genForm, period: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30"
              >
                {periods.filter(Boolean).map((p) => (<option key={p}>{p}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">目标楼栋</label>
              <select
                value={genForm.building}
                onChange={(e) => setGenForm({ ...genForm, building: e.target.value })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30"
              >
                <option value="">全部楼栋</option>
                {buildings.filter(Boolean).map((b) => (<option key={b}>{b}</option>))}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">费用类型</label>
            <div className="grid grid-cols-2 gap-2">
              {[{ v: 'all', l: '全部费用（物业费+水电气）' }, { v: 'property', l: '仅物业费' }, { v: 'utility', l: '仅水电费' }, { v: 'other', l: '自定义费用' }].map((o) => (
                <label key={o.v} className={cn(
                  'flex items-center gap-2 p-3 rounded-lg border cursor-pointer transition-all',
                  genForm.feeType === o.v ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-200' : 'border-slate-200 hover:border-slate-300'
                )}>
                  <input type="radio" checked={genForm.feeType === o.v} onChange={() => setGenForm({ ...genForm, feeType: o.v })} className="text-primary-600" />
                  <span className="text-sm text-slate-700">{o.l}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="p-4 rounded-lg bg-amber-50 border border-amber-100">
            <p className="text-xs text-amber-800">
              💡 将为 <span className="font-bold">{genForm.building ? owners.filter(o => o.building === genForm.building).length : owners.length}</span> 户业主生成 {genForm.period} 账期账单，已存在的账期账单会自动跳过。
            </p>
          </div>
        </div>
      </Modal>

      <Modal
        open={adjustOpen}
        title="调整账单明细"
        subtitle={selectedBill ? `${selectedBill.ownerName} · ${selectedBill.period}` : ''}
        onClose={() => setAdjustOpen(false)}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>取消</Button>
            <Button onClick={handleAdjust} disabled={!adjForm.reason.trim()}>确认调整</Button>
          </>
        }
      >
        {selectedBill && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">物业费（元）</label>
                <input type="number" value={adjForm.propertyFee} onChange={(e) => setAdjForm({ ...adjForm, propertyFee: Number(e.target.value) })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">水费（元）</label>
                <input type="number" value={adjForm.waterFee} onChange={(e) => setAdjForm({ ...adjForm, waterFee: Number(e.target.value) })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">电费（元）</label>
                <input type="number" value={adjForm.electricFee} onChange={(e) => setAdjForm({ ...adjForm, electricFee: Number(e.target.value) })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30" />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">其他费用（元）</label>
                <input type="number" value={adjForm.otherFee} onChange={(e) => setAdjForm({ ...adjForm, otherFee: Number(e.target.value) })}
                  className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30" />
              </div>
            </div>
            <div className="p-3 rounded-lg bg-slate-50 flex items-center justify-between">
              <span className="text-sm text-slate-600">调整后合计</span>
              <span className="text-xl font-bold text-primary-700 tabular-nums font-serif">
                {formatCurrency(adjForm.propertyFee + adjForm.waterFee + adjForm.electricFee + adjForm.otherFee)}
              </span>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">调整原因 <span className="text-danger-500">*</span></label>
              <textarea
                value={adjForm.reason}
                onChange={(e) => setAdjForm({ ...adjForm, reason: e.target.value })}
                rows={3}
                placeholder="请说明调整原因，如面积核算错误、减免申请等"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30 resize-none"
              />
            </div>
          </div>
        )}
      </Modal>

      <Modal
        open={voidOpen}
        title="作废账单"
        subtitle={selectedBill ? `${selectedBill.ownerName} · ${selectedBill.period} · ${formatCurrency(selectedBill.totalAmount)}` : ''}
        onClose={() => setVoidOpen(false)}
        size="md"
        footer={
          <>
            <Button variant="outline" onClick={() => setVoidOpen(false)}>取消</Button>
            <Button variant="danger" onClick={handleVoid} disabled={!voidReason.trim()}>确认作废</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-danger-50 border border-danger-100 text-danger-700 text-sm">
            ⚠️ 作废操作不可恢复，账单将不会被删除但会标记为作废状态，不再参与任何统计计算。
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">作废原因 <span className="text-danger-500">*</span></label>
            <textarea
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
              rows={3}
              placeholder="请填写作废原因，该原因会记录到账单备注中"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30 resize-none"
            />
          </div>
          <p className="text-xs text-slate-500">操作人：赵主管 · 操作时间：{todayStr()}</p>
        </div>
      </Modal>
    </div>
  );
};
