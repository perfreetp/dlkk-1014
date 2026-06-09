import { useState, useMemo, useEffect } from 'react';
import { Plus, Search, Download, Percent, Receipt as ReceiptIcon, DollarSign, Banknote, XCircle, CheckSquare, Square, Wand2, Minus, ChevronDown, ChevronUp, CheckCircle2, FileText, Trash2, AlertTriangle } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { PaymentMethodTag, BillStatusBadge } from '@/components/ui/StatusBadge';
import { useAppStore } from '@/store';
import type { Bill, PaymentMethod, Receipt as ReceiptType } from '@/types';
import { formatCurrency, formatDateTime, todayStr } from '@/utils/format';
import { cn } from '@/utils/helpers';

const paymentMethods: { value: PaymentMethod; label: string; icon: string }[] = [
  { value: 'wechat', label: '微信支付', icon: '💚' },
  { value: 'alipay', label: '支付宝', icon: '💙' },
  { value: 'bank', label: '银行转账', icon: '🏦' },
  { value: 'card', label: '刷卡', icon: '💳' },
  { value: 'cash', label: '现金', icon: '💵' },
];

type BillSelectionMap = Record<string, { allocation: number; discount: number }>;

export const Receipts = () => {
  const receipts = useAppStore((s) => s.receipts);
  const owners = useAppStore((s) => s.owners);
  const bills = useAppStore((s) => s.bills);
  const staffs = useAppStore((s) => s.staffs);
  const { addReceiptDetailed } = useAppStore();
  const voidReceipt = useAppStore((s) => s.voidReceipt);
  const currentStaff = useAppStore((s) => s.staffs.find((x) => x.role === 'finance') || s.staffs[0]);

  const [searchInput, setSearchInput] = useState('');
  const [methodFilter, setMethodFilter] = useState<PaymentMethod | ''>('');
  const [createOpen, setCreateOpen] = useState(false);
  const [expandedReceiptId, setExpandedReceiptId] = useState<string | null>(null);
  const [voidTarget, setVoidTarget] = useState<ReceiptType | null>(null);
  const [voidReason, setVoidReason] = useState('');

  const [ownerId, setOwnerId] = useState('');
  const [selectedBillIds, setSelectedBillIds] = useState<string[]>([]);
  const [selections, setSelections] = useState<BillSelectionMap>({});
  const [method, setMethod] = useState<PaymentMethod>('wechat');
  const [remark, setRemark] = useState('');
  const [globalPayAmount, setGlobalPayAmount] = useState<number | ''>('');
  const [globalDiscount, setGlobalDiscount] = useState<number | ''>('');

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

  const selectedOwner = useMemo(() => owners.find((o) => o.id === ownerId), [owners, ownerId]);
  const ownerBills = useMemo(() => {
    if (!ownerId) return [] as Bill[];
    return bills
      .filter((b) => b.ownerId === ownerId && b.status !== 'void' && b.status !== 'paid')
      .sort((a, b) => (a.period > b.period ? 1 : -1));
  }, [bills, ownerId]);

  useEffect(() => {
    const next: BillSelectionMap = {};
    for (const b of ownerBills) {
      const unpaid = Math.round((b.totalAmount - b.paidAmount) * 100) / 100;
      next[b.id] = selections[b.id] || { allocation: 0, discount: 0 };
      if (selections[b.id] === undefined) {
        next[b.id] = { allocation: 0, discount: 0 };
      }
    }
    setSelections(next);
  }, [ownerBills.length]);

  const handleOwnerChange = (newOwnerId: string) => {
    setOwnerId(newOwnerId);
    setSelectedBillIds([]);
    setSelections({});
    setGlobalPayAmount('');
    setGlobalDiscount('');
    setRemark('');
  };

  const toggleBill = (billId: string) => {
    const bill = ownerBills.find((b) => b.id === billId);
    if (!bill) return;
    const unpaid = Math.round((bill.totalAmount - bill.paidAmount) * 100) / 100;
    setSelectedBillIds((prev) => {
      const exists = prev.includes(billId);
      if (!exists) {
        setSelections((s) => ({
          ...s,
          [billId]: { allocation: unpaid, discount: 0 },
        }));
        return [...prev, billId];
      } else {
        setSelections((s) => ({
          ...s,
          [billId]: { allocation: 0, discount: 0 },
        }));
        return prev.filter((x) => x !== billId);
      }
    });
  };

  const toggleAllBills = () => {
    if (selectedBillIds.length === ownerBills.length) {
      setSelectedBillIds([]);
      const empty: BillSelectionMap = {};
      for (const b of ownerBills) empty[b.id] = { allocation: 0, discount: 0 };
      setSelections(empty);
    } else {
      const ids: string[] = [];
      const next: BillSelectionMap = {};
      for (const b of ownerBills) {
        const unpaid = Math.round((b.totalAmount - b.paidAmount) * 100) / 100;
        ids.push(b.id);
        next[b.id] = { allocation: unpaid, discount: 0 };
      }
      setSelectedBillIds(ids);
      setSelections(next);
    }
  };

  const updateSelection = (billId: string, field: 'allocation' | 'discount', rawVal: string) => {
    const val = Math.max(0, Number(rawVal) || 0);
    const rounded = Math.round(val * 100) / 100;
    const bill = ownerBills.find((b) => b.id === billId);
    const unpaid = bill ? Math.round((bill.totalAmount - bill.paidAmount) * 100) / 100 : 0;
    let finalAlloc = rounded;
    if (field === 'allocation') {
      finalAlloc = Math.min(rounded, unpaid);
    }
    setSelections((s) => ({
      ...s,
      [billId]: {
        ...(s[billId] || { allocation: 0, discount: 0 }),
        [field]: finalAlloc,
      },
    }));
  };

  const runAutoAllocation = () => {
    if (typeof globalPayAmount !== 'number' || globalPayAmount <= 0) return;
    const ordered = [...ownerBills].sort((a, b) => (a.period > b.period ? 1 : -1));
    const next: BillSelectionMap = {};
    const selectedIds: string[] = [];
    let remainingPay = Math.round(globalPayAmount * 100) / 100;
    const globalDiscAmount = typeof globalDiscount === 'number' ? Math.round(globalDiscount * 100) / 100 : 0;
    let remainingDiscount = globalDiscAmount;

    for (let i = 0; i < ordered.length; i++) {
      const b = ordered[i];
      const unpaid = Math.round((b.totalAmount - b.paidAmount) * 100) / 100;
      const isLast = i === ordered.length - 1;
      const futureUnpaid = ordered.slice(i).reduce((s, x) => s + Math.round((x.totalAmount - x.paidAmount) * 100) / 100, 0);

      let billDiscount = 0;
      if (remainingDiscount > 0 && unpaid > 0 && futureUnpaid > 0) {
        if (isLast) {
          billDiscount = Math.min(remainingDiscount, unpaid);
        } else {
          const ratio = unpaid / futureUnpaid;
          billDiscount = Math.min(
            Math.round((remainingDiscount * ratio) * 100) / 100,
            remainingDiscount,
            unpaid
          );
        }
        billDiscount = Math.round(billDiscount * 100) / 100;
      }

      let pay = 0;
      if (remainingPay > 0 && unpaid > 0) {
        const effective = Math.max(0, unpaid - billDiscount);
        pay = isLast
          ? Math.min(remainingPay, effective)
          : Math.min(remainingPay, effective);
        pay = Math.round(pay * 100) / 100;
      }

      remainingDiscount = Math.round((remainingDiscount - billDiscount) * 100) / 100;
      remainingPay = Math.round((remainingPay - pay) * 100) / 100;
      next[b.id] = { allocation: pay, discount: billDiscount };
      if (pay > 0 || billDiscount > 0) selectedIds.push(b.id);
    }

    setSelections(next);
    setSelectedBillIds(selectedIds);
  };

  const totals = useMemo(() => {
    let totalBill = 0;
    let totalAlloc = 0;
    let totalDisc = 0;
    for (const bid of selectedBillIds) {
      const sel = selections[bid];
      const bill = ownerBills.find((b) => b.id === bid);
      if (!bill || !sel) continue;
      const unpaid = Math.round((bill.totalAmount - bill.paidAmount) * 100) / 100;
      totalBill += unpaid;
      totalAlloc += sel.allocation;
      totalDisc += sel.discount;
    }
    return {
      totalBill: Math.round(totalBill * 100) / 100,
      totalAlloc: Math.round(totalAlloc * 100) / 100,
      totalDisc: Math.round(totalDisc * 100) / 100,
    };
  }, [selectedBillIds, selections, ownerBills]);

  const actualPay = totals.totalAlloc;
  const shouldPay = Math.round(Math.max(0, totals.totalBill - totals.totalDisc) * 100) / 100;
  const diff = Math.round((actualPay - shouldPay) * 100) / 100;
  const canSubmit = selectedBillIds.length > 0 && actualPay > 0;

  const resetForm = () => {
    setOwnerId('');
    setSelectedBillIds([]);
    setSelections({});
    setMethod('wechat');
    setRemark('');
    setGlobalPayAmount('');
    setGlobalDiscount('');
  };

  const handleCreate = () => {
    if (!selectedOwner || !canSubmit) return;
    const billSelections = selectedBillIds
      .map((bid) => {
        const bill = ownerBills.find((b) => b.id === bid);
        const sel = selections[bid];
        if (!bill || !sel || (sel.allocation <= 0 && sel.discount <= 0)) return null;
        return { bill, allocation: sel.allocation, discount: sel.discount };
      })
      .filter(Boolean) as Array<{ bill: Bill; allocation: number; discount: number }>;
    if (billSelections.length === 0) return;

    const op = staffs.find((s) => s.role === 'finance') || staffs[0];
    addReceiptDetailed({
      ownerId: selectedOwner.id,
      ownerName: selectedOwner.name,
      building: selectedOwner.building,
      room: selectedOwner.room,
      method,
      operatorId: op.id,
      operatorName: op.name,
      remark: remark || (totals.totalDisc > 0 ? `优惠减免${formatCurrency(totals.totalDisc)}` : actualPay < totals.totalBill ? '部分缴费' : undefined),
      billSelections,
    });
    setCreateOpen(false);
    resetForm();
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 hoverable">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-success-50 flex items-center justify-center">
              <ReceiptIcon className="w-5 h-5 text-success-600" />
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
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-5 py-3">收款单号</th>
                  <th className="px-5 py-3">业主信息</th>
                  <th className="px-5 py-3 text-right">应收金额</th>
                  <th className="px-5 py-3 text-right">减免金额</th>
                  <th className="px-5 py-3 text-right">实收金额</th>
                  <th className="px-5 py-3">支付方式</th>
                  <th className="px-5 py-3">操作人</th>
                  <th className="px-5 py-3">收款时间</th>
                  <th className="px-5 py-3">备注</th>
                  <th className="px-5 py-3 w-24">操作</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r, i) => {
                  const expanded = expandedReceiptId === r.id;
                  const allocations = r.allocations || [];
                  return (
                    <>
                    <tr
                      key={r.id}
                      className={cn(
                        'border-b border-slate-50 transition-colors animate-fade-in-stagger',
                        expanded ? 'bg-primary-50/40' : 'hover:bg-success-50/40',
                        r.status === 'void' && 'opacity-60'
                      )}
                      style={{ animationDelay: `${i * 20}ms` }}
                    >
                      <td className="px-4 py-3.5">
                        {allocations.length > 0 && (
                          <button
                            type="button"
                            onClick={() => setExpandedReceiptId(expanded ? null : r.id)}
                            className={cn(
                              'w-7 h-7 rounded-md flex items-center justify-center transition-all',
                              expanded ? 'bg-primary-100 text-primary-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                            )}
                          >
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="font-mono text-xs text-primary-700 font-semibold">{r.id.slice(-10).toUpperCase()}</span>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-900">{r.ownerName}</p>
                        <p className="text-xs text-slate-500">{r.building} {r.room}</p>
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-600 tabular-nums">{formatCurrency(r.totalBillAmount)}</td>
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
                      <td className="px-5 py-3.5">
                        {r.status === 'void' ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-md bg-gray-100 text-gray-500 text-[11px] font-medium">已作废</span>
                        ) : (
                          <Button
                            variant="danger"
                            size="sm"
                            icon={<Trash2 className="w-4 h-4" />}
                            onClick={() => setVoidTarget(r)}
                          >
                            作废
                          </Button>
                        )}
                      </td>
                    </tr>
                    {expanded && allocations.length > 0 && (
                      <tr key={`${r.id}-detail`} className="bg-slate-50/60 border-b border-slate-100">
                        <td colSpan={11} className="px-8 py-4">
                          <div className="rounded-lg border border-primary-100 bg-white overflow-hidden">
                            <div className="px-4 py-2.5 bg-primary-50/70 border-b border-primary-100 flex items-center gap-2">
                              <FileText className="w-4 h-4 text-primary-600" />
                              <p className="text-xs font-semibold text-primary-800">核销明细（共 {allocations.length} 张账单）</p>
                            </div>
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                  <th className="px-4 py-2 text-left">账期</th>
                                  <th className="px-4 py-2 text-right">原应收</th>
                                  <th className="px-4 py-2 text-right">核销前待缴</th>
                                  <th className="px-4 py-2 text-right">本次实收</th>
                                  <th className="px-4 py-2 text-right">本次减免</th>
                                  <th className="px-4 py-2 text-right">核销后余额</th>
                                </tr>
                              </thead>
                              <tbody>
                                {allocations.map((a) => {
                                  const remain = Math.max(0, Math.round((a.billUnpaid - a.allocated - a.discount) * 100) / 100);
                                  return (
                                    <tr key={a.billId} className="border-t border-slate-50 even:bg-slate-50/30">
                                      <td className="px-4 py-2.5 text-sm font-medium text-slate-800">{a.period}</td>
                                      <td className="px-4 py-2.5 text-right text-slate-500 tabular-nums">{formatCurrency(a.billTotal)}</td>
                                      <td className="px-4 py-2.5 text-right text-danger-600 tabular-nums font-medium">{formatCurrency(a.billUnpaid)}</td>
                                      <td className="px-4 py-2.5 text-right text-success-700 tabular-nums font-semibold">+{formatCurrency(a.allocated)}</td>
                                      <td className="px-4 py-2.5 text-right">
                                        {a.discount > 0
                                          ? <span className="text-warning-600 tabular-nums font-medium">-{formatCurrency(a.discount)}</span>
                                          : <span className="text-slate-300">—</span>
                                        }
                                      </td>
                                      <td className="px-4 py-2.5 text-right">
                                        <span className={cn(
                                          'tabular-nums font-semibold',
                                          remain === 0 ? 'text-success-600' : 'text-warning-600'
                                        )}>
                                          {remain === 0 ? '已结清' : formatCurrency(remain)}
                                        </span>
                                      </td>
                                    </tr>
                                  );
                                })}
                              </tbody>
                            </table>
                          </div>
                        </td>
                      </tr>
                    )}
                    </>
                  );
                })}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={11} className="px-5 py-16 text-center text-slate-400">暂无收款记录</td>
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
        subtitle="勾选账单后录入实缴金额与减免（自动按账期从早到晚分摊）"
        onClose={() => setCreateOpen(false)}
        size="xl"
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={!canSubmit}>
              确认收款 {actualPay > 0 && `（实收 ¥${actualPay.toFixed(2)}）`}
            </Button>
          </>
        }
      >
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">选择业主 <span className="text-danger-500">*</span></label>
              <select
                value={ownerId}
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
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">支付方式</label>
              <div className="grid grid-cols-5 gap-2">
                {paymentMethods.map((m) => (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setMethod(m.value)}
                    className={cn(
                      'flex flex-col items-center gap-1 p-2 rounded-lg border transition-all text-center',
                      method === m.value
                        ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-200'
                        : 'border-slate-200 hover:border-slate-300'
                    )}
                  >
                    <span className="text-xl">{m.icon}</span>
                    <span className="text-[10px] text-slate-600">{m.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {selectedOwner && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary-50 to-white border border-primary-100">
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-xs text-slate-500">当前欠费</p>
                  <p className="text-lg font-bold text-danger-500 font-serif tabular-nums">{formatCurrency(selectedOwner.unpaidAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">欠费月数</p>
                  <p className="text-lg font-bold text-warning-600 font-serif tabular-nums">{selectedOwner.unpaidMonths} 个月</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500">联系电话</p>
                  <p className="text-sm font-medium text-slate-900 mt-0.5 font-mono">{selectedOwner.phone}</p>
                </div>
              </div>
            </div>
          )}

          <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-600">总实收金额</label>
                <input
                  type="number"
                  value={globalPayAmount}
                  onChange={(e) => setGlobalPayAmount(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  placeholder="0.00"
                  className="w-32 h-9 px-3 rounded-lg border border-slate-200 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-400/30"
                />
              </div>
              <div className="flex items-center gap-2">
                <label className="text-xs font-medium text-slate-600">总减免</label>
                <input
                  type="number"
                  value={globalDiscount}
                  onChange={(e) => setGlobalDiscount(e.target.value === '' ? '' : Math.max(0, Number(e.target.value)))}
                  placeholder="0.00"
                  className="w-32 h-9 px-3 rounded-lg border border-warning-200 bg-warning-50/30 text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-warning-400/30"
                />
              </div>
              <Button
                size="sm"
                variant="outline"
                icon={<Wand2 className="w-3.5 h-3.5" />}
                onClick={runAutoAllocation}
                disabled={typeof globalPayAmount !== 'number' || globalPayAmount <= 0}
              >
                自动分摊到最早账期
              </Button>
            </div>
            <p className="text-[11px] text-slate-500">
              💡 勾选下方账单并填入实付金额后，可点击「自动分摊」按钮按账期顺序（最早优先）自动分配到各账单
            </p>
          </div>

          {ownerBills.length > 0 ? (
            <div className="rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
                <label className="flex items-center gap-2 text-xs font-medium text-slate-700 cursor-pointer select-none" onClick={toggleAllBills}>
                  {selectedBillIds.length === ownerBills.length ? (
                    <CheckSquare className="w-4 h-4 text-primary-600" />
                  ) : (
                    <Square className="w-4 h-4 text-slate-400" />
                  )}
                  全选未缴账单（按账期升序排列，最早优先）
                  <span className="ml-2 text-slate-500 font-normal">
                    ({selectedBillIds.length}/{ownerBills.length})
                  </span>
                </label>
              </div>
              <div className="max-h-[320px] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="sticky top-0 bg-white/95 backdrop-blur-sm shadow-[0_1px_0_0_#e2e8f0]">
                    <tr className="text-left text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                      <th className="px-4 py-2.5 w-10"></th>
                      <th className="px-4 py-2.5">账期 / 状态</th>
                      <th className="px-4 py-2.5 text-right">应收</th>
                      <th className="px-4 py-2.5 text-right">已缴</th>
                      <th className="px-4 py-2.5 text-right">待缴</th>
                      <th className="px-4 py-2.5 text-right">本次实付</th>
                      <th className="px-4 py-2.5 text-right">减免</th>
                      <th className="px-4 py-2.5 text-right">剩余</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ownerBills.map((b) => {
                      const unpaid = Math.round((b.totalAmount - b.paidAmount) * 100) / 100;
                      const checked = selectedBillIds.includes(b.id);
                      const sel = selections[b.id] || { allocation: 0, discount: 0 };
                      const alloc = Math.round(sel.allocation * 100) / 100;
                      const disc = Math.round(sel.discount * 100) / 100;
                      const remain = Math.round(Math.max(0, unpaid - alloc - disc) * 100) / 100;
                      return (
                        <tr key={b.id} className={cn('border-t border-slate-100 transition-colors', checked && 'bg-primary-50/30')}>
                          <td className="px-4 py-3">
                            <button type="button" onClick={() => toggleBill(b.id)} className="text-slate-500 hover:text-primary-600">
                              {checked ? (
                                <CheckSquare className="w-4 h-4 text-primary-600" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-300" />
                              )}
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-slate-900">{b.period}</p>
                            <div className="mt-0.5"><BillStatusBadge status={b.status} /></div>
                          </td>
                          <td className="px-4 py-3 text-right text-slate-600 tabular-nums">{formatCurrency(b.totalAmount)}</td>
                          <td className="px-4 py-3 text-right text-slate-500 tabular-nums">{formatCurrency(b.paidAmount)}</td>
                          <td className="px-4 py-3 text-right font-semibold text-danger-500 tabular-nums">{formatCurrency(unpaid)}</td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              disabled={!checked}
                              value={alloc}
                              onChange={(e) => updateSelection(b.id, 'allocation', e.target.value)}
                              step="0.01"
                              min={0}
                              max={unpaid}
                              className={cn(
                                'w-28 h-8 px-2 rounded-md border text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-primary-400/30 transition-all',
                                checked ? 'border-primary-200 bg-white focus:border-primary-400 text-slate-900 font-semibold' : 'border-slate-200 bg-slate-50 text-slate-400'
                              )}
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <input
                              type="number"
                              disabled={!checked}
                              value={disc}
                              onChange={(e) => updateSelection(b.id, 'discount', e.target.value)}
                              step="0.01"
                              min={0}
                              className={cn(
                                'w-24 h-8 px-2 rounded-md border text-right text-sm tabular-nums focus:outline-none focus:ring-2 focus:ring-warning-400/30 transition-all',
                                checked ? 'border-warning-200 bg-warning-50/30 focus:border-warning-400 text-warning-700 font-medium' : 'border-slate-200 bg-slate-50 text-slate-400'
                              )}
                              placeholder="0.00"
                            />
                          </td>
                          <td className="px-4 py-3 text-right">
                            <span className={cn('text-sm font-semibold tabular-nums', remain > 0 ? 'text-danger-500' : 'text-success-600')}>
                              {formatCurrency(remain)}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : ownerId ? (
            <div className="py-12 rounded-xl bg-slate-50 border border-slate-100 text-center">
              <CheckCircle2 className="w-10 h-10 text-success-500 mx-auto mb-2" />
              <p className="text-sm text-slate-700 font-medium">该业主无未缴账单</p>
              <p className="text-xs text-slate-500 mt-1">感谢您的支持！</p>
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-stretch">
            <div className="md:col-span-2 space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">备注说明</label>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  rows={3}
                  placeholder="可填写相关说明，如：业主困难减免、季度优惠等"
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30 resize-none"
                />
              </div>
            </div>
            <div className="md:col-span-3 p-5 rounded-xl bg-gradient-to-br from-success-50 via-white to-primary-50 border border-success-200 shadow-sm">
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between text-slate-600">
                  <span>应收合计（已选账单待缴）</span>
                  <span className="tabular-nums font-medium">{formatCurrency(totals.totalBill)}</span>
                </div>
                {totals.totalDisc > 0 && (
                  <div className="flex items-center justify-between text-danger-600">
                    <span className="flex items-center gap-1.5">
                      <Percent className="w-3.5 h-3.5" /> 减免合计
                    </span>
                    <span className="tabular-nums font-bold">-{formatCurrency(totals.totalDisc)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-primary-700">
                  <span>应缴 = 应收 - 减免</span>
                  <span className="tabular-nums font-semibold">{formatCurrency(shouldPay)}</span>
                </div>
                <div className="h-px bg-slate-200/70 my-2" />
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-xs text-slate-500">实收金额合计（按钮口径）</div>
                    <div className={cn(
                      'text-4xl font-bold font-serif tabular-nums tracking-tight',
                      Math.abs(diff) > 0.01 ? 'text-warning-600' : 'text-success-700'
                    )}>
                      ¥{actualPay.toFixed(2)}
                    </div>
                  </div>
                  <div className="text-right">
                    {Math.abs(diff) > 0.01 && (
                      <div className="text-[11px] text-warning-600 mb-1">
                        {diff > 0 ? '超出应缴' : '少于应缴'} ¥{Math.abs(diff).toFixed(2)}
                      </div>
                    )}
                    <div className="text-[11px] text-slate-500">
                      已选账单：{selectedBillIds.length} 张
                    </div>
                    <div className="text-[11px] text-slate-500">
                      保存后：账单余额、业主欠费同步更新
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Modal>

      {voidTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm animate-fade-in" onClick={() => setVoidTarget(null)}>
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl animate-scale-in" onClick={(e) => e.stopPropagation()}>
            <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-danger-50 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-danger-500" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-900">确认作废收款单？</h3>
                <p className="text-xs text-slate-500">撤回后将恢复账单余额与业主欠费，此操作不可撤销</p>
              </div>
            </div>
            <div className="p-6 space-y-4">
              <div className="rounded-xl bg-danger-50/50 border border-danger-100 p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">收款单号</span>
                  <span className="font-mono font-semibold text-slate-900">{voidTarget.id.slice(-10).toUpperCase()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">业主</span>
                  <span className="font-medium text-slate-900">{voidTarget.ownerName} · {voidTarget.building} {voidTarget.room}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">核销账单</span>
                  <span className="font-medium text-slate-900">{voidTarget.allocations?.length || 0} 张</span>
                </div>
                <div className="flex justify-between text-sm border-t border-danger-100 pt-2 mt-2">
                  <span className="text-slate-500">撤回实收</span>
                  <span className="font-bold text-danger-600 tabular-nums">-{formatCurrency(voidTarget.amount)}</span>
                </div>
                {voidTarget.discount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-500">撤回减免</span>
                    <span className="font-bold text-indigo-600 tabular-nums">-{formatCurrency(voidTarget.discount)}</span>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">作废原因 <span className="text-danger-500">*</span></label>
                <textarea
                  value={voidReason}
                  onChange={(e) => setVoidReason(e.target.value)}
                  placeholder="请录入作废原因，便于后续审计..."
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-danger-300/40 focus:border-danger-400 resize-none"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/40 rounded-b-2xl flex items-center justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setVoidTarget(null); setVoidReason(''); }}>取消</Button>
              <Button
                variant="danger"
                size="sm"
                icon={<Trash2 className="w-4 h-4" />}
                disabled={!voidReason.trim()}
                onClick={() => {
                  voidReceipt(voidTarget.id, voidReason.trim(), currentStaff.id, currentStaff.name);
                  setVoidTarget(null);
                  setVoidReason('');
                }}
              >
                确认作废
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
