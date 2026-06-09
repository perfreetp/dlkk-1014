import { NavLink, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Users,
  FileText,
  ClipboardList,
  Bell,
  CreditCard,
  BarChart3,
  Building2,
  Scale,
} from 'lucide-react';
import { cn } from '@/utils/helpers';

const navItems = [
  { path: '/', label: '仪表盘', icon: LayoutDashboard, end: true },
  { path: '/owners', label: '业主列表', icon: Users },
  { path: '/bills', label: '账单管理', icon: FileText },
  { path: '/tasks', label: '催缴任务', icon: ClipboardList },
  { path: '/notifications', label: '通知记录', icon: Bell },
  { path: '/receipts', label: '收款登记', icon: CreditCard },
  { path: '/reconciliation', label: '财务对账', icon: Scale },
  { path: '/reports', label: '统计报表', icon: BarChart3 },
];

export const Sidebar = () => {
  const location = useLocation();

  return (
    <aside className="fixed left-0 top-0 bottom-0 w-60 bg-gradient-to-b from-primary-900 to-primary-950 border-r border-primary-800/50 flex flex-col z-40">
      <div className="h-16 px-5 flex items-center gap-3 border-b border-primary-800/40 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary-500 to-primary-700 flex items-center justify-center shadow-lg">
          <Building2 className="w-5 h-5 text-white" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-bold text-white truncate">物业催缴系统</p>
          <p className="text-[11px] text-primary-300/80 tracking-wide">Property Manager</p>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-4 px-3 space-y-0.5">
        <p className="px-3 pt-2 pb-1.5 text-[11px] font-semibold text-primary-400/70 tracking-wider uppercase">
          导航菜单
        </p>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.end
            ? location.pathname === item.path
            : location.pathname.startsWith(item.path);
          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={cn(
                'group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                isActive
                  ? 'bg-white/10 text-white shadow-inner'
                  : 'text-primary-200/80 hover:bg-white/5 hover:text-white'
              )}
            >
              <Icon
                className={cn(
                  'w-[18px] h-[18px] shrink-0 transition-colors',
                  isActive ? 'text-white' : 'text-primary-300/70 group-hover:text-white'
                )}
              />
              <span className="truncate">{item.label}</span>
              {isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary-400" />}
            </NavLink>
          );
        })}
      </nav>

      <div className="p-4 border-t border-primary-800/40 shrink-0">
        <div className="rounded-xl bg-white/5 p-3 border border-primary-800/30">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-sm font-bold text-white shadow">
              赵
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-white truncate">赵主管</p>
              <p className="text-[11px] text-primary-300/70">物业管理员</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
