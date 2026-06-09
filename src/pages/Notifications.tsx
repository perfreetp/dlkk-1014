import { useState, useMemo } from 'react';
import { Search, MessageSquare, Phone, Home, CheckCircle2, XCircle, Clock, CalendarClock } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { NotifyMethodBadge, NotifyResultBadge } from '@/components/ui/StatusBadge';
import { useAppStore } from '@/store';
import type { Notification, NotificationMethod, NotificationResult } from '@/types';
import { formatCurrency, maskPhone } from '@/utils/format';

export const Notifications = () => {
  const notifications = useAppStore((s) => s.notifications);
  const owners = useAppStore((s) => s.owners);

  const [methodFilter, setMethodFilter] = useState<NotificationMethod | ''>('');
  const [resultFilter, setResultFilter] = useState<NotificationResult | ''>('');
  const [searchInput, setSearchInput] = useState('');

  const filtered = useMemo(() => {
    return notifications.filter((n) => {
      if (methodFilter && n.method !== methodFilter) return false;
      if (resultFilter && n.result !== resultFilter) return false;
      if (searchInput) {
        const kw = searchInput.toLowerCase();
        return (
          n.ownerName.toLowerCase().includes(kw) ||
          n.operatorName.toLowerCase().includes(kw) ||
          n.content.toLowerCase().includes(kw)
        );
      }
      return true;
    });
  }, [notifications, methodFilter, resultFilter, searchInput]);

  const stats = useMemo(() => {
    return {
      total: notifications.length,
      sms: notifications.filter((n) => n.method === 'sms').length,
      call: notifications.filter((n) => n.method === 'call').length,
      visit: notifications.filter((n) => n.method === 'visit').length,
      success: notifications.filter((n) => n.result === 'success').length,
      promised: notifications.filter((n) => n.result === 'promised').length,
      failed: notifications.filter((n) => n.result === 'failed').length,
      successRate: notifications.length > 0
        ? (notifications.filter((n) => n.result === 'success' || n.result === 'promised').length / notifications.length) * 100
        : 0,
    };
  }, [notifications]);

  const methodCards = [
    { key: 'sms', label: '短信通知', count: stats.sms, icon: MessageSquare, color: 'text-blue-600', bg: 'from-blue-50' },
    { key: 'call', label: '电话催缴', count: stats.call, icon: Phone, color: 'text-indigo-600', bg: 'from-indigo-50' },
    { key: 'visit', label: '上门拜访', count: stats.visit, icon: Home, color: 'text-purple-600', bg: 'from-purple-50' },
  ];

  const groupedByDate = useMemo(() => {
    const groups = new Map<string, Notification[]>();
    for (const n of filtered) {
      const date = n.notifyDate.slice(0, 10);
      const arr = groups.get(date) || [];
      arr.push(n);
      groups.set(date, arr);
    }
    return Array.from(groups.entries()).sort((a, b) => (b[0] > a[0] ? 1 : -1));
  }, [filtered]);

  const resultIcons: Record<NotificationResult, any> = {
    success: CheckCircle2,
    promised: CheckCircle2,
    pending: Clock,
    failed: XCircle,
    void: XCircle,
    info: CalendarClock,
    adjusted: CheckCircle2,
  };

  const methodIcons: Record<NotificationMethod, any> = {
    sms: MessageSquare,
    call: Phone,
    visit: Home,
    system: CalendarClock,
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {methodCards.map((mc) => {
          const Icon = mc.icon;
          return (
            <div
              key={mc.key}
              onClick={() => setMethodFilter(methodFilter === (mc.key as any) ? '' : (mc.key as any))}
              className={`p-4 rounded-xl bg-gradient-to-br ${mc.bg} to-white border border-slate-200 shadow-card cursor-pointer transition-all hover:shadow-card-hover hover:-translate-y-0.5`}
            >
              <div className="flex items-center justify-between mb-2">
                <Icon className={`w-5 h-5 ${mc.color}`} />
                <span className="text-[10px] text-slate-400">全部 {stats.total}</span>
              </div>
              <p className="text-xs text-slate-600">{mc.label}</p>
              <p className="mt-1 text-2xl font-bold text-slate-900 font-serif tabular-nums">{mc.count}</p>
            </div>
          );
        })}
        <div className="p-4 rounded-xl bg-gradient-to-br from-warning-50 to-white border border-slate-200 shadow-card">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle2 className="w-5 h-5 text-warning-500" />
            <span className="text-[10px] text-slate-400">成功率</span>
          </div>
          <p className="text-xs text-slate-600">催缴成功率</p>
          <p className="mt-1 text-2xl font-bold text-warning-600 font-serif">{stats.successRate.toFixed(1)}%</p>
        </div>
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
                  placeholder="搜索业主 / 操作人 / 内容"
                  className="w-72 h-10 pl-9 pr-4 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30"
                />
              </div>
              <div className="flex items-center gap-1">
                {(['success', 'promised', 'pending', 'failed'] as NotificationResult[]).map((r) => {
                  const active = resultFilter === r;
                  return (
                    <button
                      key={r}
                      onClick={() => setResultFilter(active ? '' : r)}
                      className={`px-3 h-9 rounded-lg text-xs font-medium border transition-all ${
                        active
                          ? 'bg-primary-800 border-primary-800 text-white'
                          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      {r === 'success' ? '成功' : r === 'promised' ? '承诺' : r === 'pending' ? '待跟进' : '失败'}
                    </button>
                  );
                })}
              </div>
            </div>
          }
          subtitle={`共 ${filtered.length} 条记录`}
          action={<Button size="sm" variant="outline">导出记录</Button>}
        />

        <CardBody className="p-5">
          <div className="space-y-8">
            {groupedByDate.map(([date, items], di) => (
              <div key={date} className="animate-fade-in-stagger" style={{ animationDelay: `${di * 80}ms` }}>
                <div className="flex items-center gap-3 mb-4">
                  <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                    <CalendarClock className="w-4 h-4 text-primary-600" />
                    {date}
                  </div>
                  <div className="h-px flex-1 bg-slate-200" />
                  <span className="text-xs text-slate-400">{items.length} 条记录</span>
                </div>
                <div className="space-y-3">
                  {items.map((n, i) => {
                    const owner = owners.find((o) => o.id === n.ownerId);
                    const Icon = resultIcons[n.result];
                    const MIcon = methodIcons[n.method];
                    return (
                      <div
                        key={n.id}
                        className="group relative flex gap-4 p-4 rounded-xl border border-slate-100 hover:border-primary-200 hover:bg-primary-50/30 transition-all animate-fade-in-stagger"
                        style={{ animationDelay: `${i * 40}ms` }}
                      >
                        <div className="w-10 h-10 rounded-xl bg-white shadow-card border border-slate-100 flex items-center justify-center shrink-0">
                          <MIcon className="w-5 h-5 text-primary-700" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2 mb-2">
                            <p className="font-semibold text-slate-900">{n.ownerName}</p>
                            <NotifyMethodBadge method={n.method} />
                            <NotifyResultBadge result={n.result} />
                            {owner && (
                              <span className="text-xs text-danger-500 font-medium">
                                欠费 {formatCurrency(owner.unpaidAmount)}
                              </span>
                            )}
                          </div>
                          <p className="text-sm text-slate-700 leading-relaxed bg-white/60 rounded-lg p-3 border border-slate-100">
                            <Icon className={`w-4 h-4 inline -mt-0.5 mr-1.5 ${
                              n.result === 'success' ? 'text-success-600'
                              : n.result === 'promised' ? 'text-warning-500'
                              : n.result === 'failed' ? 'text-danger-500' : 'text-slate-400'
                            }`} />
                            {n.content}
                          </p>
                        </div>
                        <div className="text-right shrink-0 space-y-2">
                          <div>
                            <p className="text-[11px] text-slate-400">操作人</p>
                            <p className="text-xs font-medium text-slate-700">{n.operatorName}</p>
                          </div>
                          <div>
                            <p className="text-[11px] text-slate-400">时间</p>
                            <p className="text-xs font-mono text-slate-600">{n.notifyDate.slice(11, 16)}</p>
                          </div>
                          {owner && (
                            <div>
                              <p className="text-[11px] text-slate-400">电话</p>
                              <p className="text-xs font-mono text-slate-600">{maskPhone(owner.phone)}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            {groupedByDate.length === 0 && (
              <div className="py-20 text-center text-slate-400">
                <MessageSquare className="w-12 h-12 mx-auto mb-3 opacity-40" />
                <p>暂无通知记录</p>
              </div>
            )}
          </div>
        </CardBody>
      </Card>
    </div>
  );
};
