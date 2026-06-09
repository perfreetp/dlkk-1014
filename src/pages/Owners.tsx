import { useState, useMemo, Fragment } from 'react';
import { Search, Filter, X, ChevronDown, ChevronUp, Eye, Phone, FileText, Receipt, MessageSquare, Clock, CalendarDays, AlertCircle, CheckCircle2, TrendingUp, Users, User, PieChart, ChevronRight } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Drawer } from '@/components/ui/Drawer';
import { OwnerStatusBadge, BillStatusBadge, TaskStatusBadge } from '@/components/ui/StatusBadge';
import { useAppStore, useFilteredOwners } from '@/store';
import { formatCurrency, formatNumber, formatDate, maskPhone } from '@/utils/format';
import { cn } from '@/utils/helpers';
import { useNavigate } from 'react-router-dom';

const buildings = ['全部', '1号楼', '2号楼', '3号楼', '4号楼', '5号楼', '6号楼', '7号楼', '8号楼'];
const statusOptions = [
  { value: '', label: '全部状态' },
  { value: 'normal', label: '正常' },
  { value: 'arrears', label: '欠费' },
  { value: 'serious', label: '严重欠费' },
];
const monthRanges = [
  { value: '', label: '全部' },
  { value: 1, label: '1个月以上' },
  { value: 3, label: '3个月以上' },
  { value: 6, label: '6个月以上' },
];

