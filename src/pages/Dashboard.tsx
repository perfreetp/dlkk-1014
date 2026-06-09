import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { Wallet, Users, Target, ArrowRightLeft, CalendarDays, Clock, AlertTriangle } from 'lucide-react';
import { StatCard } from '@/components/ui/StatCard';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/store';
import { formatCurrency, formatNumber, formatPercent, formatShortDate } from '@/utils/format';
import { TaskPriorityBadge, TaskTypeBadge, TaskStatusBadge, OwnerStatusBadge } from '@/components/ui/StatusBadge';
import { useNavigate } from 'react-router-dom';
import { todayStr } from '@/utils/format';

export const Dashboard = () => {
  const navigate = useNavigate();
  const owners = useAppStore((s) => s.owners);
  const bills = useAppStore((s) => s.bills);
  const tasks = useAppStore((s) => s.tasks);
  const receipts = useAppStore((s) => s.receipts);

  const stats = useMemo(() => {
    const totalUnpaid = owners.reduce((sum, o) => sum + o.unpaidAmount, 0);
    const unpaidHouseholds = owners.filter((o) => o.status !== 'normal').length;
    const totalReceivable = bills
      .filter((b) => b.status !== 'void')
      .reduce((sum, b) => sum + b.totalAmount, 0);
    const totalReceived = receipts.reduce((sum, r) => sum + r.amount, 0);
    const currentMonth = receipts
      .filter((r) => r.payDate.startsWith('2026-06'))
      .reduce((sum, r) => sum + r.amount, 0);
    const progress = totalReceivable > 0 ? totalReceived / totalReceivable : 0;
    return {
      totalUnpaid,
      unpaidHouseholds,
      progress,
      currentMonth,
      totalOwners: owners.length,
    };
  }, [owners, bills, receipts]);

  const buildingData = useMemo(() => {
    const map = new Map<string, { amount: number; households: number }>();
    for (const o of owners) {
      const prev = map.get(o.building) || { amount: 0, households: 0 };
      map.set(o.building, {
        amount: prev.amount + o.unpaidAmount,
        households: prev.households + (o.unpaidAmount > 0 ? 1 : 0),
      });
    }
    return Array.from(map.entries())
      .map(([building, d]) => ({ building: building.replace('号楼', '#'), amount: Math.round(d.amount), households: d.households }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 10);
  }, [owners]);

  const trendData = useMemo(() => {
    const months = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];
    return months.map((m) => {
      const billed = bills.filter((b) => b.period === m).reduce((s, b) => s + b.totalAmount, 0);
      const received = receipts.filter((r) => r.payDate.startsWith(m)).reduce((s, r) => s + r.amount, 0);
      return {
        month: m.replace('2026-', ''),
        应收: Math.round(billed),
        实收: Math.round(received),
        收缴率: billed > 0 ? Math.round((received / billed) * 1000) / 10 : 0,
      };
    });
  }, [bills, receipts]);

  const statusDist = useMemo(() => {
    return [
      { name: '正常', value: owners.filter((o) => o.status === 'normal').length, color: '#10b981' },
      { name: '欠费', value: owners.filter((o) => o.status === 'arrears').length, color: '#f59e0b' },
      { name: '严重', value: owners.filter((o) => o.status === 'serious').length, color: '#ef4444' },
    ];
  }, [owners]);

  const today = todayStr();
  const urgentTasks = useMemo(() => {
    return tasks
      .filter((t) => t.dueDate <= today && t.status !== 'completed' && t.status !== 'cancelled')
      .sort((a, b) => {
        const pr = { urgent: 4, high: 3, medium: 2, low: 1 } as const;
        return pr[b.priority] - pr[a.priority];
      })
      .slice(0, 8);
  }, [tasks, today]);

  const recentReceipts = useMemo(() => [...receipts].sort((a, b) => (b.payDate > a.payDate ? 1 : -1)).slice(0, 6), [receipts]);

  const overdueTasks = tasks.filter((t) => t.dueDate < today && t.status !== 'completed' && t.status !== 'cancelled').length;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-5">
        <StatCard
          title="欠费总金额"
          value={formatCurrency(stats.totalUnpaid)}
          subtitle={`涉及 ${formatNumber(stats.unpaidHouseholds)} 户业主`}
          icon={<Wallet className="w-5 h-5 text-danger-500" />}
          trend={{ value: -3.2, label: '较上月' }}
          gradient="bg-gradient-to-br from-danger-50 to-white via-white"
        />
        <StatCard
          title="欠费户数"
          value={`${stats.unpaidHouseholds} / ${stats.totalOwners}`}
          subtitle={`欠费占比 ${formatPercent(stats.unpaidHouseholds / stats.totalOwners)}`}
          icon={<Users className="w-5 h-5 text-warning-500" />}
          trend={{ value: -5.1, label: '较上月' }}
          gradient="bg-gradient-to-br from-warning-50 to-white via-white"
        />
        <StatCard
          title="催缴完成率"
          value={formatPercent(stats.progress)}
          subtitle="累计应收 / 实收"
          icon={<Target className="w-5 h-5 text-primary-600" />}
          trend={{ value: 2.8, label: '较上月' }}
          gradient="bg-gradient-to-br from-primary-50 to-white via-white"
        />
        <StatCard
          title="本月收款额"
          value={formatCurrency(stats.currentMonth)}
          subtitle={`收款 ${formatNumber(receipts.filter(r => r.payDate.startsWith('2026-06')).length)} 笔`}
          icon={<ArrowRightLeft className="w-5 h-5 text-success-600" />}
          trend={{ value: 8.4, label: '较上月' }}
          gradient="bg-gradient-to-br from-success-50 to-white via-white"
        />
      </div>

      {overdueTasks > 0 && (
        <div className="rounded-xl border border-amber-200 bg-gradient-to-r from-amber-50 to-orange-50/70 p-4 flex items-center gap-4 animate-fade-in">
          <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-amber-900">有 {overdueTasks} 项催缴任务已逾期</p>
            <p className="text-xs text-amber-700 mt-0.5">请尽快处理，避免坏账风险</p>
          </div>
          <Button
            size="sm"
            onClick={() => navigate('/tasks')}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            立即处理
          </Button>
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2 hoverable">
          <CardHeader
            title="楼栋欠费排行 Top 10"
            subtitle="按欠费总金额排序"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>
                查看详情
              </Button>
            }
          />
          <CardBody className="pt-3">
            <ResponsiveContainer width="100%" height={320}>
              <BarChart data={buildingData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="barGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#1e3a5f" stopOpacity={0.9} />
                    <stop offset="100%" stopColor="#356699" stopOpacity={0.6} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="building" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `¥${(v / 10000).toFixed(1)}万`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.08)' }}
                  formatter={(value: number, name) => [formatCurrency(value), name === 'amount' ? '欠费金额' : name]}
                />
                <Bar dataKey="amount" fill="url(#barGrad)" radius={[6, 6, 0, 0]} name="欠费金额" />
              </BarChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card hoverable>
          <CardHeader title="业主缴费状态分布" subtitle="当前全部业主" />
          <CardBody>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={statusDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={55}
                  outerRadius={85}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {statusDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} stroke="white" strokeWidth={2} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => [`${value} 户`, '数量']} />
              </PieChart>
            </ResponsiveContainer>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {statusDist.map((d) => (
                <div key={d.name} className="text-center">
                  <div className="flex items-center justify-center gap-1.5 mb-1">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: d.color }} />
                    <span className="text-xs text-slate-600">{d.name}</span>
                  </div>
                  <p className="text-base font-bold text-slate-900">{d.value}</p>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        <Card className="xl:col-span-2 hoverable">
          <CardHeader
            title="收缴进度趋势"
            subtitle="近 6 个月应收/实收对比"
            action={
              <Button variant="ghost" size="sm" onClick={() => navigate('/reports')}>
                报表导出
              </Button>
            }
          />
          <CardBody className="pt-3">
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendData} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}月`} />
                <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `¥${v / 10000}万`} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.08)' }}
                  formatter={(value: number, name: string) => [
                    typeof name === 'string' && name.includes('率') ? `${value}%` : formatCurrency(value),
                    name,
                  ]}
                />
                <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                <Line yAxisId="left" type="monotone" dataKey="应收" stroke="#1e3a5f" strokeWidth={2.5} dot={{ r: 4, fill: '#1e3a5f' }} activeDot={{ r: 6 }} />
                <Line yAxisId="left" type="monotone" dataKey="实收" stroke="#10b981" strokeWidth={2.5} dot={{ r: 4, fill: '#10b981' }} activeDot={{ r: 6 }} />
                <Line yAxisId="right" type="monotone" dataKey="收缴率" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="5 5" dot={{ r: 3, fill: '#f59e0b' }} />
              </LineChart>
            </ResponsiveContainer>
          </CardBody>
        </Card>

        <Card hoverable>
          <CardHeader title="待办任务" subtitle={`今日 ${urgentTasks.length} 项待处理`} />
          <CardBody className="pt-2 pb-3">
            <div className="space-y-2">
              {urgentTasks.length === 0 && (
                <div className="py-12 text-center text-slate-400">
                  <Clock className="w-10 h-10 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">暂无待办任务，干得漂亮！</p>
                </div>
              )}
              {urgentTasks.map((t, i) => (
                <div
                  key={t.id}
                  className="group flex items-start gap-3 p-3 rounded-lg border border-transparent hover:border-slate-100 hover:bg-slate-50/70 transition-colors cursor-pointer animate-fade-in-stagger"
                  style={{ animationDelay: `${i * 40}ms` }}
                  onClick={() => navigate('/tasks')}
                >
                  <div className="mt-0.5 shrink-0">
                    <TaskTypeBadge type={t.type} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-slate-900 truncate">{t.ownerName}</p>
                      <TaskPriorityBadge priority={t.priority} />
                    </div>
                    <div className="mt-1 flex items-center gap-3 text-[11px] text-slate-500">
                      <span>{t.building} {t.room}</span>
                      <span className="text-danger-500 font-medium">{formatCurrency(t.unpaidAmount)}</span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <TaskStatusBadge status={t.status} />
                    <span className="text-[10px] text-slate-400">
                      <CalendarDays className="w-3 h-3 inline -mt-0.5 mr-0.5" />
                      {formatShortDate(t.dueDate)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardBody>
        </Card>
      </div>

      <Card hoverable>
        <CardHeader
          title="近期收款动态"
          subtitle="最新 6 条收款记录"
          action={<Button variant="ghost" size="sm" onClick={() => navigate('/receipts')}>全部记录</Button>}
        />
        <CardBody className="pt-0">
          <div className="overflow-x-auto -mx-5 -my-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 text-left text-xs font-medium text-slate-500">
                  <th className="px-5 py-3 font-medium">业主</th>
                  <th className="px-5 py-3 font-medium">楼栋</th>
                  <th className="px-5 py-3 font-medium">收款金额</th>
                  <th className="px-5 py-3 font-medium">减免</th>
                  <th className="px-5 py-3 font-medium">操作人</th>
                  <th className="px-5 py-3 font-medium">时间</th>
                </tr>
              </thead>
              <tbody>
                {recentReceipts.map((r, i) => (
                  <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/50 transition-colors animate-fade-in-stagger" style={{ animationDelay: `${i * 50}ms` }}>
                    <td className="px-5 py-3.5 font-medium text-slate-900">{r.ownerName}</td>
                    <td className="px-5 py-3.5 text-slate-600">{r.building} {r.room}</td>
                    <td className="px-5 py-3.5 font-bold text-success-700">{formatCurrency(r.amount)}</td>
                    <td className="px-5 py-3.5 text-warning-600 text-xs">{r.discount > 0 ? formatCurrency(r.discount) : '-'}</td>
                    <td className="px-5 py-3.5 text-slate-600 text-xs">{r.operatorName}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{r.payDate.replace('2026-', '').slice(0, 11)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
