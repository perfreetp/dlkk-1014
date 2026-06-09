import { useState, useMemo } from 'react';
import {
  Scale, Download, Building2, Calendar, ChevronDown, ChevronUp, DollarSign,
  Percent, XCircle, TrendingDown, FileText, Filter, X, PiggyBank, ArrowUpRight
} from 'lucide-react';
import { Card, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/store';
import { formatCurrency, formatDateTime } from '@/utils/format';
import { cn, downloadCSV } from '@/utils/helpers';
import type { Receipt, Bill, Notification } from '@/types';

const round2 = (x: number) => Math.round(x * 100) / 100;

interface DailyGroup {
  date: string;
  receipts: Receipt[];
  bills: Bill[];
  notifications: Notification[];
  receiptCount: number;
  receivedAmount: number;
  discountAmount: number;
  voidCount: number;
  voidAmount: number;
  netAmount: number;
}

export const Reconciliation = () => {
  const receipts = useAppStore((s) => s.receipts);
  const bills = useAppStore((s) => s.bills);
  const notifications = useAppStore((s) => s.notifications);
  const owners = useAppStore((s) => s.owners);

  const [dateStart, setDateStart] = useState('2026-01-01');
  const [dateEnd, setDateEnd] = useState('2026-06-30');
  const allBuildings = useMemo(() => Array.from(new Set(owners.map((o) => o.building))).sort(), [owners]);
  const [selectedBuildings, setSelectedBuildings] = useState<string[]>(allBuildings);
  const [expandedDate, setExpandedDate] = useState<string | null>(null);

  const toggleBuilding = (b: string) => {
    setSelectedBuildings((prev) => prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]);
  };

  const resetFilters = () => {
    setDateStart('2026-01-01');
    setDateEnd('2026-06-30');
    setSelectedBuildings(allBuildings);
  };

  const buildingSet = useMemo(() => new Set(selectedBuildings), [selectedBuildings]);

  const inRange = (dateStr: string) => {
    const d = dateStr.slice(0, 10);
    return d >= dateStart && d <= dateEnd;
  };

  const filteredReceipts = useMemo(() => {
    return receipts.filter((r) => buildingSet.has(r.building) && inRange(r.payDate));
  }, [receipts, buildingSet, dateStart, dateEnd]);

  const filteredBills = useMemo(() => {
    return bills.filter((b) => buildingSet.has(b.building) && inRange(b.generateDate));
  }, [bills, buildingSet, dateStart, dateEnd]);

  const kpi = useMemo(() => {
    let receivedTotal = 0;
    let discountTotal = 0;
    let voidTotal = 0;

    for (const r of filteredReceipts) {
      if (r.status !== 'void') {
        receivedTotal += r.amount;
        discountTotal += r.discount || 0;
      } else {
        voidTotal += r.amount + (r.discount || 0);
      }
    }

    const netReceived = receivedTotal + discountTotal - voidTotal;

    const unpaidBalance = owners
      .filter((o) => buildingSet.has(o.building))
      .reduce((s, o) => s + o.unpaidAmount, 0);

    const periodBills = bills.filter((b) => {
      if (!buildingSet.has(b.building)) return false;
      if (b.status === 'void') return false;
      const periodStart = `${b.period}-01`;
      return periodStart >= dateStart && periodStart <= `${dateEnd.slice(0, 7)}-31`;
    });
    const periodReceivable = periodBills.reduce((s, b) => s + b.totalAmount, 0);
    const periodNewUnpaid = periodReceivable - netReceived;

    return {
      receivedTotal: round2(receivedTotal),
      discountTotal: round2(discountTotal),
      voidTotal: round2(voidTotal),
      netReceived: round2(netReceived),
      unpaidBalance: round2(unpaidBalance),
      periodNewUnpaid: round2(periodNewUnpaid),
    };
  }, [filteredReceipts, owners, buildingSet, bills, dateStart, dateEnd]);

  const dailyData = useMemo(() => {
    const map = new Map<string, DailyGroup>();

    for (const r of filteredReceipts) {
      const d = r.payDate.slice(0, 10);
      if (!map.has(d)) {
        map.set(d, {
          date: d,
          receipts: [],
          bills: [],
          notifications: [],
          receiptCount: 0,
          receivedAmount: 0,
          discountAmount: 0,
          voidCount: 0,
          voidAmount: 0,
          netAmount: 0,
        });
      }
      const g = map.get(d)!;
      g.receipts.push(r);
      if (r.status !== 'void') {
        g.receiptCount++;
        g.receivedAmount += r.amount;
        g.discountAmount += r.discount || 0;
      } else {
        g.voidCount++;
        g.voidAmount += r.amount + (r.discount || 0);
      }
    }

    for (const b of filteredBills) {
      const d = b.generateDate.slice(0, 10);
      if (!map.has(d)) {
        map.set(d, {
          date: d,
          receipts: [],
          bills: [],
          notifications: [],
          receiptCount: 0,
          receivedAmount: 0,
          discountAmount: 0,
          voidCount: 0,
          voidAmount: 0,
          netAmount: 0,
        });
      }
      map.get(d)!.bills.push(b);
    }

    for (const n of notifications) {
      if (!n.notifyDate || !inRange(n.notifyDate)) continue;
      if (n.ownerId) {
        const o = owners.find((x) => x.id === n.ownerId);
        if (o && !buildingSet.has(o.building)) continue;
      }
      if (!['bill_adjust', 'bill_void', 'bill_generate', 'receipt_void'].includes(n.eventType || '')) continue;
      const d = n.notifyDate.slice(0, 10);
      if (!map.has(d)) {
        map.set(d, {
          date: d,
          receipts: [],
          bills: [],
          notifications: [],
          receiptCount: 0,
          receivedAmount: 0,
          discountAmount: 0,
          voidCount: 0,
          voidAmount: 0,
          netAmount: 0,
        });
      }
      map.get(d)!.notifications.push(n);
    }

    return Array.from(map.values())
      .map((g) => ({
        ...g,
        receivedAmount: round2(g.receivedAmount),
        discountAmount: round2(g.discountAmount),
        voidAmount: round2(g.voidAmount),
        netAmount: round2(g.receivedAmount + g.discountAmount - g.voidAmount),
        receipts: [...g.receipts].sort((a, b) => b.payDate.localeCompare(a.payDate)),
        bills: [...g.bills].sort((a, b) => b.generateDate.localeCompare(a.generateDate)),
        notifications: [...g.notifications].sort((a, b) => b.notifyDate.localeCompare(a.notifyDate)),
      }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [filteredReceipts, filteredBills, notifications, owners, buildingSet, dateStart, dateEnd]);

  const exportDetail = () => {
    const rows: any[] = [];
    for (const g of dailyData) {
      for (const r of g.receipts) {
        rows.push([
          g.date,
          r.id.slice(-10).toUpperCase(),
          r.ownerName,
          `${r.building} ${r.room}`,
          r.status === 'void' ? '已作废' : '正常',
          r.status !== 'void' ? r.amount.toFixed(2) : '0.00',
          r.status !== 'void' ? (r.discount || 0).toFixed(2) : '0.00',
          r.status === 'void' ? (r.amount + (r.discount || 0)).toFixed(2) : '0.00',
          r.operatorName,
          r.voidReason || '',
          formatDateTime(r.payDate),
        ]);
      }
    }
    downloadCSV(
      ['日期', '收款单号', '业主', '房号', '状态', '实收金额', '减免金额', '作废金额', '操作人', '作废原因', '收款时间'],
      rows,
      `财务对账明细_${dateStart}_${dateEnd}`
    );
  };

  const exportSummary = () => {
    downloadCSV(
      ['日期', '收款笔数', '实收金额', '减免金额', '作钢笔数', '作废金额', '当日净收款'],
      dailyData.map((d) => [
        d.date,
        d.receiptCount,
        d.receivedAmount.toFixed(2),
        d.discountAmount.toFixed(2),
        d.voidCount,
        d.voidAmount.toFixed(2),
        d.netAmount.toFixed(2),
      ]),
      `财务对账汇总_${dateStart}_${dateEnd}`
    );
  };

  const hasActiveFilter = dateStart !== '2026-01-01' || dateEnd !== '2026-06-30' || selectedBuildings.length < allBuildings.length;
  const filterRangeStr = `${dateStart} ~ ${dateEnd}`;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-4">
        <Card className="p-4 hoverable">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-success-50 flex items-center justify-center">
              <DollarSign className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">收款总额</p>
              <p className="mt-1 text-lg font-bold text-success-700 font-serif tabular-nums">
                {formatCurrency(kpi.receivedTotal)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 hoverable">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Percent className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">减免总额</p>
              <p className="mt-1 text-lg font-bold text-indigo-600 font-serif tabular-nums">
                {formatCurrency(kpi.discountTotal)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 hoverable">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-danger-50 flex items-center justify-center">
              <XCircle className="w-5 h-5 text-danger-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">作废总额</p>
              <p className="mt-1 text-lg font-bold text-danger-500 font-serif tabular-nums">
                {formatCurrency(kpi.voidTotal)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 hoverable">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center">
              <Scale className="w-5 h-5 text-primary-700" />
            </div>
            <div>
              <p className="text-xs text-slate-500">净收款</p>
              <p className="mt-1 text-lg font-bold text-slate-900 font-serif tabular-nums">
                {formatCurrency(kpi.netReceived)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 hoverable">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-warning-50 flex items-center justify-center">
              <PiggyBank className="w-5 h-5 text-warning-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">未收余额</p>
              <p className="mt-1 text-lg font-bold text-warning-600 font-serif tabular-nums">
                {formatCurrency(kpi.unpaidBalance)}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 hoverable">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-slate-100 flex items-center justify-center">
              <ArrowUpRight className="w-5 h-5 text-slate-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">期间未收新增</p>
              <p className={cn(
                'mt-1 text-lg font-bold font-serif tabular-nums',
                kpi.periodNewUnpaid > 0 ? 'text-danger-500' : 'text-success-700'
              )}>
                {kpi.periodNewUnpaid >= 0 ? '+' : ''}{formatCurrency(kpi.periodNewUnpaid)}
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="border-b border-slate-200 px-5 flex items-center justify-between">
          <div className="flex items-center gap-2 py-3.5">
            <Scale className="w-4 h-4 text-primary-700" />
            <h3 className="text-sm font-semibold text-slate-900">财务对账明细</h3>
            <span className="text-[11px] text-slate-400">共 {dailyData.length} 天记录</span>
          </div>
          <div className="flex items-center gap-2 py-2">
            {hasActiveFilter && (
              <span className="px-2.5 h-7 rounded-md bg-primary-50 text-primary-700 text-[11px] font-medium border border-primary-100">
                筛选生效中
              </span>
            )}
            <Button size="sm" variant="outline" icon={<Download className="w-4 h-4" />} onClick={exportSummary}>
              导出汇总
            </Button>
            <Button size="sm" icon={<FileText className="w-4 h-4" />} onClick={exportDetail}>
              导出明细
            </Button>
          </div>
        </div>

        <div className="p-4 border-b border-slate-100 bg-slate-50/40 space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-xs font-semibold text-slate-700">统一筛选条件</span>
              <span className="text-[10px] text-slate-400">（{filterRangeStr} · {selectedBuildings.length}/{allBuildings.length} 栋）</span>
            </div>
            <div className="flex-1" />
            <button
              type="button"
              onClick={resetFilters}
              className="h-8 px-3 rounded-lg text-xs text-slate-500 hover:text-danger-500 hover:bg-danger-50 flex items-center gap-1 transition-all"
            >
              <X className="w-3.5 h-3.5" /> 重置全部
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">日期范围：</span>
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={dateStart}
                  onChange={(e) => setDateStart(e.target.value)}
                  min="2026-01-01"
                  max="2026-06-30"
                  className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400/30"
                />
                <span className="text-slate-400 text-sm">至</span>
                <input
                  type="date"
                  value={dateEnd}
                  onChange={(e) => setDateEnd(e.target.value)}
                  min="2026-01-01"
                  max="2026-06-30"
                  className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400/30"
                />
              </div>
            </div>
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <Building2 className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">楼栋：</span>
              {allBuildings.map((b) => (
                <button
                  key={b}
                  type="button"
                  onClick={() => toggleBuilding(b)}
                  className={cn(
                    'px-2 h-7 rounded-md text-[11px] font-medium border transition-all',
                    selectedBuildings.includes(b)
                      ? 'bg-primary-800 text-white border-primary-800 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-primary-300'
                  )}
                >
                  {b}
                </button>
              ))}
            </div>
          </div>
        </div>

        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-left text-xs font-semibold text-slate-600 uppercase">
                  <th className="px-4 py-3 w-10"></th>
                  <th className="px-5 py-3">日期</th>
                  <th className="px-5 py-3 text-right">收款笔数</th>
                  <th className="px-5 py-3 text-right">实收金额</th>
                  <th className="px-5 py-3 text-right">减免金额</th>
                  <th className="px-5 py-3 text-right">作钢笔数</th>
                  <th className="px-5 py-3 text-right">作废金额</th>
                  <th className="px-5 py-3 text-right">当日净收款</th>
                </tr>
              </thead>
              <tbody>
                {dailyData.map((g, i) => {
                  const expanded = expandedDate === g.date;
                  const hasDetail = g.receipts.length > 0 || g.bills.length > 0 || g.notifications.length > 0;
                  return (
                    <>
                    <tr
                      key={g.date}
                      className={cn(
                        'border-b border-slate-50 transition-colors animate-fade-in-stagger',
                        expanded ? 'bg-primary-50/40' : 'hover:bg-primary-50/40'
                      )}
                      style={{ animationDelay: `${i * 20}ms` }}
                    >
                      <td className="px-4 py-3.5">
                        {hasDetail && (
                          <button
                            type="button"
                            onClick={() => setExpandedDate(expanded ? null : g.date)}
                            className={cn(
                              'w-7 h-7 rounded-md flex items-center justify-center transition-all',
                              expanded ? 'bg-primary-100 text-primary-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                            )}
                          >
                            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                          </button>
                        )}
                      </td>
                      <td className="px-5 py-3.5 font-medium text-slate-900">{g.date}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums">{g.receiptCount}</td>
                      <td className="px-5 py-3.5 text-right text-success-700 font-semibold tabular-nums">{formatCurrency(g.receivedAmount)}</td>
                      <td className="px-5 py-3.5 text-right text-indigo-600 font-medium tabular-nums">{formatCurrency(g.discountAmount)}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums">
                        <span className={cn(g.voidCount > 0 && 'text-danger-500 font-medium')}>{g.voidCount}</span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        {g.voidAmount > 0
                          ? <span className="text-danger-500 font-semibold tabular-nums">{formatCurrency(g.voidAmount)}</span>
                          : <span className="text-slate-300">—</span>
                        }
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <span className={cn(
                          'font-bold tabular-nums',
                          g.netAmount > 0 ? 'text-slate-900' : 'text-danger-500'
                        )}>
                          {formatCurrency(g.netAmount)}
                        </span>
                      </td>
                    </tr>
                    {expanded && hasDetail && (
                      <tr key={`${g.date}-detail`} className="bg-slate-50/60 border-b border-slate-100">
                        <td colSpan={8} className="px-6 py-5 space-y-5">
                          {g.receipts.length > 0 && (
                            <div className="rounded-xl border border-primary-100 bg-white overflow-hidden">
                              <div className="px-4 py-2.5 bg-primary-50/70 border-b border-primary-100 flex items-center gap-2">
                                <DollarSign className="w-4 h-4 text-primary-600" />
                                <p className="text-xs font-semibold text-primary-800">当日收款明细（共 {g.receipts.length} 笔）</p>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                      <th className="px-4 py-2.5 text-left">单号</th>
                                      <th className="px-4 py-2.5 text-left">业主</th>
                                      <th className="px-4 py-2.5 text-left">房号</th>
                                      <th className="px-4 py-2.5 text-left">状态</th>
                                      <th className="px-4 py-2.5 text-right">实收</th>
                                      <th className="px-4 py-2.5 text-right">减免</th>
                                      <th className="px-4 py-2.5 text-left">操作人</th>
                                      <th className="px-4 py-2.5 text-left">作废原因</th>
                                      <th className="px-4 py-2.5 text-left">时间</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {g.receipts.map((r) => (
                                      <tr key={r.id} className="border-t border-slate-50 even:bg-slate-50/30">
                                        <td className="px-4 py-2.5 font-mono text-[11px] text-primary-700 font-semibold">{r.id.slice(-10).toUpperCase()}</td>
                                        <td className="px-4 py-2.5 font-medium text-slate-800">{r.ownerName}</td>
                                        <td className="px-4 py-2.5 text-slate-500">{r.building} {r.room}</td>
                                        <td className="px-4 py-2.5">
                                          {r.status === 'void' ? (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-danger-50 text-danger-600 text-[10px] font-medium border border-danger-100">已作废</span>
                                          ) : (
                                            <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-success-50 text-success-700 text-[10px] font-medium border border-success-100">正常</span>
                                          )}
                                        </td>
                                        <td className={cn(
                                          'px-4 py-2.5 text-right tabular-nums font-semibold',
                                          r.status !== 'void' ? 'text-success-700' : 'text-slate-300'
                                        )}>
                                          {r.status !== 'void' ? formatCurrency(r.amount) : '—'}
                                        </td>
                                        <td className={cn(
                                          'px-4 py-2.5 text-right tabular-nums font-medium',
                                          r.status !== 'void' && r.discount > 0 ? 'text-indigo-600' : 'text-slate-300'
                                        )}>
                                          {r.status !== 'void' && r.discount > 0 ? formatCurrency(r.discount) : '—'}
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-600">{r.operatorName}</td>
                                        <td className="px-4 py-2.5 text-[11px] text-danger-500 max-w-[180px] truncate">
                                          {r.voidReason || <span className="text-slate-300">—</span>}
                                        </td>
                                        <td className="px-4 py-2.5 text-[11px] text-slate-400 font-mono">{r.payDate.slice(5, 16)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}

                          {(g.bills.length > 0 || g.notifications.length > 0) && (
                            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                              <div className="px-4 py-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-600" />
                                <p className="text-xs font-semibold text-slate-700">当日账单变动（生成 / 调整 / 作废）</p>
                              </div>
                              <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                                      <th className="px-4 py-2.5 text-left">账单号</th>
                                      <th className="px-4 py-2.5 text-left">业主</th>
                                      <th className="px-4 py-2.5 text-left">变动类型</th>
                                      <th className="px-4 py-2.5 text-right">变动前</th>
                                      <th className="px-4 py-2.5 text-right">变动后</th>
                                      <th className="px-4 py-2.5 text-left">操作人</th>
                                      <th className="px-4 py-2.5 text-left">时间</th>
                                    </tr>
                                  </thead>
                                  <tbody>
                                    {g.notifications.map((n) => {
                                      const eventLabel = n.eventType === 'bill_generate' ? '生成账单'
                                        : n.eventType === 'bill_adjust' ? '调整账单'
                                        : n.eventType === 'bill_void' ? '作废账单'
                                        : n.eventType === 'receipt_void' ? '撤回收款'
                                        : n.eventType || '其他';
                                      const eventColor = n.eventType === 'bill_generate' ? 'bg-primary-50 text-primary-700 border-primary-100'
                                        : n.eventType === 'bill_adjust' ? 'bg-warning-50 text-warning-700 border-warning-100'
                                        : n.eventType === 'bill_void' || n.eventType === 'receipt_void' ? 'bg-danger-50 text-danger-600 border-danger-100'
                                        : 'bg-slate-50 text-slate-600 border-slate-200';
                                      return (
                                        <tr key={n.id} className="border-t border-slate-50 even:bg-slate-50/30">
                                          <td className="px-4 py-2.5 font-mono text-[11px] text-slate-700">
                                            {n.billId ? n.billId.slice(-10).toUpperCase() : n.receiptId ? n.receiptId.slice(-10).toUpperCase() + ' (单)' : '—'}
                                          </td>
                                          <td className="px-4 py-2.5 font-medium text-slate-800">{n.ownerName}</td>
                                          <td className="px-4 py-2.5">
                                            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-medium border', eventColor)}>
                                              {eventLabel}
                                            </span>
                                          </td>
                                          <td className="px-4 py-2.5 text-right text-slate-500 tabular-nums">{n.oldValue || '—'}</td>
                                          <td className="px-4 py-2.5 text-right text-slate-700 font-medium tabular-nums">{n.newValue || '—'}</td>
                                          <td className="px-4 py-2.5 text-slate-600">{n.operatorName}</td>
                                          <td className="px-4 py-2.5 text-[11px] text-slate-400 font-mono">{n.notifyDate.slice(5, 16)}</td>
                                        </tr>
                                      );
                                    })}
                                    {g.bills.filter((b) => !g.notifications.some((n) => n.billId === b.id)).map((b) => (
                                      <tr key={b.id} className="border-t border-slate-50 even:bg-slate-50/30">
                                        <td className="px-4 py-2.5 font-mono text-[11px] text-slate-700">{b.id.slice(-10).toUpperCase()}</td>
                                        <td className="px-4 py-2.5 font-medium text-slate-800">{b.ownerName}</td>
                                        <td className="px-4 py-2.5">
                                          <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-primary-50 text-primary-700 text-[10px] font-medium border border-primary-100">
                                            生成账单
                                          </span>
                                        </td>
                                        <td className="px-4 py-2.5 text-right text-slate-300">—</td>
                                        <td className="px-4 py-2.5 text-right text-slate-700 font-medium tabular-nums">{formatCurrency(b.totalAmount)}</td>
                                        <td className="px-4 py-2.5 text-slate-400">系统</td>
                                        <td className="px-4 py-2.5 text-[11px] text-slate-400 font-mono">{b.generateDate.slice(5, 16)}</td>
                                      </tr>
                                    ))}
                                    {g.notifications.length === 0 && g.bills.length === 0 && (
                                      <tr>
                                        <td colSpan={7} className="px-4 py-8 text-center text-slate-400">当日无账单变动</td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                    </>
                  );
                })}
                {dailyData.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center text-slate-400">
                      <Scale className="w-10 h-10 mx-auto mb-2 opacity-30" />
                      <p>所选日期范围内暂无对账数据</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
