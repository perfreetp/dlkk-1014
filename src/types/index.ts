export interface Owner {
  id: string;
  name: string;
  phone: string;
  building: string;
  room: string;
  area: number;
  ownerType: '住宅' | '商铺';
  moveInDate: string;
  unpaidMonths: number;
  unpaidAmount: number;
  status: 'normal' | 'arrears' | 'serious';
}

export type BillStatus = 'unpaid' | 'partial' | 'paid' | 'void';

export interface Bill {
  id: string;
  ownerId: string;
  ownerName: string;
  building: string;
  room: string;
  period: string;
  propertyFee: number;
  waterFee: number;
  electricFee: number;
  otherFee: number;
  totalAmount: number;
  paidAmount: number;
  status: BillStatus;
  generateDate: string;
  dueDate: string;
  remark?: string;
}

export type TaskType = 'sms' | 'call' | 'visit';
export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';
export type TaskStatus =
  | 'pending'
  | 'contacted'
  | 'promised'
  | 'need_visit'
  | 'completed'
  | 'cancelled';

export interface Task {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  building: string;
  room: string;
  billId?: string;
  assigneeId?: string;
  assigneeName?: string;
  type: TaskType;
  priority: TaskPriority;
  dueDate: string;
  status: TaskStatus;
  unpaidAmount: number;
  createDate: string;
  remark?: string;
  promisedDate?: string;
}

export type NotificationMethod = 'sms' | 'call' | 'visit' | 'system';
export type NotificationResult = 'success' | 'failed' | 'pending' | 'promised' | 'info' | 'void' | 'adjusted';

export type NotificationEventType =
  | 'task_transition'
  | 'bill_adjust'
  | 'bill_void'
  | 'bill_generate'
  | 'receipt_record'
  | 'receipt_discount'
  | 'receipt_void'
  | 'task_assign';

export interface Notification {
  id: string;
  taskId?: string;
  billId?: string;
  receiptId?: string;
  ownerId: string;
  ownerName: string;
  method: NotificationMethod;
  notifyDate: string;
  result: NotificationResult;
  operatorId: string;
  operatorName: string;
  content: string;
  fromStatus?: TaskStatus;
  toStatus?: TaskStatus;
  eventType?: NotificationEventType;
  oldValue?: string;
  newValue?: string;
}

export type PaymentMethod = 'cash' | 'wechat' | 'alipay' | 'bank' | 'card';

export interface ReceiptBillAllocation {
  billId: string;
  period: string;
  billTotal: number;
  billUnpaid: number;
  allocated: number;
  discount: number;
}

export interface Receipt {
  id: string;
  ownerId: string;
  ownerName: string;
  building: string;
  room: string;
  billId?: string;
  billIds?: string[];
  allocations?: ReceiptBillAllocation[];
  totalBillAmount: number;
  discount: number;
  amount: number;
  method: PaymentMethod;
  payDate: string;
  operatorId: string;
  operatorName: string;
  remark?: string;
  status: 'normal' | 'void';
  voidReason?: string;
  voidDate?: string;
  voidOperatorId?: string;
  voidOperatorName?: string;
}

export type StaffRole = 'finance' | 'service' | 'manager';

export interface Staff {
  id: string;
  name: string;
  role: StaffRole;
  department: string;
  phone: string;
}

export interface DashboardStats {
  totalUnpaidAmount: number;
  totalUnpaidHouseholds: number;
  collectionProgress: number;
  currentMonthReceipts: number;
}

export interface BuildingDebt {
  building: string;
  amount: number;
  households: number;
}

export interface MonthlyTrend {
  month: string;
  target: number;
  actual: number;
  rate: number;
}

export interface BuildingReport {
  building: string;
  totalHouseholds: number;
  unpaidHouseholds: number;
  unpaidAmount: number;
  paidAmount: number;
  collectionRate: number;
  rank: number;
}

export interface MonthlyReport {
  month: string;
  receivable: number;
  received: number;
  unpaid: number;
  collectionRate: number;
}

export interface StaffReport {
  staffId: string;
  staffName: string;
  totalTasks: number;
  completedTasks: number;
  successRate: number;
  totalAmount: number;
}
