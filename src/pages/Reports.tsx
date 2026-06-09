import { useState, useMemo, useEffect } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, Legend, PieChart, Pie, Cell,
} from 'recharts';
import { Download, Building2, Calendar, Users, TrendingUp, FileSpreadsheet, Trophy, X, Filter } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { useAppStore } from '@/store';
import { formatCurrency, formatPercent, formatNumber } from '@/utils/format';
import { cn } from '@/utils/helpers';
import { downloadCSV } from '@/utils/helpers';

type TabKey = 'building' | 'monthly' | 'staff';

const tabs: { key: TabKey; label: string; icon: any }[] = [
  { key: 'building', label: '楼栋汇总', icon: Building2 },
  { key: 'monthly', label: '月度趋势', icon: Calendar },
  { key: 'staff', label: '人员考核', icon: Users },
];

const BUILDING_COLORS = ['#1e3a5f', '#356699', '#5583b1', '#89aacb', '#b8cde0', '#f59e0b', '#ef4444', '#10b981'];

export const Reports = () => {
  const owners = useAppStore((s) => s.owners);
  const bills = useAppStore((s) => s.bills);
  const receipts = useAppStore((s) => s.receipts);
  const tasks = useAppStore((s) => s.tasks);
  const notifications = useAppStore((s) => s.notifications);
  const staffs = useAppStore((s) => s.staffs);

  const [activeTab, setActiveTab] = useState<TabKey>('building');

  const allBuildings = useMemo(() => Array.from(new Set(owners.map((o) => o.building))).sort(), [owners]);
  const allStaffs = useMemo(() => staffs.filter((s) => s.role === 'service').map((s) => s.name), [staffs]);
  const allMonths = useMemo(() => ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'], []);

  const [selectedBuildings, setSelectedBuildings] = useState<string[]>(allBuildings);
  const [selectedStaffs, setSelectedStaffs] = useState<string[]>(allStaffs);
  const [monthStart, setMonthStart] = useState('2026-01');
  const [monthEnd, setMonthEnd] = useState('2026-06');

  useEffect(() => { setSelectedBuildings(allBuildings); }, [allBuildings.join(',')]);
  useEffect(() => { setSelectedStaffs(allStaffs); }, [allStaffs.join(',')]);

  const toggleBuilding = (b: string) => {
    setSelectedBuildings((prev) => prev.includes(b) ? prev.filter((x) => x !== b) : [...prev, b]);
  };
  const toggleStaff = (s: string) => {
    setSelectedStaffs((prev) => prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s]);
  };

  const buildingData = useMemo(() => {
    const buildingSet = new Set(selectedBuildings);
    const map = new Map<string, { households: number; unpaidHouseholds: number; unpaidAmount: number; paidAmount: number; totalBilled: number }>();
    for (const o of owners) {
      if (!buildingSet.has(o.building)) continue;
      const prev = map.get(o.building) || { households: 0, unpaidHouseholds: 0, unpaidAmount: 0, paidAmount: 0, totalBilled: 0 };
      map.set(o.building, {
        ...prev,
        households: prev.households + 1,
        unpaidHouseholds: prev.unpaidHouseholds + (o.unpaidAmount > 0 ? 1 : 0),
        unpaidAmount: prev.unpaidAmount + o.unpaidAmount,
      });
    }
    for (const b of bills) {
      if (b.status === 'void') continue;
      if (!buildingSet.has(b.building)) continue;
      if (!map.has(b.building)) continue;
      const prev = map.get(b.building)!;
      prev.paidAmount += b.paidAmount;
      prev.totalBilled += b.totalAmount;
    }
    return Array.from(map.entries())
      .map(([building, d]) => {
        const total = d.totalBilled;
        const rate = total > 0 ? d.paidAmount / total : 0;
        return {
          building,
          '户数': d.households,
          '欠费户数': d.unpaidHouseholds,
          '欠费金额': Math.round(d.unpaidAmount),
          '实收金额': Math.round(d.paidAmount),
          '应收金额': Math.round(total),
          '收缴率': Math.round(rate * 1000) / 10,
        };
      })
      .sort((a, b) => b['欠费金额'] - a['欠费金额'])
      .map((d, i) => ({ ...d, 排名: i + 1 }));
  }, [owners, bills, selectedBuildings]);

  const monthlyData = useMemo(() => {
    const startIdx = allMonths.indexOf(monthStart);
    const endIdx = allMonths.indexOf(monthEnd);
    const [s, e] = startIdx <= endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
    return allMonths.slice(s, e + 1).map((m) => {
      const billed = bills.filter((b) => b.period === m && b.status !== 'void' && selectedBuildings.includes(b.building)).reduce((sum, b) => sum + b.totalAmount, 0);
      const received = receipts.filter((r) => r.payDate.startsWith(m) && selectedBuildings.includes(r.building)).reduce((sum, r) => sum + r.amount, 0);
      const unpaid = Math.max(0, billed - received);
      return {
        月份: m.replace('2026-', '') + '月',
        _period: m,
        应收: Math.round(billed),
        实收: Math.round(received),
        欠费: Math.round(unpaid),
        收缴率: billed > 0 ? Math.round((received / billed) * 1000) / 10 : 0,
      };
    });
  }, [bills, receipts, selectedBuildings, monthStart, monthEnd, allMonths]);

  const staffData = useMemo(() => {
    return staffs
      .filter((s) => s.role === 'service' && selectedStaffs.includes(s.name))
      .map((s) => {
        const sTasks = tasks.filter((t) => t.assigneeName === s.name && (t.building ? selectedBuildings.includes(t.building) : true));
        const completedTasks = sTasks.filter((t) => t.status === 'completed');
        const totalTasks = sTasks.length;
        const sNotifs = notifications.filter((n) => n.operatorName === s.name && (n.ownerId ? (() => { const o = owners.find((x) => x.id === n.ownerId); return o ? selectedBuildings.includes(o.building) : true; })() : true));
        const successNotifs = sNotifs.filter((n) => n.result === 'success' || n.result === 'promised').length;
        const totalReceipts = receipts.filter((r) => r.operatorName === s.name && selectedBuildings.includes(r.building)).reduce((sum, r) => sum + r.amount, 0);
        return {
          staffId: s.id,
          staffName: s.name,
          '任务总数': totalTasks,
          '完成任务': completedTasks.length,
          '完成率': totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 1000) / 10 : 0,
          '催缴成功': successNotifs,
          '催缴率': sNotifs.length > 0 ? Math.round((successNotifs / sNotifs.length) * 1000) / 10 : 0,
          '协助收款': Math.round(totalReceipts),
        };
      })
      .sort((a, b) => b['完成任务'] - a['完成任务']);
  }, [staffs, tasks, notifications, receipts, owners, selectedStaffs, selectedBuildings]);

  const resetAllFilters = () => {
    setSelectedBuildings(allBuildings);
    setSelectedStaffs(allStaffs);
    setMonthStart('2026-01');
    setMonthEnd('2026-06');
  };

  const filterMonthRangeStr = `${monthStart.replace('2026-', '')}月 ~ ${monthEnd.replace('2026-', '')}月`;
  const filterBuildingCount = selectedBuildings.length;
  const filterStaffCount = selectedStaffs.length;
  const hasActiveFilter = filterBuildingCount < allBuildings.length || filterStaffCount < allStaffs.length || monthStart !== '2026-01' || monthEnd !== '2026-06';

  const exportBuilding = () => {
    downloadCSV(
      ['排名', '楼栋', '户数', '欠费户数', '欠费金额', '应收金额', '实收金额', '收缴率'],
      buildingData.map((d) => [d.排名, d.building, d['户数'], d['欠费户数'], d['欠费金额'], d['应收金额'], d['实收金额'], `${d['收缴率']}%`]),
      `楼栋汇总报表_${new Date().toISOString().slice(0, 10)}`
    );
  };

  const exportMonthly = () => {
    downloadCSV(
      ['月份', '应收', '实收', '欠费', '收缴率'],
      monthlyData.map((d) => [d.月份, d.应收, d.实收, d.欠费, `${d.收缴率}%`]),
      `月度报表_${new Date().toISOString().slice(0, 10)}`
    );
  };

  const exportStaff = () => {
    downloadCSV(
      ['姓名', '任务总数', '完成任务', '完成率', '催缴成功', '催缴成功率', '协助收款'],
      staffData.map((d) => [d.staffName, d['任务总数'], d['完成任务'], `${d['完成率']}%`, d['催缴成功'], `${d['催缴率']}%`, d['协助收款']]),
      `人员考核_${new Date().toISOString().slice(0, 10)}`
    );
  };

  const exportAll = () => {
    exportBuilding();
    exportMonthly();
    exportStaff();
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 hoverable">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-primary-50 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-primary-700" />
            </div>
            <div>
              <p className="text-xs text-slate-500">覆盖楼栋</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 font-serif tabular-nums">
                {filterBuildingCount} 栋
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">共 {allBuildings.length} 栋</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 hoverable">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-success-50 flex items-center justify-center">
              <Calendar className="w-5 h-5 text-success-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">统计月份</p>
              <p className="mt-1 text-xl font-bold text-slate-900 font-serif tabular-nums">
                {filterMonthRangeStr}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 hoverable">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-warning-50 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-warning-500" />
            </div>
            <div>
              <p className="text-xs text-slate-500">平均收缴率</p>
              <p className="mt-1 text-2xl font-bold text-warning-600 font-serif tabular-nums">
                {(() => {
                  const totalBilled = buildingData.reduce((s, d) => s + d['应收金额'], 0);
                  const totalPaid = buildingData.reduce((s, d) => s + d['实收金额'], 0);
                  return totalBilled > 0 ? formatPercent(totalPaid / totalBilled) : '—';
                })()}
              </p>
            </div>
          </div>
        </Card>
        <Card className="p-4 hoverable">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-indigo-50 flex items-center justify-center">
              <Trophy className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">考核人员</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 font-serif tabular-nums">
                {filterStaffCount} 人
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">共 {allStaffs.length} 人</p>
            </div>
          </div>
        </Card>
      </div>

      <Card>
        <div className="border-b border-slate-200 px-5 flex items-center justify-between">
          <div className="flex items-center gap-1">
            {tabs.map((t) => {
              const Icon = t.icon;
              const active = activeTab === t.key;
              return (
                <button
                  key={t.key}
                  onClick={() => setActiveTab(t.key)}
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
            {hasActiveFilter && (
              <span className="px-2.5 h-7 rounded-md bg-primary-50 text-primary-700 text-[11px] font-medium border border-primary-100">
                筛选生效中
              </span>
            )}
            <Button size="sm" variant="outline" icon={<FileSpreadsheet className="w-4 h-4" />} onClick={exportAll}>
              导出全部
            </Button>
          </div>
        </div>

        <div className="p-4 border-b border-slate-100 bg-slate-50/40 space-y-3">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-slate-500 shrink-0" />
              <span className="text-xs font-semibold text-slate-700">统一筛选条件</span>
              <span className="text-[10px] text-slate-400">（楼栋汇总 / 月度趋势 / 人员考核 / 导出 CSV 共用）</span>
            </div>
            <div className="flex-1" />
            <button
              type="button"
              onClick={resetAllFilters}
              className="h-8 px-3 rounded-lg text-xs text-slate-500 hover:text-danger-500 hover:bg-danger-50 flex items-center gap-1 transition-all"
            >
              <X className="w-3.5 h-3.5" /> 重置全部
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-5">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">月份范围：</span>
              <div className="flex items-center gap-2">
                <input
                  type="month"
                  value={monthStart}
                  onChange={(e) => setMonthStart(e.target.value)}
                  min="2026-01"
                  max="2026-06"
                  className="h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400/30"
                />
                <span className="text-slate-400 text-sm">至</span>
                <input
                  type="month"
                  value={monthEnd}
                  onChange={(e) => setMonthEnd(e.target.value)}
                  min="2026-01"
                  max="2026-06"
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
            <div className="h-5 w-px bg-slate-200" />
            <div className="flex items-center gap-2 flex-wrap min-w-0">
              <Users className="w-4 h-4 text-slate-500" />
              <span className="text-xs font-medium text-slate-600">客服：</span>
              {allStaffs.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => toggleStaff(s)}
                  className={cn(
                    'px-2 h-7 rounded-md text-[11px] font-medium border transition-all',
                    selectedStaffs.includes(s)
                      ? 'bg-indigo-700 text-white border-indigo-700 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-indigo-300'
                  )}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <CardBody className="space-y-6">
          {activeTab === 'building' && (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-sm font-semibold text-slate-900">楼栋欠费排行</h4>
                    <Button size="sm" variant="ghost" icon={<Download className="w-3.5 h-3.5" />} onClick={exportBuilding}>
                      导出
                    </Button>
                  </div>
                  <ResponsiveContainer width="100%" height={380}>
                    <BarChart data={buildingData} layout="vertical" margin={{ top: 5, right: 20, left: 10, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                      <XAxis type="number" tick={{ fontSize: 11, fill: '#64748b' }} tickFormatter={(v) => `¥${(v / 10000).toFixed(1)}万`} />
                      <YAxis type="category" dataKey="building" tick={{ fontSize: 11, fill: '#64748b' }} width={56} />
                      <Tooltip
                        contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.08)' }}
                        formatter={(value: number, name: string) => {
                          if (name === '欠费金额' || name === '实收金额' || name === '应收金额') return [formatCurrency(value), name];
                          return [value, name];
                        }}
                      />
                      <Legend wrapperStyle={{ fontSize: 11 }} />
                      <Bar dataKey="欠费金额" radius={[0, 4, 4, 0]} fill="#ef4444" />
                      <Bar dataKey="实收金额" radius={[0, 4, 4, 0]} fill="#10b981" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-900 mb-3">楼栋收缴率分布</h4>
                  <ResponsiveContainer width="100%" height={380}>
                    <PieChart>
                      <Pie
                        data={buildingData}
                        cx="50%" cy="50%"
                        innerRadius={70} outerRadius={110}
                        paddingAngle={2}
                        dataKey="收缴率"
                        nameKey="building"
                        label={(entry) => `${entry.building} ${entry['收缴率']}%`}
                        labelLine={false}
                      >
                        {buildingData.map((_, index) => (
                          <Cell key={index} fill={BUILDING_COLORS[index % BUILDING_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value: number) => [`${value}%`, '收缴率']} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <div className="bg-slate-50/60 px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                  <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    楼栋收缴排名明细
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white border-b border-slate-100 text-left text-xs font-semibold text-slate-600 uppercase">
                        <th className="px-4 py-3">排名</th>
                        <th className="px-4 py-3">楼栋</th>
                        <th className="px-4 py-3 text-right">总户数</th>
                        <th className="px-4 py-3 text-right">欠费户数</th>
                        <th className="px-4 py-3 text-right">欠费金额</th>
                        <th className="px-4 py-3 text-right">应收总额</th>
                        <th className="px-4 py-3 text-right">实收总额</th>
                        <th className="px-4 py-3 text-right">收缴率</th>
                      </tr>
                    </thead>
                    <tbody>
                      {buildingData.map((d, i) => (
                        <tr key={d.building} className="border-b border-slate-50 hover:bg-slate-50/60 animate-fade-in-stagger" style={{ animationDelay: `${i * 30}ms` }}>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
                              d.排名 === 1 ? 'bg-amber-100 text-amber-700'
                              : d.排名 === 2 ? 'bg-slate-200 text-slate-600'
                              : d.排名 === 3 ? 'bg-orange-100 text-orange-700'
                              : 'bg-slate-100 text-slate-500'
                            )}>
                              {d.排名}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-medium text-slate-900">{d.building}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{d['户数']}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={cn(
                              'font-medium tabular-nums',
                              d['欠费户数'] > 5 ? 'text-danger-500' : d['欠费户数'] > 0 ? 'text-warning-600' : 'text-success-700'
                            )}>
                              {d['欠费户数']}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right text-danger-500 font-medium tabular-nums">{formatCurrency(d['欠费金额'])}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(d['应收金额'])}</td>
                          <td className="px-4 py-3 text-right text-success-700 font-medium tabular-nums">{formatCurrency(d['实收金额'])}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-20 h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full transition-all',
                                    d['收缴率'] >= 90 ? 'bg-success-500'
                                    : d['收缴率'] >= 70 ? 'bg-primary-500'
                                    : d['收缴率'] >= 50 ? 'bg-warning-500' : 'bg-danger-500'
                                  )}
                                  style={{ width: `${Math.min(100, d['收缴率'])}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium tabular-nums w-10 text-right">{d['收缴率']}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          {activeTab === 'monthly' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-900">月度缴费趋势</h4>
                  <Button size="sm" variant="ghost" icon={<Download className="w-3.5 h-3.5" />} onClick={exportMonthly}>导出</Button>
                </div>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={monthlyData} margin={{ top: 10, right: 30, left: 10, bottom: 10 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="月份" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis yAxisId="left" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `¥${(v / 10000).toFixed(0)}万`} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.08)' }}
                      formatter={(value: number, name: string) => {
                        if (name === '收缴率') return [`${value}%`, name];
                        return [formatCurrency(value), name];
                      }}
                    />
                    <Legend wrapperStyle={{ paddingTop: 10, fontSize: 12 }} />
                    <Line yAxisId="left" type="monotone" dataKey="应收" stroke="#1e3a5f" strokeWidth={3} dot={{ r: 5, fill: '#1e3a5f', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
                    <Line yAxisId="left" type="monotone" dataKey="实收" stroke="#10b981" strokeWidth={3} dot={{ r: 5, fill: '#10b981', strokeWidth: 2, stroke: '#fff' }} activeDot={{ r: 7 }} />
                    <Line yAxisId="left" type="monotone" dataKey="欠费" stroke="#ef4444" strokeWidth={3} strokeDasharray="6 4" dot={{ r: 5, fill: '#ef4444', strokeWidth: 2, stroke: '#fff' }} />
                    <Line yAxisId="right" type="monotone" dataKey="收缴率" stroke="#f59e0b" strokeWidth={2.5} strokeDasharray="4 4" dot={{ r: 4, fill: '#f59e0b' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {monthlyData.map((m, i) => (
                  <div
                    key={m.月份}
                    className="p-5 rounded-2xl border border-slate-100 bg-gradient-to-br from-white to-slate-50 hover:shadow-card-hover transition-all animate-fade-in-stagger"
                    style={{ animationDelay: `${i * 60}ms` }}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="text-lg font-bold text-slate-900 font-serif">{m.月份}</h5>
                      <span className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-bold',
                        m['收缴率'] >= 90 ? 'bg-success-50 text-success-700'
                        : m['收缴率'] >= 70 ? 'bg-primary-50 text-primary-700'
                        : 'bg-warning-50 text-warning-600'
                      )}>
                        {m['收缴率']}%
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <p className="text-[10px] text-slate-500 uppercase">应收</p>
                        <p className="mt-0.5 text-sm font-bold text-slate-900 tabular-nums">{(m.应收 / 10000).toFixed(1)}万</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-success-600 uppercase">实收</p>
                        <p className="mt-0.5 text-sm font-bold text-success-700 tabular-nums">{(m.实收 / 10000).toFixed(1)}万</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-danger-500 uppercase">欠费</p>
                        <p className="mt-0.5 text-sm font-bold text-danger-500 tabular-nums">{(m.欠费 / 10000).toFixed(1)}万</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-slate-50/80 border-b border-slate-100 text-left text-xs font-semibold text-slate-600 uppercase">
                      <th className="px-4 py-3">月份</th>
                      <th className="px-4 py-3 text-right">应收金额</th>
                      <th className="px-4 py-3 text-right">实收金额</th>
                      <th className="px-4 py-3 text-right">欠费金额</th>
                      <th className="px-4 py-3 text-right">收缴率</th>
                      <th className="px-4 py-3 text-right">环比</th>
                    </tr>
                  </thead>
                  <tbody>
                    {monthlyData.map((m, i, arr) => {
                      const prev = i > 0 ? arr[i - 1] : null;
                      const diff = prev ? m['收缴率'] - prev['收缴率'] : 0;
                      return (
                        <tr key={m.月份} className="border-b border-slate-50 hover:bg-slate-50/60">
                          <td className="px-4 py-3 font-medium text-slate-900">{m.月份}</td>
                          <td className="px-4 py-3 text-right tabular-nums">{formatCurrency(m.应收)}</td>
                          <td className="px-4 py-3 text-right text-success-700 font-medium tabular-nums">{formatCurrency(m.实收)}</td>
                          <td className="px-4 py-3 text-right text-danger-500 font-medium tabular-nums">{formatCurrency(m.欠费)}</td>
                          <td className="px-4 py-3 text-right">
                            <span className={cn(
                              'font-bold tabular-nums',
                              m['收缴率'] >= 90 ? 'text-success-700'
                              : m['收缴率'] >= 70 ? 'text-primary-700'
                              : 'text-warning-600'
                            )}>
                              {m['收缴率']}%
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            {prev ? (
                              <span className={cn(
                                'text-xs font-medium tabular-nums',
                                diff > 0 ? 'text-success-600' : diff < 0 ? 'text-danger-500' : 'text-slate-400'
                              )}>
                                {diff > 0 ? '↑' : diff < 0 ? '↓' : '→'} {Math.abs(diff)}%
                              </span>
                            ) : <span className="text-slate-300">—</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}

          {activeTab === 'staff' && (
            <>
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-sm font-semibold text-slate-900">人员任务完成情况</h4>
                  <Button size="sm" variant="ghost" icon={<Download className="w-3.5 h-3.5" />} onClick={exportStaff}>导出</Button>
                </div>
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={staffData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                    <defs>
                      <linearGradient id="g1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#1e3a5f" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#356699" stopOpacity={0.6} />
                      </linearGradient>
                      <linearGradient id="g2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#34d399" stopOpacity={0.6} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis dataKey="staffName" tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#64748b' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', boxShadow: '0 10px 25px -5px rgb(0 0 0 / 0.08)' }} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="任务总数" fill="url(#g1)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="完成任务" fill="url(#g2)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="rounded-xl border border-slate-100 overflow-hidden">
                <div className="bg-slate-50/60 px-4 py-2.5 border-b border-slate-100">
                  <h4 className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                    <Trophy className="w-3.5 h-3.5 text-amber-500" />
                    客服人员考核明细
                  </h4>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-white border-b border-slate-100 text-left text-xs font-semibold text-slate-600 uppercase">
                        <th className="px-4 py-3">排名</th>
                        <th className="px-4 py-3">姓名</th>
                        <th className="px-4 py-3 text-right">任务总数</th>
                        <th className="px-4 py-3 text-right">完成任务</th>
                        <th className="px-4 py-3 text-right">完成率</th>
                        <th className="px-4 py-3 text-right">催缴成功</th>
                        <th className="px-4 py-3 text-right">催缴成功率</th>
                        <th className="px-4 py-3 text-right">协助收款</th>
                      </tr>
                    </thead>
                    <tbody>
                      {staffData.map((d, i) => (
                        <tr key={d.staffId} className="border-b border-slate-50 hover:bg-slate-50/60 animate-fade-in-stagger" style={{ animationDelay: `${i * 40}ms` }}>
                          <td className="px-4 py-3">
                            <span className={cn(
                              'inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
                              i === 0 ? 'bg-amber-100 text-amber-700'
                              : i === 1 ? 'bg-slate-200 text-slate-600'
                              : i === 2 ? 'bg-orange-100 text-orange-700'
                              : 'bg-slate-100 text-slate-500'
                            )}>
                              {i + 1}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-7 h-7 rounded-full bg-primary-100 flex items-center justify-center text-xs font-bold text-primary-700">
                                {d.staffName[0]}
                              </div>
                              <span className="font-medium text-slate-900">{d.staffName}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">{d['任务总数']}</td>
                          <td className="px-4 py-3 text-right text-success-700 font-medium tabular-nums">{d['完成任务']}</td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-2">
                              <div className="w-16 h-2 rounded-full bg-slate-100 overflow-hidden">
                                <div
                                  className={cn(
                                    'h-full rounded-full',
                                    d['完成率'] >= 90 ? 'bg-success-500'
                                    : d['完成率'] >= 70 ? 'bg-primary-500'
                                    : d['完成率'] >= 50 ? 'bg-warning-500' : 'bg-danger-500'
                                  )}
                                  style={{ width: `${Math.min(100, d['完成率'])}%` }}
                                />
                              </div>
                              <span className="text-xs font-medium tabular-nums w-10 text-right">{d['完成率']}%</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums text-success-700">{d['催缴成功']}</td>
                          <td className="px-4 py-3 text-right text-primary-700 font-medium tabular-nums">{d['催缴率']}%</td>
                          <td className="px-4 py-3 text-right font-bold text-success-700 tabular-nums">{formatCurrency(d['协助收款'])}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </CardBody>
      </Card>
    </div>
  );
};