export const Owners = () => {
  const navigate = useNavigate();
  const owners = useFilteredOwners();
  const bills = useAppStore((s) => s.bills);
  const tasks = useAppStore((s) => s.tasks);
  const notifications = useAppStore((s) => s.notifications);
  const receipts = useAppStore((s) => s.receipts);
  const { ownerFilters, setOwnerFilters, resetOwnerFilters, setSelectedOwnerId, selectedOwnerId } = useAppStore();

  const [showFilters, setShowFilters] = useState(false);
  const [searchInput, setSearchInput] = useState(ownerFilters.keyword || '');
  const [ownerTab, setOwnerTab] = useState<'profile' | 'finance'>('profile');
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);

  const selectedOwner = useMemo(
    () => owners.find((o) => o.id === selectedOwnerId) || null,
    [owners, selectedOwnerId]
  );

  const ownerBills = useMemo(
    () => (selectedOwner ? bills.filter((b) => b.ownerId === selectedOwner.id) : []),
    [bills, selectedOwner]
  );

  const ownerTasks = useMemo(
    () => (selectedOwner ? tasks.filter((t) => t.ownerId === selectedOwner.id) : []),
    [tasks, selectedOwner]
  );

  const ownerNotifs = useMemo(
    () => (selectedOwner ? notifications.filter((n) => n.ownerId === selectedOwner.id) : []),
    [notifications, selectedOwner]
  );

  const ownerReceipts = useMemo(
    () => (selectedOwner ? receipts.filter((r) => r.ownerId === selectedOwner.id) : []),
    [receipts, selectedOwner]
  );

  const stats = useMemo(() => {
    const unpaid = owners.filter((o) => o.status !== 'normal');
    return {
      total: owners.length,
      unpaidCount: unpaid.length,
      totalUnpaid: unpaid.reduce((s, o) => s + o.unpaidAmount, 0),
      serious: owners.filter((o) => o.status === 'serious').length,
    };
  }, [owners]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4">
          <p className="text-xs text-slate-500">业主总数</p>
          <p className="mt-1 text-2xl font-bold text-slate-900 font-serif">{formatNumber(stats.total)}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">欠费户数</p>
          <p className="mt-1 text-2xl font-bold text-warning-600 font-serif">{stats.unpaidCount}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">严重欠费</p>
          <p className="mt-1 text-2xl font-bold text-danger-500 font-serif">{stats.serious}</p>
        </Card>
        <Card className="p-4">
          <p className="text-xs text-slate-500">欠费总额</p>
          <p className="mt-1 text-2xl font-bold text-primary-700 font-serif">{formatCurrency(stats.totalUnpaid)}</p>
        </Card>
      </div>

      <Card>
        <CardHeader
          title={
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setOwnerFilters({ keyword: e.target.value || undefined });
                  }}
                  placeholder="搜索业主姓名 / 房号 / 电话"
                  className="w-72 h-10 pl-9 pr-9 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30 focus:border-primary-400"
                />
                {searchInput && (
                  <button
                    onClick={() => {
                      setSearchInput('');
                      setOwnerFilters({ keyword: undefined });
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
              <Button
                variant={showFilters ? 'primary' : 'outline'}
                size="sm"
                icon={<Filter className="w-4 h-4" />}
                onClick={() => setShowFilters((v) => !v)}
              >
                高级筛选 <ChevronDown className={cn('w-3.5 h-3.5 ml-1 transition-transform', showFilters && 'rotate-180')} />
              </Button>
              {Object.keys(ownerFilters).length > 0 && (
                <button
                  onClick={resetOwnerFilters}
                  className="text-xs text-slate-500 hover:text-danger-500 flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  清除筛选
                </button>
              )}
            </div>
          }
          subtitle={`共 ${formatNumber(owners.length)} 条结果`}
          action={
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline">导出列表</Button>
            </div>
          }
        />

        {showFilters && (
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 grid grid-cols-1 md:grid-cols-3 gap-4 animate-fade-in">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">所在楼栋</label>
              <select
                value={ownerFilters.building || ''}
                onChange={(e) => setOwnerFilters({ building: e.target.value || undefined })}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400/30"
              >
                {buildings.map((b) => (
                  <option key={b} value={b === '全部' ? '' : b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">欠费状态</label>
              <select
                value={ownerFilters.status || ''}
                onChange={(e) => setOwnerFilters({ status: (e.target.value as any) || undefined })}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400/30"
              >
                {statusOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">欠费月数</label>
              <select
                value={ownerFilters.minUnpaidMonths != null ? ownerFilters.minUnpaidMonths : ''}
                onChange={(e) =>
                  setOwnerFilters({
                    minUnpaidMonths: e.target.value ? Number(e.target.value) : undefined,
                  })
                }
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400/30"
              >
                {monthRanges.map((o) => (
                  <option key={o.label} value={o.value as any}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>
        )}

        <CardBody className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="px-5 py-3">业主信息</th>
                  <th className="px-5 py-3">楼栋房号</th>
                  <th className="px-5 py-3">联系电话</th>
                  <th className="px-5 py-3 text-right">面积(㎡)</th>
                  <th className="px-5 py-3 text-right">欠费月数</th>
                  <th className="px-5 py-3 text-right">欠费金额</th>
                  <th className="px-5 py-3">状态</th>
                  <th className="px-5 py-3 text-right">操作</th>
                </tr>
              </thead>
              <tbody>
                {owners.map((o, i) => (
                  <tr
                    key={o.id}
                    className="border-b border-slate-50 hover:bg-primary-50/40 transition-colors cursor-pointer animate-fade-in-stagger"
                    style={{ animationDelay: `${i * 20}ms` }}
                    onClick={() => setSelectedOwnerId(o.id)}
                  >
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary-100 to-primary-200 flex items-center justify-center text-xs font-bold text-primary-800 shrink-0">
                          {o.name[0]}
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-900 truncate">{o.name}</p>
                          <p className="text-xs text-slate-500">{o.ownerType} · 入住{formatDate(o.moveInDate, 'yyyy-MM')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-slate-700">{o.building}</span>
                      <span className="text-slate-400 mx-1">-</span>
                      <span className="text-slate-600">{o.room}</span>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">
                      <Phone className="w-3.5 h-3.5 inline -mt-0.5 mr-1 text-slate-400" />
                      {maskPhone(o.phone)}
                    </td>
                    <td className="px-5 py-3.5 text-right text-slate-700 tabular-nums">{o.area.toFixed(1)}</td>
                    <td className={cn(
                      'px-5 py-3.5 text-right tabular-nums font-medium',
                      o.unpaidMonths >= 6 ? 'text-danger-500' : o.unpaidMonths > 0 ? 'text-warning-600' : 'text-slate-700'
                    )}>
                      {o.unpaidMonths > 0 ? `${o.unpaidMonths}个月` : '-'}
                    </td>
                    <td className={cn(
                      'px-5 py-3.5 text-right tabular-nums font-bold',
                      o.unpaidAmount > 5000 ? 'text-danger-500' : o.unpaidAmount > 0 ? 'text-warning-600' : 'text-slate-700'
                    )}>
                      {o.unpaidAmount > 0 ? formatCurrency(o.unpaidAmount) : '-'}
                    </td>
                    <td className="px-5 py-3.5"><OwnerStatusBadge status={o.status} /></td>
                    <td className="px-5 py-3.5 text-right">
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={<Eye className="w-4 h-4" />}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedOwnerId(o.id);
                        }}
                      >
                        详情
                      </Button>
                    </td>
                  </tr>
                ))}
                {owners.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-5 py-16 text-center text-slate-400">
                      没有找到符合条件的业主
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      <Drawer
        open={!!selectedOwner}
        title={selectedOwner?.name || ''}
        subtitle={selectedOwner ? `${selectedOwner.building} ${selectedOwner.room}` : ''}
        width="w-[480px]"
        onClose={() => setSelectedOwnerId(null)}
        footer={
          selectedOwner && (
            <div className="flex gap-2 w-full">
              <Button variant="outline" className="flex-1" onClick={() => { setSelectedOwnerId(null); navigate('/bills'); }}>
                查看账单
              </Button>
              <Button className="flex-1" onClick={() => { setSelectedOwnerId(null); navigate('/receipts'); }}>
                登记收款
              </Button>
            </div>
          )
        }
      >
        {selectedOwner && (
          <div className="space-y-5">
            <div className="px-6 py-4 bg-gradient-to-br from-primary-50 to-white border-b border-slate-100">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center text-xl font-bold text-white shadow-lg">
                  {selectedOwner.name[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-lg font-bold text-slate-900">{selectedOwner.name}</h3>
                  <p className="text-sm text-slate-500 mt-0.5">{selectedOwner.ownerType} · {selectedOwner.area}㎡</p>
                  <OwnerStatusBadge status={selectedOwner.status} />
                </div>
              </div>
            </div>

            <div className="border-b border-slate-200 px-6 flex items-center gap-1">
              {([
                { key: 'profile' as const, label: '档案与时间线', icon: User },
                { key: 'finance' as const, label: '账务汇总', icon: PieChart },
              ]).map((t) => {
                const Icon = t.icon;
                const active = ownerTab === t.key;
                return (
                  <button
                    key={t.key}
                    onClick={() => { setOwnerTab(t.key); setExpandedMonth(null); }}
                    className={cn(
                      'flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 -mb-px transition-colors',
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

            {ownerTab === 'profile' && (
              <>
                <div className="px-6 space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <p className="text-xs text-slate-500">联系电话</p>
                      <p className="text-sm font-medium text-slate-900 mt-0.5">{selectedOwner.phone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">入住日期</p>
                      <p className="text-sm font-medium text-slate-900 mt-0.5">{formatDate(selectedOwner.moveInDate)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">欠费月数</p>
                      <p className={cn(
                        'text-sm font-bold mt-0.5',
                        selectedOwner.unpaidMonths >= 6 ? 'text-danger-500' : 'text-warning-600'
                      )}>
                        {selectedOwner.unpaidMonths} 个月
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-slate-500">欠费总额</p>
                      <p className="text-sm font-bold text-danger-500 mt-0.5">{formatCurrency(selectedOwner.unpaidAmount)}</p>
                    </div>
                  </div>
                </div>

                <div className="px-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-900">历史账单 ({ownerBills.length})</h4>
                  </div>
                  <div className="space-y-2">
                    {ownerBills.slice(0, 5).map((b) => (
                      <div key={b.id} className="flex items-center justify-between p-3 rounded-lg border border-slate-100 hover:border-primary-200 hover:bg-primary-50/30 transition-colors">
                        <div>
                          <p className="text-sm font-medium text-slate-900">{b.period} 账期</p>
                          <p className="text-[11px] text-slate-500 mt-0.5">物业费+水电等</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold text-slate-900 tabular-nums">{formatCurrency(b.totalAmount)}</p>
                          <div className="mt-0.5"><BillStatusBadge status={b.status} /></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="px-6 pb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-primary-600" />
                      完整跟进时间线
                    </h4>
                    <span className="text-[11px] text-slate-500">共 {ownerBills.length + ownerNotifs.length + ownerReceipts.length} 条记录</span>
                  </div>
                  <OwnerTimeline bills={ownerBills} receipts={ownerReceipts} notifications={ownerNotifs} tasks={ownerTasks} />
                </div>
              </>
            )}

            {ownerTab === 'finance' && (
              <OwnerFinanceSummary
                ownerBills={ownerBills}
                ownerReceipts={ownerReceipts}
                unpaidAmount={selectedOwner.unpaidAmount}
                expandedMonth={expandedMonth}
                setExpandedMonth={setExpandedMonth}
              />
            )}
          </div>
        )}
      </Drawer>
    </div>
  );
};

const OwnerFinanceSummary = ({
  ownerBills, ownerReceipts, unpaidAmount, expandedMonth, setExpandedMonth,
}: {
  ownerBills: import('@/types').Bill[];
  ownerReceipts: import('@/types').Receipt[];
  unpaidAmount: number;
  expandedMonth: string | null;
  setExpandedMonth: (m: string | null) => void;
}) => {
  const kpi = useMemo(() => {
    const billed = ownerBills.filter(b => b.status !== 'void').reduce((s, b) => s + b.totalAmount, 0);
    const received = ownerReceipts.filter(r => r.status !== 'void').reduce((s, r) => s + r.amount, 0);
    const discount = ownerReceipts.filter(r => r.status !== 'void').reduce((s, r) => s + (r.discount || 0), 0);
    return { billed, received, discount, unpaid: unpaidAmount };
  }, [ownerBills, ownerReceipts, unpaidAmount]);

  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, {
      billed: number; received: number; discount: number;
      bills: import('@/types').Bill[]; receipts: import('@/types').Receipt[];
    }>();

    for (const b of ownerBills) {
      if (!monthMap.has(b.period)) {
        monthMap.set(b.period, { billed: 0, received: 0, discount: 0, bills: [], receipts: [] });
      }
      const m = monthMap.get(b.period)!;
      m.bills.push(b);
      if (b.status !== 'void') {
        m.billed += b.totalAmount;
      } else {
        m.billed -= b.totalAmount;
      }
    }

    for (const r of ownerReceipts) {
      const payMonth = r.payDate.slice(0, 7);
      if (!monthMap.has(payMonth)) {
        monthMap.set(payMonth, { billed: 0, received: 0, discount: 0, bills: [], receipts: [] });
      }
      const m = monthMap.get(payMonth)!;
      m.receipts.push(r);
      if (r.status !== 'void') {
        m.received += r.amount;
        m.discount += r.discount || 0;
      }
    }

    const sortedMonths = Array.from(monthMap.keys()).sort();
    let rollingUnpaid = 0;
    return sortedMonths.map((period) => {
      const d = monthMap.get(period)!;
      const monthStart = rollingUnpaid;
      const monthBilled = d.billed;
      const monthReceived = d.received;
      const monthDiscount = d.discount;
      const monthWriteOff = monthReceived + monthDiscount;
      const monthEnd = Math.round((monthStart + monthBilled - monthWriteOff) * 100) / 100;
      rollingUnpaid = monthEnd;
      return {
        period,
        billed: monthBilled,
        received: monthReceived,
        discount: monthDiscount,
        writeOff: monthWriteOff,
        startUnpaid: monthStart,
        endUnpaid: monthEnd,
        bills: d.bills,
        receipts: d.receipts,
      };
    });
  }, [ownerBills, ownerReceipts]);

  const rollingTotal = useMemo(() => {
    const totalBilled = monthlyData.reduce((s, m) => s + m.billed, 0);
    const totalWriteOff = monthlyData.reduce((s, m) => s + m.writeOff, 0);
    const finalUnpaid = monthlyData.length > 0 ? monthlyData[monthlyData.length - 1].endUnpaid : 0;
    return { totalBilled, totalWriteOff, finalUnpaid };
  }, [monthlyData]);

  return (
    <div className="space-y-5 pb-6">
      <div className="px-6 space-y-3">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="p-3 rounded-xl border border-slate-100 bg-gradient-to-br from-white to-slate-50">
            <p className="text-[11px] text-slate-500">累计应收</p>
            <p className="mt-1 text-lg font-bold text-slate-900 font-serif tabular-nums">{formatCurrency(kpi.billed)}</p>
          </div>
          <div className="p-3 rounded-xl border border-slate-100 bg-gradient-to-br from-white to-success-50/40">
            <p className="text-[11px] text-slate-500">累计实收</p>
            <p className="mt-1 text-lg font-bold text-success-700 font-serif tabular-nums">{formatCurrency(kpi.received)}</p>
          </div>
          <div className="p-3 rounded-xl border border-slate-100 bg-gradient-to-br from-white to-indigo-50/40">
            <p className="text-[11px] text-slate-500">累计减免</p>
            <p className="mt-1 text-lg font-bold text-indigo-600 font-serif tabular-nums">{formatCurrency(kpi.discount)}</p>
          </div>
          <div className="p-3 rounded-xl border border-slate-100 bg-gradient-to-br from-white to-warning-50/40">
            <p className="text-[11px] text-slate-500">当前欠费</p>
            <p className="mt-1 text-lg font-bold text-warning-600 font-serif tabular-nums">{formatCurrency(kpi.unpaid)}</p>
          </div>
        </div>
        <p className="text-[11px] text-slate-500 flex items-center gap-1.5">
          <span className="inline-block w-1 h-1 rounded-full bg-primary-400" />
          以下按月滚存计算：<span className="font-mono">期末欠费 = 期初 + 本月应收 − 本月核销</span>
        </p>
      </div>

      <div className="px-6">
        <div className="flex items-center justify-between mb-2">
          <h4 className="text-sm font-semibold text-slate-900 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-primary-600" />
            月度账务明细（滚存）
          </h4>
          <span className="text-[11px] text-slate-500">共 {monthlyData.length} 个月</span>
        </div>

        <div className="rounded-xl border border-slate-100 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-100 text-left text-xs font-semibold text-slate-600 uppercase tracking-wider">
                  <th className="px-3 py-2.5">月份</th>
                  <th className="px-3 py-2.5 text-right">期初欠费</th>
                  <th className="px-3 py-2.5 text-right">本月应收</th>
                  <th className="px-3 py-2.5 text-right">本月核销</th>
                  <th className="px-3 py-2.5 text-right">期末欠费</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((m) => {
                  const expanded = expandedMonth === m.period;
                  return (
                    <Fragment key={m.period}>
                      <tr
                        className={cn(
                          'border-b border-slate-50 transition-colors cursor-pointer',
                          expanded ? 'bg-primary-50/50' : 'hover:bg-primary-50/40'
                        )}
                        onClick={() => setExpandedMonth(expanded ? null : m.period)}
                      >
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-1">
                            {expanded
                              ? <ChevronDown className="w-3.5 h-3.5 text-primary-600" />
                              : <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            }
                            <span className="font-medium text-slate-900">{m.period}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-right text-slate-900 font-medium tabular-nums">{formatCurrency(m.startUnpaid)}</td>
                        <td className="px-3 py-2.5 text-right text-primary-700 font-medium tabular-nums">{formatCurrency(m.billed)}</td>
                        <td className="px-3 py-2.5 text-right text-success-700 font-medium tabular-nums">
                          {m.writeOff > 0 ? `-${formatCurrency(m.writeOff)}` : formatCurrency(0)}
                        </td>
                        <td className="px-3 py-2.5 text-right">
                          {m.endUnpaid > 0
                            ? <span className="text-warning-600 font-bold tabular-nums">{formatCurrency(m.endUnpaid)}</span>
                            : <span className="text-success-600 font-bold tabular-nums">{formatCurrency(m.endUnpaid)}</span>
                          }
                        </td>
                      </tr>
                      {expanded && (
                        <tr className="bg-slate-50/30">
                          <td colSpan={5} className="px-3 py-3">
                            <div className="space-y-3 animate-fade-in">
                              <div className="rounded-xl border border-slate-200 overflow-hidden">
                                <div className="px-3 py-2 bg-gradient-to-r from-slate-50 to-white border-b border-slate-100 flex items-center gap-1.5">
                                  <span className="text-[11px] font-semibold text-slate-800">📊 本月滚存说明</span>
                                </div>
                                <div className="grid grid-cols-2 gap-px bg-slate-100">
                                  <div className="bg-white p-3">
                                    <p className="text-[10px] text-slate-500">期初欠费</p>
                                    <p className="mt-1 text-base font-bold text-slate-900 font-serif tabular-nums">{formatCurrency(m.startUnpaid)}</p>
                                  </div>
                                  <div className="bg-white p-3">
                                    <p className="text-[10px] text-slate-500">本月应收</p>
                                    <p className="mt-1 text-base font-bold text-primary-700 font-serif tabular-nums">+{formatCurrency(m.billed)}</p>
                                  </div>
                                  <div className="bg-white p-3">
                                    <p className="text-[10px] text-slate-500">本月核销</p>
                                    <div className="mt-1">
                                      <p className="text-base font-bold text-success-700 font-serif tabular-nums">-{formatCurrency(m.writeOff)}</p>
                                      <p className="text-[10px] text-slate-500 mt-0.5 tabular-nums">
                                        实收 {formatCurrency(m.received)} + 减免 {formatCurrency(m.discount)}
                                      </p>
                                    </div>
                                  </div>
                                  <div className={cn(
                                    'p-3',
                                    m.endUnpaid > 0 ? 'bg-warning-50/50' : 'bg-success-50/50'
                                  )}>
                                    <p className="text-[10px] text-slate-500">期末欠费</p>
                                    <div className="mt-1">
                                      <p className={cn(
                                        'text-base font-bold font-serif tabular-nums',
                                        m.endUnpaid > 0 ? 'text-warning-600' : 'text-success-600'
                                      )}>
                                        {formatCurrency(m.endUnpaid)}
                                      </p>
                                      <p className="text-[10px] text-slate-500 mt-0.5 tabular-nums font-mono">
                                        = {formatCurrency(m.startUnpaid)} + {formatCurrency(m.billed)} − {formatCurrency(m.writeOff)}
                                      </p>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                                <div className="px-3 py-2 bg-slate-50/70 border-b border-slate-100 flex items-center gap-1.5">
                                  <FileText className="w-3.5 h-3.5 text-primary-600" />
                                  <p className="text-[11px] font-semibold text-primary-800">📋 相关账单（{m.bills.length} 张）</p>
                                </div>
                                <div className="p-2 space-y-1.5 max-h-48 overflow-y-auto">
                                  {m.bills.length === 0 ? (
                                    <p className="px-2 py-3 text-center text-[11px] text-slate-400">本月无账单</p>
                                  ) : m.bills.map((b) => (
                                    <div key={b.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-primary-50/30 transition-colors">
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-xs font-medium text-slate-800">{b.period} 账期</span>
                                          <BillStatusBadge status={b.status} />
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-0.5">生成日期：{b.generateDate}</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-xs font-bold text-slate-900 tabular-nums">{formatCurrency(b.totalAmount)}</p>
                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                          已缴 <span className="text-success-600 tabular-nums">{formatCurrency(b.paidAmount)}</span>
                                          {b.status !== 'void' && b.totalAmount - b.paidAmount > 0 && (
                                            <> / 待缴 <span className="text-danger-500 font-medium tabular-nums">{formatCurrency(Math.max(0, b.totalAmount - b.paidAmount))}</span></>
                                          )}
                                        </p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>

                              <div className="rounded-xl border border-slate-200 bg-white overflow-hidden">
                                <div className="px-3 py-2 bg-success-50/70 border-b border-success-100 flex items-center gap-1.5">
                                  <Receipt className="w-3.5 h-3.5 text-success-600" />
                                  <p className="text-[11px] font-semibold text-success-800">💰 相关收款（{m.receipts.length} 笔）</p>
                                </div>
                                <div className="p-2 space-y-1.5 max-h-48 overflow-y-auto">
                                  {m.receipts.length === 0 ? (
                                    <p className="px-2 py-3 text-center text-[11px] text-slate-400">本月无收款记录</p>
                                  ) : m.receipts.map((r) => (
                                    <div key={r.id} className={cn(
                                      'flex items-center justify-between p-2 rounded-lg transition-colors',
                                      r.status === 'void' ? 'bg-slate-50 opacity-60' : 'hover:bg-success-50/40'
                                    )}>
                                      <div>
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-xs font-semibold text-success-800">收款 #{r.id.slice(-6).toUpperCase()}</span>
                                          {r.status === 'void' && (
                                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-600 font-medium">已作废</span>
                                          )}
                                        </div>
                                        <p className="text-[10px] text-slate-500 mt-0.5">
                                          {r.payDate.slice(5, 16)} · {r.operatorName} · {r.method}
                                          {r.status === 'void' && r.voidReason && <span className="ml-1 text-danger-500">原因：{r.voidReason}</span>}
                                        </p>
                                      </div>
                                      <div className="text-right">
                                        {r.status !== 'void' ? (
                                          <>
                                            <p className="text-xs font-bold text-success-700 tabular-nums">+{formatCurrency(r.amount)}</p>
                                            {r.discount > 0 && (
                                              <p className="text-[10px] text-indigo-600 mt-0.5 tabular-nums">减免 {formatCurrency(r.discount)}</p>
                                            )}
                                          </>
                                        ) : (
                                          <>
                                            <p className="text-xs font-medium text-slate-400 line-through tabular-nums">{formatCurrency(r.amount)}</p>
                                            {r.discount > 0 && (
                                              <p className="text-[10px] text-slate-400 mt-0.5 line-through tabular-nums">减免 {formatCurrency(r.discount)}</p>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
                {monthlyData.length === 0 && (
                  <tr>
                    <td colSpan={5} className="px-3 py-10 text-center text-slate-400 text-xs">
                      暂无账务数据
                    </td>
                  </tr>
                )}
                {monthlyData.length > 0 && (
                  <tr className="bg-slate-50/80 border-t-2 border-slate-200">
                    <td className="px-3 py-2.5 text-xs font-semibold text-slate-700">滚存合计</td>
                    <td className="px-3 py-2.5 text-right text-xs text-slate-500 tabular-nums">-</td>
                    <td className="px-3 py-2.5 text-right text-xs font-semibold text-primary-700 tabular-nums">{formatCurrency(rollingTotal.totalBilled)}</td>
                    <td className="px-3 py-2.5 text-right text-xs font-semibold text-success-700 tabular-nums">-{formatCurrency(rollingTotal.totalWriteOff)}</td>
                    <td className="px-3 py-2.5 text-right">
                      <span className={cn(
                        'text-xs font-bold tabular-nums',
                        rollingTotal.finalUnpaid > 0 ? 'text-warning-600' : 'text-success-600'
                      )}>
                        {formatCurrency(rollingTotal.finalUnpaid)}
                      </span>
                      <span className="ml-2 text-[10px] text-slate-500">
                        （当前欠费 = {formatCurrency(kpi.unpaid)}）
                      </span>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

type TimelineEvent =
  | { type: 'bill'; id: string; sortKey: string; bill: import('@/types').Bill }
  | { type: 'receipt'; id: string; sortKey: string; receipt: import('@/types').Receipt }
  | { type: 'notification'; id: string; sortKey: string; notification: import('@/types').Notification; task?: import('@/types').Task; relatedBill?: import('@/types').Bill; relatedReceipt?: import('@/types').Receipt };

const statusTextMap: Record<import('@/types').TaskStatus, string> = {
  pending: '待处理',
  contacted: '已联系',
  promised: '承诺缴费',
  need_visit: '需上门',
  completed: '已完成',
  cancelled: '已取消',
};

const OwnerTimeline = ({
  bills, receipts, notifications, tasks,
}: {
  bills: import('@/types').Bill[];
  receipts: import('@/types').Receipt[];
  notifications: import('@/types').Notification[];
  tasks: import('@/types').Task[];
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const toggleExpanded = (id: string) => setExpandedId((prev) => (prev === id ? null : id));
  const events = useMemo(() => {
    const list: TimelineEvent[] = [];
    for (const b of bills) {
      list.push({
        type: 'bill',
        id: 'b_' + b.id,
        sortKey: b.generateDate + '_00',
        bill: b,
      });
    }
    for (const r of receipts) {
      list.push({
        type: 'receipt',
        id: 'r_' + r.id,
        sortKey: r.payDate.replace(' ', '_') + '_01',
        receipt: r,
      });
    }
    for (const n of notifications) {
      list.push({
        type: 'notification',
        id: 'n_' + n.id,
        sortKey: n.notifyDate.replace(' ', '_') + '_02',
        notification: n,
        task: tasks.find((t) => t.id === n.taskId),
        relatedBill: bills.find((b) => b.id === n.billId),
        relatedReceipt: receipts.find((r) => r.id === n.receiptId),
      });
    }
    return list.sort((a, b) => (a.sortKey < b.sortKey ? 1 : -1));
  }, [bills, receipts, notifications, tasks]);

  if (events.length === 0) {
    return (
      <div className="py-10 text-center text-xs text-slate-400">
        <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
        暂无任何历史记录
      </div>
    );
  }

  return (
    <div className="relative pl-2 space-y-3 max-h-[420px] overflow-y-auto pr-1">
      <div className="absolute left-[11px] top-1 bottom-1 w-px bg-slate-200" aria-hidden />
      {events.map((ev, i) => {
        if (ev.type === 'bill') {
          const b = ev.bill;
          const voided = b.status === 'void';
          const expanded = expandedId === ev.id;
          return (
            <div key={ev.id} className="relative pl-8 animate-fade-in-stagger" style={{ animationDelay: `${i * 15}ms` }}>
              <div className={cn(
                'absolute left-0 top-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm ring-4 ring-white',
                voided ? 'bg-slate-400' : b.status === 'paid' ? 'bg-success-500' : b.status === 'partial' ? 'bg-warning-500' : 'bg-danger-500'
              )}>
                <FileText className="w-3 h-3 text-white" />
              </div>
              <div
                className={cn(
                  'p-3 rounded-lg border bg-white hover:bg-slate-50/60 transition-colors cursor-pointer',
                  expanded ? 'border-primary-200 bg-primary-50/30' : 'border-slate-100'
                )}
                onClick={() => toggleExpanded(ev.id)}
              >
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-800">{b.period} 账期账单</span>
                    <BillStatusBadge status={b.status} />
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <CalendarDays className="w-3 h-3" />
                      <span>{b.generateDate}</span>
                    </div>
                    <button
                      type="button"
                      className={cn(
                        'w-6 h-6 rounded-md flex items-center justify-center transition-all',
                        expanded ? 'bg-primary-100 text-primary-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                      )}
                    >
                      {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <p className="text-slate-400">应收</p>
                    <p className="font-semibold text-slate-700 tabular-nums">{formatCurrency(b.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">已缴</p>
                    <p className="font-semibold text-success-600 tabular-nums">{formatCurrency(b.paidAmount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400">{voided ? '作废' : '待缴'}</p>
                    <p className={cn('font-bold tabular-nums', voided ? 'text-slate-400 line-through' : 'text-danger-500')}>
                      {formatCurrency(Math.max(0, b.totalAmount - b.paidAmount))}
                    </p>
                  </div>
                </div>
                {expanded && (
                  <div className="mt-3 pt-3 border-t border-slate-100">
                    <div className="rounded-lg border border-primary-100 bg-white overflow-hidden">
                      <div className="px-3 py-2 bg-primary-50/70 border-b border-primary-100 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-primary-600" />
                        <p className="text-[11px] font-semibold text-primary-800">费用拆分</p>
                      </div>
                      <div className="grid grid-cols-2 gap-2 p-3 text-[11px]">
                        <div className="flex items-center justify-between p-2 rounded bg-slate-50/50">
                          <span className="text-slate-500">物业费</span>
                          <span className="font-semibold text-slate-700 tabular-nums">{formatCurrency(b.propertyFee)}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-slate-50/50">
                          <span className="text-slate-500">水费</span>
                          <span className="font-semibold text-slate-700 tabular-nums">{formatCurrency(b.waterFee)}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-slate-50/50">
                          <span className="text-slate-500">电费</span>
                          <span className="font-semibold text-slate-700 tabular-nums">{formatCurrency(b.electricFee)}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-slate-50/50">
                          <span className="text-slate-500">其它</span>
                          <span className="font-semibold text-slate-700 tabular-nums">{formatCurrency(b.otherFee)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {b.remark && (
                  <div className="mt-2 pt-2 border-t border-slate-50 text-[11px] text-slate-500">
                    💬 {b.remark}
                  </div>
                )}
              </div>
            </div>
          );
        }
        if (ev.type === 'receipt') {
          const r = ev.receipt;
          const expanded = expandedId === ev.id;
          const allocations = r.allocations || [];
          return (
            <div key={ev.id} className="relative pl-8 animate-fade-in-stagger" style={{ animationDelay: `${i * 15}ms` }}>
              <div className="absolute left-0 top-1.5 w-5 h-5 rounded-full bg-success-500 flex items-center justify-center shadow-sm ring-4 ring-white">
                <Receipt className="w-3 h-3 text-white" />
              </div>
              <div
                className={cn(
                  'p-3 rounded-lg border bg-gradient-to-br hover:from-success-50 transition-colors cursor-pointer',
                  expanded ? 'border-success-300 from-success-100/70 to-white' : 'border-success-100 from-success-50/60 to-white'
                )}
                onClick={() => toggleExpanded(ev.id)}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-success-800">✓ 收款登记</span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] text-slate-400 font-mono">{r.payDate.slice(5, 16)}</span>
                    {allocations.length > 0 && (
                      <button
                        type="button"
                        className={cn(
                          'w-6 h-6 rounded-md flex items-center justify-center transition-all',
                          expanded ? 'bg-success-100 text-success-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                        )}
                      >
                        {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-2 text-[11px]">
                  <div>
                    <p className="text-slate-400">应收</p>
                    <p className="font-medium text-slate-700 tabular-nums">{formatCurrency(r.totalBillAmount)}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">减免</p>
                    <p className={cn('font-medium tabular-nums', r.discount > 0 ? 'text-warning-600' : 'text-slate-400')}>
                      {r.discount > 0 ? `-${formatCurrency(r.discount)}` : '-'}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-slate-400">实收</p>
                    <p className="font-bold text-success-700 tabular-nums">{formatCurrency(r.amount)}</p>
                  </div>
                </div>
                <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
                  <span>操作人：{r.operatorName}</span>
                  <span className="font-mono">{r.id.slice(-6).toUpperCase()}</span>
                </div>
                {expanded && allocations.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-success-100/70">
                    <div className="rounded-lg border border-success-100 bg-white overflow-hidden">
                      <div className="px-3 py-2 bg-success-50/70 border-b border-success-100 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-success-600" />
                        <p className="text-[11px] font-semibold text-success-800">核销明细（共 {allocations.length} 张账单）</p>
                      </div>
                      <table className="w-full text-[11px]">
                        <thead>
                          <tr className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                            <th className="px-3 py-1.5 text-left">账期</th>
                            <th className="px-3 py-1.5 text-right">原应收</th>
                            <th className="px-3 py-1.5 text-right">核销前待缴</th>
                            <th className="px-3 py-1.5 text-right">本次实收</th>
                            <th className="px-3 py-1.5 text-right">本次减免</th>
                            <th className="px-3 py-1.5 text-right">核销后余额</th>
                          </tr>
                        </thead>
                        <tbody>
                          {allocations.map((a) => {
                            const remain = Math.max(0, Math.round((a.billUnpaid - a.allocated - a.discount) * 100) / 100);
                            return (
                              <tr key={a.billId} className="border-t border-slate-50 even:bg-slate-50/30">
                                <td className="px-3 py-2 font-medium text-slate-800">{a.period}</td>
                                <td className="px-3 py-2 text-right text-slate-500 tabular-nums">{formatCurrency(a.billTotal)}</td>
                                <td className="px-3 py-2 text-right text-danger-600 tabular-nums font-medium">{formatCurrency(a.billUnpaid)}</td>
                                <td className="px-3 py-2 text-right text-success-700 tabular-nums font-semibold">+{formatCurrency(a.allocated)}</td>
                                <td className="px-3 py-2 text-right">
                                  {a.discount > 0
                                    ? <span className="text-warning-600 tabular-nums font-medium">-{formatCurrency(a.discount)}</span>
                                    : <span className="text-slate-300">-</span>
                                  }
                                </td>
                                <td className="px-3 py-2 text-right text-slate-700 tabular-nums font-semibold">{formatCurrency(remain)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
                {r.remark && (
                  <div className="mt-1.5 pt-1.5 border-t border-success-100/70 text-[11px] text-slate-500">
                    💬 {r.remark}
                  </div>
                )}
              </div>
            </div>
          );
        }
        const n = ev.notification;
        const t = ev.task;
        const rb = ev.relatedBill;
        const rr = ev.relatedReceipt;
        const et = n.eventType;
        const expanded = expandedId === ev.id;

        let titleText = '📞 催缴沟通';
        let titleColor = 'text-primary-800';
        let dotBg = 'bg-primary-600';
        let DotIcon: any = MessageSquare;
        let methodTag: { label: string; bg: string } | null = null;
        let hoverBg = 'hover:bg-primary-50/30';
        let expandedBorder = 'border-primary-200 bg-primary-50/30';
        let canExpand = false;

        if (et?.startsWith('bill_')) {
          dotBg = 'bg-blue-500';
          titleColor = 'text-blue-800';
          hoverBg = 'hover:bg-blue-50/40';
          expandedBorder = 'border-blue-200 bg-blue-50/30';
          DotIcon = FileText;
          if (et === 'bill_generate') {
            titleText = '📄 生成账单';
            methodTag = { label: '生成', bg: 'bg-blue-500' };
          } else if (et === 'bill_adjust') {
            titleText = '✏️ 调整账单';
            methodTag = { label: '调整', bg: 'bg-blue-600' };
          } else if (et === 'bill_void') {
            titleText = '🚫 作废账单';
            methodTag = { label: '作废', bg: 'bg-slate-500' };
          }
          if (rb) canExpand = true;
        } else if (et?.startsWith('receipt_')) {
          dotBg = 'bg-success-500';
          titleColor = 'text-success-800';
          hoverBg = 'hover:bg-success-50/40';
          expandedBorder = 'border-success-200 bg-success-50/30';
          DotIcon = Receipt;
          if (et === 'receipt_record') {
            titleText = '💰 登记收款';
            methodTag = { label: '收款', bg: 'bg-success-500' };
          } else if (et === 'receipt_discount') {
            titleText = '💸 减免收款';
            methodTag = { label: '减免', bg: 'bg-warning-500' };
          }
          if (rr && rr.allocations && rr.allocations.length > 0) canExpand = true;
        } else if (et?.startsWith('task_')) {
          dotBg = 'bg-indigo-500';
          titleColor = 'text-indigo-800';
          hoverBg = 'hover:bg-indigo-50/40';
          expandedBorder = 'border-indigo-200 bg-indigo-50/30';
          if (et === 'task_assign') {
            titleText = '📋 分配任务';
            DotIcon = Users;
            methodTag = { label: '分配', bg: 'bg-indigo-500' };
          } else if (et === 'task_transition') {
            titleText = '📞 催缴跟进';
            DotIcon = MessageSquare;
            methodTag = { label: '跟进', bg: 'bg-indigo-600' };
          }
          if (et === 'task_transition' && t) canExpand = true;
        } else {
          dotBg = 'bg-purple-500';
          titleColor = 'text-purple-800';
          hoverBg = 'hover:bg-purple-50/40';
          expandedBorder = 'border-purple-200 bg-purple-50/30';
          DotIcon = MessageSquare;
          titleText = '📞 催缴沟通';
        }

        if (n.method !== 'system' && !methodTag) {
          methodTag = n.method === 'sms'
            ? { label: '短信', bg: 'bg-blue-500' }
            : n.method === 'call'
            ? { label: '电话', bg: 'bg-indigo-500' }
            : { label: '上门', bg: 'bg-purple-500' };
        }

        return (
          <div key={ev.id} className="relative pl-8 animate-fade-in-stagger" style={{ animationDelay: `${i * 15}ms` }}>
            <div className={cn(
              'absolute left-0 top-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm ring-4 ring-white',
              dotBg
            )}>
              <DotIcon className="w-3 h-3 text-white" />
            </div>
            <div
              className={cn(
                'p-3 rounded-lg border bg-white transition-colors',
                expanded ? expandedBorder : 'border-slate-100',
                hoverBg,
                'cursor-pointer'
              )}
              onClick={() => toggleExpanded(ev.id)}
            >
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn('text-xs font-semibold', titleColor)}>{titleText}</span>
                  {n.fromStatus && n.toStatus && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary-50 text-[10px] text-primary-700 font-medium">
                      {statusTextMap[n.fromStatus]}
                      <ArrowRightMini className="w-3 h-3" />
                      {statusTextMap[n.toStatus]}
                    </span>
                  )}
                  {t && <TaskStatusBadge status={t.status} />}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[11px] text-slate-400 font-mono">{n.notifyDate.slice(5, 16)}</span>
                  {canExpand && (
                    <button
                      type="button"
                      className={cn(
                        'w-6 h-6 rounded-md flex items-center justify-center transition-all',
                        expanded ? 'bg-slate-100 text-slate-700' : 'text-slate-400 hover:bg-slate-100 hover:text-slate-600'
                      )}
                    >
                      {expanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 mb-1.5 text-[11px]">
                {methodTag && (
                  <span className={cn(
                    'px-1.5 py-0.5 rounded text-white font-medium',
                    methodTag.bg
                  )}>
                    {methodTag.label}
                  </span>
                )}
                <span className={cn(
                  'px-1.5 py-0.5 rounded font-medium',
                  n.result === 'success' ? 'bg-success-100 text-success-700'
                  : n.result === 'promised' ? 'bg-warning-100 text-warning-700'
                  : n.result === 'failed' ? 'bg-danger-100 text-danger-700'
                  : n.result === 'info' ? 'bg-blue-100 text-blue-700'
                  : n.result === 'adjusted' ? 'bg-indigo-100 text-indigo-700'
                  : n.result === 'void' ? 'bg-slate-100 text-slate-600'
                  : 'bg-slate-100 text-slate-700'
                )}>
                  {n.result === 'success' ? '成功' : n.result === 'promised' ? '承诺缴费' : n.result === 'failed' ? '失败' : n.result === 'info' ? '通知' : n.result === 'adjusted' ? '已调整' : n.result === 'void' ? '已作废' : '待跟进'}
                </span>
                <span className="text-slate-500">{n.operatorName}</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{n.content}</p>
              {expanded && et?.startsWith('receipt_') && rr && rr.allocations && rr.allocations.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="rounded-lg border border-success-100 bg-white overflow-hidden">
                    <div className="px-3 py-2 bg-success-50/70 border-b border-success-100 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-success-600" />
                      <p className="text-[11px] font-semibold text-success-800">核销明细（共 {rr.allocations.length} 张账单）</p>
                    </div>
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                          <th className="px-3 py-1.5 text-left">账期</th>
                          <th className="px-3 py-1.5 text-right">原应收</th>
                          <th className="px-3 py-1.5 text-right">核销前待缴</th>
                          <th className="px-3 py-1.5 text-right">本次实收</th>
                          <th className="px-3 py-1.5 text-right">本次减免</th>
                          <th className="px-3 py-1.5 text-right">核销后余额</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rr.allocations.map((a) => {
                          const remain = Math.max(0, Math.round((a.billUnpaid - a.allocated - a.discount) * 100) / 100);
                          return (
                            <tr key={a.billId} className="border-t border-slate-50 even:bg-slate-50/30">
                              <td className="px-3 py-2 font-medium text-slate-800">{a.period}</td>
                              <td className="px-3 py-2 text-right text-slate-500 tabular-nums">{formatCurrency(a.billTotal)}</td>
                              <td className="px-3 py-2 text-right text-danger-600 tabular-nums font-medium">{formatCurrency(a.billUnpaid)}</td>
                              <td className="px-3 py-2 text-right text-success-700 tabular-nums font-semibold">+{formatCurrency(a.allocated)}</td>
                              <td className="px-3 py-2 text-right">
                                {a.discount > 0
                                  ? <span className="text-warning-600 tabular-nums font-medium">-{formatCurrency(a.discount)}</span>
                                  : <span className="text-slate-300">-</span>
                                }
                              </td>
                              <td className="px-3 py-2 text-right text-slate-700 tabular-nums font-semibold">{formatCurrency(remain)}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              {expanded && et?.startsWith('bill_') && rb && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="rounded-lg border border-blue-100 bg-white overflow-hidden">
                    <div className="px-3 py-2 bg-blue-50/70 border-b border-blue-100 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-blue-600" />
                      <p className="text-[11px] font-semibold text-blue-800">{rb.period} 账单概览</p>
                    </div>
                    <div className="p-3">
                      <div className="grid grid-cols-3 gap-2 text-[11px] mb-3">
                        <div>
                          <p className="text-slate-400">应收</p>
                          <p className="font-semibold text-slate-700 tabular-nums">{formatCurrency(rb.totalAmount)}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">已缴</p>
                          <p className="font-semibold text-success-600 tabular-nums">{formatCurrency(rb.paidAmount)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-slate-400">{rb.status === 'void' ? '作废' : '待缴'}</p>
                          <p className={cn('font-bold tabular-nums', rb.status === 'void' ? 'text-slate-400 line-through' : 'text-danger-500')}>
                            {formatCurrency(Math.max(0, rb.totalAmount - rb.paidAmount))}
                          </p>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div className="flex items-center justify-between p-2 rounded bg-slate-50/50">
                          <span className="text-slate-500">物业费</span>
                          <span className="font-semibold text-slate-700 tabular-nums">{formatCurrency(rb.propertyFee)}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-slate-50/50">
                          <span className="text-slate-500">水费</span>
                          <span className="font-semibold text-slate-700 tabular-nums">{formatCurrency(rb.waterFee)}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-slate-50/50">
                          <span className="text-slate-500">电费</span>
                          <span className="font-semibold text-slate-700 tabular-nums">{formatCurrency(rb.electricFee)}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-slate-50/50">
                          <span className="text-slate-500">其它</span>
                          <span className="font-semibold text-slate-700 tabular-nums">{formatCurrency(rb.otherFee)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              {expanded && et === 'task_transition' && t && (
                <div className="mt-3 pt-3 border-t border-slate-100">
                  <div className="rounded-lg border border-indigo-100 bg-white overflow-hidden">
                    <div className="px-3 py-2 bg-indigo-50/70 border-b border-indigo-100 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-indigo-600" />
                      <p className="text-[11px] font-semibold text-indigo-800">任务详情</p>
                    </div>
                    <div className="p-3 space-y-2 text-[11px]">
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center justify-between p-2 rounded bg-slate-50/50">
                          <span className="text-slate-500">任务类型</span>
                          <span className="font-medium text-slate-700">{t.type === 'sms' ? '短信催缴' : t.type === 'call' ? '电话催缴' : '上门催缴'}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-slate-50/50">
                          <span className="text-slate-500">优先级</span>
                          <span className={cn(
                            'font-medium',
                            t.priority === 'urgent' ? 'text-danger-600'
                            : t.priority === 'high' ? 'text-warning-600'
                            : t.priority === 'medium' ? 'text-primary-600'
                            : 'text-slate-600'
                          )}>
                            {t.priority === 'urgent' ? '紧急' : t.priority === 'high' ? '高' : t.priority === 'medium' ? '中' : '低'}
                          </span>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex items-center justify-between p-2 rounded bg-slate-50/50">
                          <span className="text-slate-500">到期日期</span>
                          <span className="font-medium text-slate-700">{t.dueDate}</span>
                        </div>
                        <div className="flex items-center justify-between p-2 rounded bg-slate-50/50">
                          <span className="text-slate-500">欠费金额</span>
                          <span className="font-bold text-danger-600 tabular-nums">{formatCurrency(t.unpaidAmount)}</span>
                        </div>
                      </div>
                      {t.assigneeName && (
                        <div className="flex items-center justify-between p-2 rounded bg-slate-50/50">
                          <span className="text-slate-500">负责人</span>
                          <span className="font-medium text-slate-700">{t.assigneeName}</span>
                        </div>
                      )}
                      {t.remark && (
                        <div className="p-2 rounded bg-slate-50/50">
                          <span className="text-slate-500 block mb-0.5">备注</span>
                          <span className="text-slate-700 leading-relaxed">{t.remark}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

function ArrowRightMini(props: any) {
  return <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" {...props}><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>;
}
