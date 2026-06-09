import { format } from 'date-fns';
import { zhCN } from 'date-fns/locale';

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('zh-CN', {
    style: 'currency',
    currency: 'CNY',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
};

export const formatNumber = (num: number): string => {
  return new Intl.NumberFormat('zh-CN').format(num);
};

export const formatPercent = (value: number): string => {
  return `${(value * 100).toFixed(1)}%`;
};

export const formatDate = (dateStr: string, pattern: string = 'yyyy-MM-dd'): string => {
  try {
    return format(new Date(dateStr), pattern, { locale: zhCN });
  } catch {
    return dateStr;
  }
};

export const formatDateTime = (dateStr: string): string => {
  return formatDate(dateStr, 'yyyy-MM-dd HH:mm');
};

export const formatShortDate = (dateStr: string): string => {
  return formatDate(dateStr, 'MM/dd');
};

export const maskPhone = (phone: string): string => {
  if (phone.length !== 11) return phone;
  return `${phone.slice(0, 3)}****${phone.slice(7)}`;
};

export const generateId = (prefix: string = ''): string => {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).slice(2, 8);
  return `${prefix}${timestamp}${random}`;
};

export const todayStr = (): string => {
  return format(new Date(), 'yyyy-MM-dd');
};

export const nowStr = (): string => {
  return format(new Date(), 'yyyy-MM-dd HH:mm:ss');
};
