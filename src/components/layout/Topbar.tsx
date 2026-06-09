import { Bell, Search, Settings, RotateCcw, AlertTriangle } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { useState } from 'react';
import { useAppStore } from '@/store';
import { todayStr } from '@/utils/format';
import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': { title: '工作仪表盘', subtitle: '今日概览与关键指标' },
  '/owners': { title: '业主列表', subtitle: '业主信息管理与欠费筛选' },
  '/bills': { title: '账单管理', subtitle: '费用生成、调整与作废' },
  '/tasks': { title: '催缴任务', subtitle: '任务分配与进度跟踪' },
  '/notifications': { title: '通知记录', subtitle: '催缴沟通历史记录' },
  '/receipts': { title: '收款登记', subtitle: '缴费录入与收款管理' },
  '/reports': { title: '统计报表', subtitle: '多维度数据汇总分析' },
};

export const Topbar = () => {
  const location = useLocation();
  const notifications = useAppStore((s) => s.notifications);
  const tasks = useAppStore((s) => s.tasks);
  const resetAllData = useAppStore((s) => s.resetAllData);

  const [confirmOpen, setConfirmOpen] = useState(false);

  const today = todayStr();
  const todayTasks = tasks.filter((t) => t.dueDate === today && t.status !== 'completed');
  const pendingCount = todayTasks.length + notifications.filter((n) => n.result === 'pending').length;

  const findPageInfo = () => {
    for (const [path, info] of Object.entries(pageTitles)) {
      if (path === '/' ? location.pathname === '/' : location.pathname.startsWith(path)) {
        return info;
      }
    }
    return { title: '页面', subtitle: '' };
  };
  const pageInfo = findPageInfo();

  return (
    <>
    <header className="h-16 bg-white border-b border-slate-200/80 sticky top-0 z-30 backdrop-blur-sm bg-white/95">
      <div className="h-full px-8 flex items-center justify-between gap-6">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-4">
            <div className="min-w-0">
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">{pageInfo.title}</h1>
              <p className="text-xs text-slate-500 mt-0.5">{pageInfo.subtitle}</p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="全局搜索..."
              className="w-64 h-9 pl-9 pr-4 rounded-lg border border-slate-200 bg-slate-50/70 text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-400/20 focus:border-primary-400 focus:bg-white transition-all"
            />
          </div>

          <button className="relative p-2.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <Bell className="w-5 h-5" />
            {pendingCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-danger-500 text-[10px] font-bold text-white flex items-center justify-center shadow-sm">
                {pendingCount > 9 ? '9+' : pendingCount}
              </span>
            )}
          </button>

          <button className="p-2.5 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <Settings className="w-5 h-5" />
          </button>

          <div className="w-px h-6 bg-slate-200 mx-1" />

          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            className="p-2.5 rounded-lg text-slate-500 hover:text-warning-600 hover:bg-warning-50 transition-colors"
            title="重置所有测试数据"
          >
            <RotateCcw className="w-5 h-5" />
          </button>

          <div className="flex items-center gap-3">
            <div className="hidden sm:block text-right">
              <p className="text-sm font-semibold text-slate-900">赵主管</p>
              <p className="text-[11px] text-slate-500">物业部 · 管理员</p>
            </div>
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-bold text-white shadow">
              赵
            </div>
          </div>
        </div>
      </div>
    </header>

    <Modal
      open={confirmOpen}
      title="确认重置数据"
      onClose={() => setConfirmOpen(false)}
      footer={
        <>
          <Button variant="outline" onClick={() => setConfirmOpen(false)}>取消</Button>
          <Button
            className="bg-warning-500 hover:bg-warning-600 border-warning-500"
            onClick={() => { resetAllData(); setConfirmOpen(false); }}
          >
            确认重置
          </Button>
        </>
      }
    >
      <div className="flex gap-4 items-start">
        <div className="w-12 h-12 rounded-full bg-warning-50 flex items-center justify-center shrink-0">
          <AlertTriangle className="w-6 h-6 text-warning-500" />
        </div>
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-slate-900">将清空所有已录入的测试数据</p>
          <p className="text-slate-600">包括：新建或修改过的业主账单、收款记录、催缴任务流转、通知记录。</p>
          <p className="text-slate-600">重置后恢复为初始 mock 数据，此操作<strong>不可撤销</strong>。</p>
          <p className="text-xs text-slate-400 pt-1">（数据仅保存在当前浏览器 localStorage，清除浏览器缓存同样会重置）</p>
        </div>
      </div>
    </Modal>
    </>
  );
};
