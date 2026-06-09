import { useState, useMemo } from 'react';
import { Search, Filter, X, ChevronDown, Eye, Phone, FileText, Receipt, MessageSquare, Clock, CalendarDays, AlertCircle, CheckCircle2, TrendingUp } from 'lucide-react';
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
          </div>
        )}
      </Drawer>
    </div>
  );
};

type TimelineEvent =
  | { type: 'bill'; id: string; sortKey: string; bill: import('@/types').Bill }
  | { type: 'receipt'; id: string; sortKey: string; receipt: import('@/types').Receipt }
  | { type: 'notification'; id: string; sortKey: string; notification: import('@/types').Notification; task?: import('@/types').Task };

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
  const events = useMemo(() => {
    const list: TimelineEvent[] = [];
    for (const b of bills) {
      list.push({
        type: 'bill',
        id: b.id,
        sortKey: b.generateDate + '_00',
        bill: b,
      });
    }
    for (const r of receipts) {
      list.push({
        type: 'receipt',
        id: r.id,
        sortKey: r.payDate.replace(' ', '_') + '_01',
        receipt: r,
      });
    }
    for (const n of notifications) {
      list.push({
        type: 'notification',
        id: n.id,
        sortKey: n.notifyDate.replace(' ', '_') + '_02',
        notification: n,
        task: tasks.find((t) => t.id === n.taskId),
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
          return (
            <div key={ev.id} className="relative pl-8 animate-fade-in-stagger" style={{ animationDelay: `${i * 15}ms` }}>
              <div className={cn(
                'absolute left-0 top-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm ring-4 ring-white',
                voided ? 'bg-slate-400' : b.status === 'paid' ? 'bg-success-500' : b.status === 'partial' ? 'bg-warning-500' : 'bg-danger-500'
              )}>
                <FileText className="w-3 h-3 text-white" />
              </div>
              <div className="p-3 rounded-lg border border-slate-100 bg-white hover:bg-slate-50/60 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-medium text-slate-800">{b.period} 账期账单</span>
                    <BillStatusBadge status={b.status} />
                  </div>
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 shrink-0">
                    <CalendarDays className="w-3 h-3" />
                    <span>{b.generateDate}</span>
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
          return (
            <div key={ev.id} className="relative pl-8 animate-fade-in-stagger" style={{ animationDelay: `${i * 15}ms` }}>
              <div className="absolute left-0 top-1.5 w-5 h-5 rounded-full bg-success-500 flex items-center justify-center shadow-sm ring-4 ring-white">
                <Receipt className="w-3 h-3 text-white" />
              </div>
              <div className="p-3 rounded-lg border border-success-100 bg-gradient-to-br from-success-50/60 to-white hover:from-success-50 transition-colors">
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-success-800">✓ 收款登记</span>
                  </div>
                  <span className="text-[11px] text-slate-400 shrink-0 font-mono">{r.payDate.slice(5, 16)}</span>
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
        return (
          <div key={ev.id} className="relative pl-8 animate-fade-in-stagger" style={{ animationDelay: `${i * 15}ms` }}>
            <div className={cn(
              'absolute left-0 top-1.5 w-5 h-5 rounded-full flex items-center justify-center shadow-sm ring-4 ring-white',
              n.result === 'success' ? 'bg-primary-600' : n.result === 'promised' ? 'bg-warning-500' : n.result === 'failed' ? 'bg-danger-500' : 'bg-blue-500'
            )}>
              <MessageSquare className="w-3 h-3 text-white" />
            </div>
            <div className="p-3 rounded-lg border border-slate-100 bg-white hover:bg-primary-50/30 transition-colors">
              <div className="flex items-start justify-between gap-2 mb-1.5">
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-xs font-semibold text-primary-800">催缴沟通</span>
                  {n.fromStatus && n.toStatus && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary-50 text-[10px] text-primary-700 font-medium">
                      {statusTextMap[n.fromStatus]}
                      <ArrowRightMini className="w-3 h-3" />
                      {statusTextMap[n.toStatus]}
                    </span>
                  )}
                  {t && <TaskStatusBadge status={t.status} />}
                </div>
                <span className="text-[11px] text-slate-400 shrink-0 font-mono">{n.notifyDate.slice(5, 16)}</span>
              </div>
              <div className="flex items-center gap-2 mb-1.5 text-[11px]">
                <span className={cn(
                  'px-1.5 py-0.5 rounded text-white font-medium',
                  n.method === 'sms' ? 'bg-blue-500' : n.method === 'call' ? 'bg-indigo-500' : 'bg-purple-500'
                )}>
                  {n.method === 'sms' ? '短信' : n.method === 'call' ? '电话' : '上门'}
                </span>
                <span className={cn(
                  'px-1.5 py-0.5 rounded font-medium',
                  n.result === 'success' ? 'bg-success-100 text-success-700'
                  : n.result === 'promised' ? 'bg-warning-100 text-warning-700'
                  : n.result === 'failed' ? 'bg-danger-100 text-danger-700'
                  : 'bg-slate-100 text-slate-700'
                )}>
                  {n.result === 'success' ? '成功' : n.result === 'promised' ? '承诺缴费' : n.result === 'failed' ? '失败' : '待跟进'}
                </span>
                <span className="text-slate-500">{n.operatorName}</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">{n.content}</p>
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
