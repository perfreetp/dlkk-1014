import { cn } from '@/utils/helpers';
import type { ReactNode } from 'react';

type OwnerStatus = 'normal' | 'arrears' | 'serious';
type BillStatus = 'unpaid' | 'partial' | 'paid' | 'void';
type TaskType = 'sms' | 'call' | 'visit';
type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
type TaskStatus = 'pending' | 'contacted' | 'promised' | 'need_visit' | 'completed' | 'cancelled';
type NotificationMethod = 'sms' | 'call' | 'visit';
type NotificationResult = 'success' | 'failed' | 'pending' | 'promised';
type PaymentMethod = 'cash' | 'wechat' | 'alipay' | 'bank' | 'card';

const ownerStatusConfig: Record<OwnerStatus, { label: string; className: string }> = {
  normal: { label: '正常', className: 'bg-success-50 text-success-700 border-success-500/20' },
  arrears: { label: '欠费', className: 'bg-warning-50 text-warning-600 border-warning-500/20' },
  serious: { label: '严重', className: 'bg-danger-50 text-danger-500 border-danger-500/20' },
};

const billStatusConfig: Record<BillStatus, { label: string; className: string }> = {
  unpaid: { label: '未缴', className: 'bg-danger-50 text-danger-500 border-danger-500/20' },
  partial: { label: '部分', className: 'bg-warning-50 text-warning-600 border-warning-500/20' },
  paid: { label: '已缴', className: 'bg-success-50 text-success-700 border-success-500/20' },
  void: { label: '作废', className: 'bg-slate-100 text-slate-500 border-slate-300' },
};

const taskTypeConfig: Record<TaskType, { label: string; className: string; icon: ReactNode }> = {
  sms: { label: '短信', className: 'bg-blue-50 text-blue-700', icon: <span>✉️</span> },
  call: { label: '电话', className: 'bg-indigo-50 text-indigo-700', icon: <span>📞</span> },
  visit: { label: '上门', className: 'bg-purple-50 text-purple-700', icon: <span>🏠</span> },
};

const taskPriorityConfig: Record<TaskPriority, { label: string; dot: string; text: string }> = {
  low: { label: '低', dot: 'bg-slate-400', text: 'text-slate-600' },
  medium: { label: '中', dot: 'bg-blue-500', text: 'text-blue-700' },
  high: { label: '高', dot: 'bg-warning-500', text: 'text-warning-600' },
  urgent: { label: '紧急', dot: 'bg-danger-500', text: 'text-danger-500' },
};

const taskStatusConfig: Record<TaskStatus, { label: string; className: string }> = {
  pending: { label: '待处理', className: 'bg-slate-100 text-slate-600 border-slate-300' },
  contacted: { label: '已联系', className: 'bg-blue-50 text-blue-700 border-blue-500/20' },
  promised: { label: '承诺缴费', className: 'bg-warning-50 text-warning-600 border-warning-500/20' },
  need_visit: { label: '需上门', className: 'bg-purple-50 text-purple-700 border-purple-500/20' },
  completed: { label: '已完成', className: 'bg-success-50 text-success-700 border-success-500/20' },
  cancelled: { label: '已取消', className: 'bg-slate-50 text-slate-500 border-slate-200' },
};

const notifyMethodConfig: Record<NotificationMethod, { label: string; className: string }> = {
  sms: { label: '短信', className: 'bg-blue-50 text-blue-700' },
  call: { label: '电话', className: 'bg-indigo-50 text-indigo-700' },
  visit: { label: '上门', className: 'bg-purple-50 text-purple-700' },
};

const notifyResultConfig: Record<NotificationResult, { label: string; className: string }> = {
  success: { label: '成功', className: 'bg-success-50 text-success-700' },
  failed: { label: '失败', className: 'bg-danger-50 text-danger-500' },
  pending: { label: '待跟进', className: 'bg-slate-100 text-slate-600' },
  promised: { label: '已承诺', className: 'bg-warning-50 text-warning-600' },
};

const paymentMethodConfig: Record<PaymentMethod, { label: string; icon: string }> = {
  cash: { label: '现金', icon: '💵' },
  wechat: { label: '微信', icon: '💚' },
  alipay: { label: '支付宝', icon: '💙' },
  bank: { label: '转账', icon: '🏦' },
  card: { label: '刷卡', icon: '💳' },
};

interface BadgeProps {
  children: ReactNode;
  className?: string;
}

const BaseBadge = ({ children, className }: BadgeProps) => (
  <span
    className={cn(
      'inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border',
      className
    )}
  >
    {children}
  </span>
);

export const OwnerStatusBadge = ({ status }: { status: OwnerStatus }) => {
  const cfg = ownerStatusConfig[status];
  return <BaseBadge className={cfg.className}>{cfg.label}</BaseBadge>;
};

export const BillStatusBadge = ({ status }: { status: BillStatus }) => {
  const cfg = billStatusConfig[status];
  return <BaseBadge className={cfg.className}>{cfg.label}</BaseBadge>;
};

export const TaskTypeBadge = ({ type }: { type: TaskType }) => {
  const cfg = taskTypeConfig[type];
  return (
    <span className={cn('inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium', cfg.className)}>
      {cfg.icon}
      {cfg.label}
    </span>
  );
};

export const TaskPriorityBadge = ({ priority }: { priority: TaskPriority }) => {
  const cfg = taskPriorityConfig[priority];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-xs font-medium', cfg.text)}>
      <span className={cn('w-1.5 h-1.5 rounded-full', cfg.dot)} />
      {cfg.label}
    </span>
  );
};

export const TaskStatusBadge = ({ status }: { status: TaskStatus }) => {
  const cfg = taskStatusConfig[status];
  return <BaseBadge className={cfg.className}>{cfg.label}</BaseBadge>;
};

export const NotifyMethodBadge = ({ method }: { method: NotificationMethod }) => {
  const cfg = notifyMethodConfig[method];
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', cfg.className)}>
      {cfg.label}
    </span>
  );
};

export const NotifyResultBadge = ({ result }: { result: NotificationResult }) => {
  const cfg = notifyResultConfig[result];
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium', cfg.className)}>
      {cfg.label}
    </span>
  );
};

export const PaymentMethodTag = ({ method }: { method: PaymentMethod }) => {
  const cfg = paymentMethodConfig[method];
  return (
    <span className="inline-flex items-center gap-1 text-xs text-slate-600">
      <span>{cfg.icon}</span>
      {cfg.label}
    </span>
  );
};
