import { useState, useMemo } from 'react';
import { Plus, Search, Download, Percent, Receipt, DollarSign, Banknote, XCircle } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PaymentMethodTag, BillStatusBadge } from '@/components/ui/StatusBadge';
import { useAppStore } from '@/store';
import type { PaymentMethod } from '@/types';
import { formatCurrency, formatDateTime, todayStr } from '@/utils/format';
import { cn } from '@/utils/helpers';

const paymentMethods: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'wechat', label: '微信支付', icon: '💚' },
  { value: 'alipay', label: '支付宝', icon: '💙' },
  { value: 'bank', label: '银行转账', icon: '🏦' },
  { value: 'card', label: '刷卡', icon: '💳' },
  { value: 'cash', label: '现金', icon: '💵' },
];

export const Receipts = () => {
  const receipts = useAppStore((s) => s.receipts);
  const owners = useAppStore((s) => s.owners);
  const bills = useAppStore((s) => s.bills);
  const staffs = useAppStore((s) => s.staffs);
  const { addReceipt } = useAppStore();

  const [searchInput, setSearchInput] = useState('');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | ''>('');
  const [createOpen, setCreateOpen] = useState(false);

  const [form, setForm] = useState({
    ownerId: '',
    billId: '',
    amount: 0,
    discount: 0,
    method: 'wechat' as PaymentMethod,
    remark: '',
    operatorId: staffs[0]?.id || '',
    operatorName: staffs[0]?.name || '',
  });
  const [useDiscount, setUseDiscount] = useState(false);
  const [partialPay, setPartialPay] = useState(false);

  const filtered = useMemo(() => {
    return receipts.filter((r) => {
      if (methodFilter && r.method !== methodFilter) return false;
      if (searchInput) {
        const kw = searchInput.toLowerCase();
        return (
          r.ownerName.toLowerCase().includes(kw) ||
          r.building.toLowerCase().includes(kw) ||
          r.room.toLowerCase().includes(kw) ||
          r.operatorName.toLowerCase().includes(kw)
        );
      }
      return true;
    }).sort((a, b) => (b.payDate > a.payDate ? 1 : -1));
  }, [receipts, methodFilter, searchInput]);

  const stats = useMemo(() => {
    return {
      count: receipts.length,
      total: receipts.reduce((s, r) => s + r.amount, 0),
      discount: receipts.reduce((s, r) => s + r.discount, 0),
      today: receipts.filter((r) => r.payDate.startsWith(todayStr())).reduce((s, r) => s + r.amount, 0),
      todayCount: receipts.filter((r) => r.payDate.startsWith(todayStr())).length,
    };
  }, [receipts]);

  const selectedOwner = useMemo(() => owners.find((o) => o.id === form.ownerId), [owners, form.ownerId]);
  const ownerBills = useMemo(
    () => (form.ownerId ? bills.filter((b) => b.ownerId === form.ownerId && b.status !== 'void' && b.status !== 'paid') : []),
    [bills, form.ownerId]
  );
  const selectedBill = useMemo(() => bills.find((b) => b.id === form.billId), [bills, form.billId]);

  const handleOwnerChange = (ownerId: string) => {
    const oBills = bills.filter((b) => b.ownerId === ownerId && b.status !== 'void' && b.status !== 'paid');
    const first = oBills[0];
    setForm({
      ...form,
      ownerId,
      billId: first?.id || '',
      amount: first ? first.totalAmount - first.paidAmount : 0,
    });
    setPartialPay(false);
    setUseDiscount(false);
  };

  const handleBillChange = (billId: string) => {
    const bill = bills.find((b) => b.id === billId);
    setForm({
      ...form,
      billId,
      amount: bill ? bill.totalAmount - bill.paidAmount : 0,
    });
    setPartialPay(false);
  };

  const handleCreate = () => {
    const owner = owners.find((o) => o.id === form.ownerId);
    if (!owner) return;
    addReceipt({
      ownerId: owner.id,
      ownerName: owner.name,
      building: owner.building,
      room: owner.room,
      billId: form.billId || undefined,
      amount: form.amount,
      discount: useDiscount ? form.discount : 0,
      method: form.method,
      operatorId: form.operatorId,
      operatorName: form.operatorName,
      remark: form.remark || (useDiscount ? `减免${formatCurrency(form.discount)}` : partialPay ? '部分缴费' : undefined),
    });
    setCreateOpen(false);
    setForm({
      ownerId: '', billId: '', amount: 0, discount: 0, method: 'wechat', remark: '',
      operatorId: staffs[0]?.id || '', operatorName: staffs[0]?.name || '',
    });
    setUseDiscount(false);
    setPartialPay(false);
  };

  const actualPay = useMemo(() => form.amount - (useDiscount ? form.discount : 0), [form.amount, form.discount, useDiscount]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 hoverable">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-success-50 flex items-center justify-center">
              <Receipt className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">收款笔数</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 font-serif tabular-nums">{stats.count}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 hoverable">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">累计收款</p>
              <p className="mt-1 text-2xl font-bold text-primary-700 font-serif">{formatCurrency(stats.total)}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 hoverable">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-warning-50 flex items-center justify-center">
              <Banknote className="w-5 h-5 text-warning-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">今日收款</p>
              <p className="mt-1 text-2xl font-bold text-warning-600 font-serif">{formatCurrency(stats.today)}</p>
              <p className="text-[10px] text-slate-400 mt-0.5">{stats.todayCount} 笔</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 hoverable">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-danger-50 flex items-center justify-center">
              <Percent className="w-5 h-5 text-danger-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">累计减免</p>
              <p className="mt-1 text-2xl font-bold text-danger-500 font-serif">{formatCurrency(stats.discount)}</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder="搜索业主 / 楼栋 / 房号"
                  className="w-64 h-10 pl-9 pr-4 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30"
                />
              </div>
              <div className="flex items-center gap-1 border-l border-slate-200 pl-2 ml-1">
                {paymentMethods.map((m) => (
                  <button
                    key={m.value}
                    onClick={() => setMethodFilter(methodFilter === m.value ? '' : m.value)}
                    className={cn(
                      'px-2.5 h-9 rounded-lg text-xs font-medium border transition-all',
                      methodFilter === m.value
                        ? 'bg-primary-800 border-primary-800 text-white'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {m.icon} {m.label}
                  </button>
                ))}
              </div>
            </div>
          }
          subtitle={`共 ${filtered.length} 条记录`}
          action={
            <div className="flex gap-2">
              <Button size="sm" variant="outline" icon={<Download className="w-4 h-4" />}>导出</Button>
              <Button size="sm" icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>登记收款</Button>
            </div>
          }
        />

        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-left text-xs font-semibold text-slate-600 uppercase">
                  <th className="px-5 py-3">收款单号</th>
                  <th className="px-5 py-3">业主信息</th>
                  <th className="px-5 py-3 text-right">应收金额</th>
                  <th className="px-5 py-3 text-right">减免金额</th>
                  <th className="px-5 py-3 text-right">实收金额</th>
                  <th className="px-5 py-3">支付方式</th>
                  <th className="px-5 py-3">操作人</th>
                  <th className="px-5 py-3">收款时间</th>
                  <th className="px-5 py-3">备注</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-success-50/40 transition-colors animate-fade-in-stagger" style={{ animationDelay: `${i * 20}ms` }}>
                    <td className="px-5 py-3.5">
                      <span className="font-mono text-xs text-primary-700 font-semibold">{r.id.slice(-10).toUpperCase()}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-900">{r.ownerName}</p>
                      <p className="text-xs text-slate-500">{r.building} {r.room}</p>
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-600 tabular-nums">{formatCurrency(r.amount + r.discount)}</td>
                    <td className="px-5 py-3.5 text-right">
                      {r.discount > 0
                        ? <span className="text-danger-500 font-medium tabular-nums">-{formatCurrency(r.discount)}</span>
                        : <span className="text-slate-300">—</span>
                      }
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <span className="font-bold text-success-700 tabular-nums">{formatCurrency(r.amount)}</span>
                    </td>
                    <td className="px-5 py-3.5"><PaymentMethodTag method={r.method} /></td>
                    <td className="px-5 py-3.5 text-slate-600">{r.operatorName}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 font-mono">{r.payDate.slice(5, 16)}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500 max-w-[160px] truncate">{r.remark || '-'}</td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-5 py-16 text-center text-slate-400">暂无收款记录</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Modal
        open={createOpen}
        title="登记收款"
        subtitle="录入业主缴费信息"
        onClose={() => setCreateOpen(false)}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={!form.ownerId || form.amount <= 0 || actualPay <= 0}>
              确认收款 {actualPay > 0 && `(${formatCurrency(actualPay)})`}
            </Button>
          </>
        }
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">选择业主 <span className="text-danger-500">*</span></label>
              <select
                value={form.ownerId}
                onChange={(e) => handleOwnerChange(e.target.value)}
                className="w-full h-11 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30 bg-white"
              >
                <option value="">请选择业主</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} - {o.building} {o.room}{o.unpaidAmount > 0 ? `（欠费${formatCurrency(o.unpaidAmount)}）` : ''}
                  </option>
                ))}
              </select>
            </div>

            {selectedOwner && (
              <div className="p-4 rounded-xl bg-gradient-to-br from-primary-50 to-white border border-primary-100">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs text-slate-500">当前欠费</p>
                    <p className="text-lg font-bold text-danger-500 font-serif">{formatCurrency(selectedOwner.unpaidAmount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">欠费月数</p>
                    <p className="text-lg font-bold text-warning-600 font-serif">{selectedOwner.unpaidMonths} 个月</p>
                  </div>
                </div>
              </div>
            )}

            {ownerBills.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">选择账单</label>
                <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                  {ownerBills.map((b) => (
                    <label
                      key={b.id}
                      className={cn(
                        'flex items-center justify-between p-3 rounded-lg border cursor-pointer transition-all',
                        form.billId === b.id
                          ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-200'
                          : 'border-slate-200 hover:border-slate-300'
                      )}
                    >
                      <div className="flex items-center gap-2">
                        <input
                          type="radio"
                          checked={form.billId === b.id}
                          onChange={() => handleBillChange(b.id)}
                          className="text-primary-600"
                        />
                        <div>
                          <p className="text-sm font-medium text-slate-900">{b.period} 账期</p>
                          <p className="text-[11px] text-slate-500">
                            应收 {formatCurrency(b.totalAmount)} · 已缴 {formatCurrency(b.paidAmount)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <BillStatusBadge status={b.status} />
                        <p className="text-xs text-danger-500 mt-1 font-medium tabular-nums">
                          待缴 {formatCurrency(b.totalAmount - b.paidAmount)}
                        </p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">支付方式 <span className="text-danger-500">*</span></label>
              <div className="grid grid-cols-5 gap-2">
                {paymentMethods.map((m) => (
                  <label
                    key={m.value}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2.5 rounded-lg border cursor-pointer transition-all text-center',
                      form.method === m.value
                        ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-200'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <input
                      type="radio"
                      checked={form.method === m.value}
                      onChange={() => setForm({ ...form, method: m.value })}
                      className="hidden"
                    />
                    <span className="text-xl">{m.icon}</span>
                    <span className="text-[10px] text-slate-600">{m.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-medium text-slate-600">缴费金额（元）</label>
                {selectedBill && selectedBill.totalAmount - selectedBill.paidAmount > form.amount && (
                  <button
                    type="button"
                    onClick={() => setPartialPay((v) => !v)}
                    className={cn(
                      'text-[11px] px-2 py-0.5 rounded-md font-medium border',
                      partialPay
                        ? 'bg-warning-50 text-warning-600 border-warning-200'
                        : 'border-slate-200 text-slate-500 hover:border-slate-300'
                    )}
                  >
                    {partialPay ? '部分缴费' : '全额缴费'}
                  </button>
                )}
              </div>
              <input
                type="number"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Math.max(0, Number(e.target.value)) })}
                className="w-full h-14 px-4 rounded-xl border-2 border-primary-200 bg-primary-50/40 text-2xl font-bold text-primary-900 tabular-nums font-serif focus:outline-none focus:ring-2 focus:ring-primary-400 focus:border-primary-500 transition-all"
                placeholder="0.00"
              />
              {selectedBill && (
                <p className="text-[11px] text-slate-400 mt-1">
                  该账单待缴：{formatCurrency(selectedBill.totalAmount - selectedBill.paidAmount)}
                </p>
              )}
            </div>

            <div className="p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Percent className="w-4 h-4 text-warning-500" />
                  <span className="text-sm font-medium text-slate-700">费用减免</span>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={useDiscount} onChange={(e) => setUseDiscount(e.target.checked)} className="sr-only peer" />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-primary-700"></div>
                </label>
              </div>
              <input
                type="number"
                disabled={!useDiscount}
                value={form.discount}
                onChange={(e) => setForm({ ...form, discount: Math.max(0, Number(e.target.value)) })}
                className={cn(
                  'w-full h-10 px-3 rounded-lg border text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-400/30',
                  useDiscount ? 'border-warning-300 bg-white text-warning-700' : 'border-slate-200 bg-slate-100 text-slate-400'
                )}
                placeholder="0.00"
              />
            </div>

            <div className="p-5 rounded-xl bg-gradient-to-br from-success-50 via-white to-primary-50 border border-success-200 shadow-sm">
              <div className="text-xs text-slate-500 mb-1">实收金额合计</div>
              <div className="flex items-baseline justify-between">
                <span className="text-4xl font-bold text-success-700 font-serif tabular-nums tracking-tight">
                  {formatCurrency(actualPay)}
                </span>
                {useDiscount && (
                  <div className="text-right">
                    <p className="text-[11px] text-danger-500">优惠减免</p>
                    <p className="text-sm font-bold text-danger-500">-{formatCurrency(form.discount)}</p>
                  </div>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">备注说明</label>
              <textarea
                value={form.remark}
                onChange={(e) => setForm({ ...form, remark: e.target.value })}
                rows={3}
                placeholder="可填写相关说明，如：业主困难减免、季度优惠等"
                className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30 resize-none"
              />
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
