import { create } from 'zustand';
import type {
  Owner, Bill, Task, Notification, Receipt, Staff, BillStatus, TaskStatus,
  TaskType, NotificationMethod, NotificationResult, PaymentMethod, ReceiptBillAllocation,
} from '@/types';
import { mockOwners, mockBills, mockTasks, mockNotifications, mockReceipts, mockStaffs } from '@/data/mockData';
import { generateId, todayStr, nowStr, formatCurrency } from '@/utils/format';

const STORAGE_KEY = 'property_debt_app_v1';

type PersistKeys = 'owners' | 'bills' | 'tasks' | 'notifications' | 'receipts';

const loadFromStorage = (): Partial<Pick<AppStore, PersistKeys>> => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    const result: Partial<Pick<AppStore, PersistKeys>> = {};
    if (Array.isArray(parsed.owners)) result.owners = parsed.owners;
    if (Array.isArray(parsed.bills)) result.bills = parsed.bills;
    if (Array.isArray(parsed.tasks)) result.tasks = parsed.tasks;
    if (Array.isArray(parsed.notifications)) result.notifications = parsed.notifications;
    if (Array.isArray(parsed.receipts)) result.receipts = parsed.receipts;
    return result;
  } catch {
    return {};
  }
};

const saveToStorage = (state: Pick<AppStore, PersistKeys>) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      owners: state.owners,
      bills: state.bills,
      tasks: state.tasks,
      notifications: state.notifications,
      receipts: state.receipts,
    }));
  } catch {
    /* ignore */
  }
};

const normalizeMockTaskStatus = (tasks: Task[]): Task[] => {
  return tasks.map((t) => {
    return { ...t, status: t.status };
  });
};

const saved = loadFromStorage();

interface AppStore {
  owners: Owner[];
  bills: Bill[];
  tasks: Task[];
  notifications: Notification[];
  receipts: Receipt[];
  staffs: Staff[];

  selectedOwnerId: string | null;
  setSelectedOwnerId: (id: string | null) => void;

  ownerFilters: {
    building?: string;
    keyword?: string;
    minUnpaidMonths?: number;
    status?: Owner['status'];
  };
  setOwnerFilters: (filters: Partial<AppStore['ownerFilters']>) => void;
  resetOwnerFilters: () => void;

  billFilters: {
    building?: string;
    keyword?: string;
    status?: BillStatus;
    period?: string;
  };
  setBillFilters: (filters: Partial<AppStore['billFilters']>) => void;
  resetBillFilters: () => void;

  taskFilters: {
    building?: string;
    keyword?: string;
    status?: TaskStatus;
    assigneeId?: string;
  };
  setTaskFilters: (filters: Partial<AppStore['taskFilters']>) => void;
  resetTaskFilters: () => void;

  addBill: (bill: Omit<Bill, 'id' | 'generateDate' | 'paidAmount' | 'status'>) => void;
  updateBill: (id: string, data: Partial<Bill>) => void;
  voidBill: (id: string, reason: string) => void;

  addTask: (task: Omit<Task, 'id' | 'createDate' | 'status'> & { status?: TaskStatus }) => void;
  assignTask: (id: string, assigneeId: string, assigneeName: string, dueDate: string) => void;
  transitionTask: (params: {
    taskId: string;
    toStatus: TaskStatus;
    method: TaskType;
    result: NotificationResult;
    operatorId: string;
    operatorName: string;
    content: string;
    promisedDate?: string;
  }) => void;
  updateTask: (id: string, data: Partial<Task>) => void;

  addNotification: (notification: Omit<Notification, 'id' | 'notifyDate'>) => void;

  addReceiptDetailed: (params: {
    ownerId: string;
    ownerName: string;
    building: string;
    room: string;
    method: PaymentMethod;
    operatorId: string;
    operatorName: string;
    remark?: string;
    billSelections: Array<{
      bill: Bill;
      allocation: number;
      discount: number;
    }>;
  }) => void;

  recalcOwnerUnpaid: (ownerId: string, bills: Bill[]) => Pick<Owner, 'unpaidAmount' | 'unpaidMonths' | 'status'>;
  voidReceipt: (id: string, reason: string, operatorId: string, operatorName: string) => void;
  resetAllData: () => void;
}

const getBillStatus = (total: number, paid: number, origStatus?: BillStatus): BillStatus => {
  if (origStatus === 'void') return 'void';
  if (paid >= total) return 'paid';
  if (paid > 0) return 'partial';
  return 'unpaid';
};

export const useAppStore = create<AppStore>((set, get) => ({
  owners: saved.owners ?? mockOwners,
  bills: saved.bills ?? mockBills,
  tasks: saved.tasks ?? normalizeMockTaskStatus(mockTasks),
  notifications: saved.notifications ?? mockNotifications,
  receipts: saved.receipts ?? mockReceipts,
  staffs: mockStaffs,

  selectedOwnerId: null,
  setSelectedOwnerId: (id) => set({ selectedOwnerId: id }),

  ownerFilters: {},
  setOwnerFilters: (filters) =>
    set((state) => ({ ownerFilters: { ...state.ownerFilters, ...filters } })),
  resetOwnerFilters: () => set({ ownerFilters: {} }),

  billFilters: {},
  setBillFilters: (filters) =>
    set((state) => ({ billFilters: { ...state.billFilters, ...filters } })),
  resetBillFilters: () => set({ billFilters: {} }),

  taskFilters: {},
  setTaskFilters: (filters) =>
    set((state) => ({ taskFilters: { ...state.taskFilters, ...filters } })),
  resetTaskFilters: () => set({ taskFilters: {} }),

  addBill: (billData) => {
    const newBill: Bill = {
      id: generateId('B'),
      ...billData,
      paidAmount: 0,
      status: 'unpaid',
      generateDate: todayStr(),
    };
    set((state) => {
      const bills = [newBill, ...state.bills];
      const ownerUpdate = get().recalcOwnerUnpaid(newBill.ownerId, bills);
      const owners = state.owners.map((o) => (o.id === newBill.ownerId ? { ...o, ...ownerUpdate } : o));
      const op = state.staffs.find((s) => s.role === 'finance') || state.staffs[0];
      const newNotification: Notification = {
        id: generateId('N'),
        billId: newBill.id,
        ownerId: newBill.ownerId,
        ownerName: newBill.ownerName,
        method: 'system',
        notifyDate: nowStr(),
        result: 'info',
        operatorId: op.id,
        operatorName: op.name,
        content: `生成账单【${newBill.period}】应收 ${formatCurrency(newBill.totalAmount)}（物业 ${formatCurrency(newBill.propertyFee)}，其余 ${formatCurrency(newBill.totalAmount - newBill.propertyFee)}）`,
        eventType: 'bill_generate',
      };
      const newState = { bills, owners, notifications: [newNotification, ...state.notifications] };
      saveToStorage({ ...get(), ...newState });
      return newState;
    });
  },

  updateBill: (id, data) => {
    set((state) => {
      const oldBill = state.bills.find((b) => b.id === id);
      const bills = state.bills.map((b) => {
        if (b.id !== id) return b;
        const updated = { ...b, ...data };
        updated.status = getBillStatus(updated.totalAmount, updated.paidAmount, updated.status);
        return updated;
      });
      const target = bills.find((b) => b.id === id);
      const owners = target
        ? state.owners.map((o) => (o.id === target.ownerId ? { ...o, ...get().recalcOwnerUnpaid(o.id, bills) } : o))
        : state.owners;

      let newNotifications = [...state.notifications];
      if (target && oldBill && oldBill.totalAmount !== target.totalAmount) {
        const op = state.staffs.find((s) => s.role === 'manager') || state.staffs[0];
        const adjNotify: Notification = {
          id: generateId('N'),
          billId: target.id,
          ownerId: target.ownerId,
          ownerName: target.ownerName,
          method: 'system',
          notifyDate: nowStr(),
          result: 'adjusted',
          operatorId: op.id,
          operatorName: op.name,
          content: `调整账单【${target.period}】：${formatCurrency(oldBill.totalAmount)} → ${formatCurrency(target.totalAmount)}${target.remark ? `（原因：${target.remark}）` : ''}`,
          eventType: 'bill_adjust',
          oldValue: formatCurrency(oldBill.totalAmount),
          newValue: formatCurrency(target.totalAmount),
        };
        newNotifications = [adjNotify, ...newNotifications];
      }

      const newState = { bills, owners, notifications: newNotifications };
      saveToStorage({ ...get(), ...newState });
      return newState;
    });
  },

  voidBill: (id, reason) => {
    set((state) => {
      const bills = state.bills.map((b) =>
        b.id === id ? { ...b, status: 'void' as const, remark: reason } : b
      );
      const target = bills.find((b) => b.id === id);
      const owners = target
        ? state.owners.map((o) => (o.id === target.ownerId ? { ...o, ...get().recalcOwnerUnpaid(o.id, bills) } : o))
        : state.owners;

      let newNotifications = [...state.notifications];
      if (target) {
        const op = state.staffs.find((s) => s.role === 'manager') || state.staffs[0];
        const voidNotify: Notification = {
          id: generateId('N'),
          billId: target.id,
          ownerId: target.ownerId,
          ownerName: target.ownerName,
          method: 'system',
          notifyDate: nowStr(),
          result: 'void',
          operatorId: op.id,
          operatorName: op.name,
          content: `作废账单【${target.period}】原应收 ${formatCurrency(target.totalAmount)}${reason ? `（原因：${reason}）` : ''}`,
          eventType: 'bill_void',
        };
        newNotifications = [voidNotify, ...newNotifications];
      }

      const newState = { bills, owners, notifications: newNotifications };
      saveToStorage({ ...get(), ...newState });
      return newState;
    });
  },

  addTask: (taskData) => {
    const newTask: Task = {
      id: generateId('T'),
      ...taskData,
      status: taskData.status || 'pending',
      createDate: todayStr(),
    };
    set((state) => {
      const newState = { tasks: [newTask, ...state.tasks] };
      saveToStorage({ ...state, ...newState });
      return newState;
    });
  },

  assignTask: (id, assigneeId, assigneeName, dueDate) => {
    set((state) => {
      const task = state.tasks.find((t) => t.id === id);
      const newTasks = state.tasks.map((t) =>
        t.id === id ? { ...t, assigneeId, assigneeName, dueDate, status: 'contacted' as Task['status'] } : t
      );
      let newNotifications = [...state.notifications];
      if (task) {
        const op = state.staffs.find((s) => s.role === 'manager') || state.staffs[0];
        newNotifications = [{
          id: generateId('N'),
          taskId: task.id,
          ownerId: task.ownerId,
          ownerName: task.ownerName,
          method: 'system',
          notifyDate: nowStr(),
          result: 'info',
          operatorId: op.id,
          operatorName: op.name,
          content: `分配催缴任务 → ${assigneeName}，跟进日期 ${dueDate}（欠费 ${formatCurrency(task.unpaidAmount)}）`,
          eventType: 'task_assign',
        }, ...newNotifications];
      }
      const newState = { tasks: newTasks, notifications: newNotifications };
      saveToStorage({ ...state, ...newState });
      return newState;
    });
  },

  transitionTask: ({ taskId, toStatus, method, result, operatorId, operatorName, content, promisedDate }) => {
    set((state) => {
      const task = state.tasks.find((t) => t.id === taskId);
      if (!task) return state;
      const fromStatus = task.status;
      const tasks = state.tasks.map((t) =>
        t.id === taskId
          ? {
              ...t,
              status: toStatus as Task['status'],
              promisedDate: toStatus === 'promised' ? promisedDate || t.promisedDate : t.promisedDate,
            }
          : t
      );
      const notifyMethod: NotificationMethod =
        toStatus === 'need_visit' ? 'visit' : method;
      const newNotification: Notification = {
        id: generateId('N'),
        taskId,
        ownerId: task.ownerId,
        ownerName: task.ownerName,
        method: notifyMethod,
        notifyDate: nowStr(),
        result,
        operatorId,
        operatorName,
        content,
        fromStatus,
        toStatus,
        eventType: 'task_transition',
      };
      const newState = {
        tasks,
        notifications: [newNotification, ...state.notifications],
      };
      saveToStorage({ ...state, ...newState });
      return newState;
    });
  },

  updateTask: (id, data) => {
    set((state) => {
      const newState = {
        tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
      };
      saveToStorage({ ...state, ...newState });
      return newState;
    });
  },

  addNotification: (notificationData) => {
    set((state) => {
      const newNotification: Notification = {
        id: generateId('N'),
        ...notificationData,
        notifyDate: nowStr(),
      };
      const newState = { notifications: [newNotification, ...state.notifications] };
      saveToStorage({ ...state, ...newState });
      return newState;
    });
  },

  recalcOwnerUnpaid: (ownerId, bills) => {
    const ownerBills = bills.filter((b) => b.ownerId === ownerId && b.status !== 'void');
    const totalBilled = ownerBills.reduce((s, b) => s + b.totalAmount, 0);
    const totalPaid = ownerBills.reduce((s, b) => s + b.paidAmount, 0);
    const unpaidAmount = Math.max(0, Math.round((totalBilled - totalPaid) * 100) / 100);
    const o = get().owners.find((x) => x.id === ownerId);
    const feePerMonth = o ? o.area * 2.5 : 200;
    const unpaidMonths = feePerMonth > 0 ? Math.round(unpaidAmount / feePerMonth) : 0;
    const status: Owner['status'] =
      unpaidMonths === 0 ? 'normal' : unpaidMonths >= 6 ? 'serious' : 'arrears';
    return { unpaidAmount, unpaidMonths, status };
  },

  voidReceipt: (id, reason, operatorId, operatorName) => {
    set((state) => {
      const target = state.receipts.find((r) => r.id === id);
      if (!target || target.status === 'void') return state;
      const bills = state.bills.map((b) => {
        const alloc = target.allocations?.find((a) => a.billId === b.id);
        if (!alloc) return b;
        const rollback = Math.round((alloc.allocated + alloc.discount) * 100) / 100;
        const newPaid = Math.max(0, Math.round((b.paidAmount - rollback) * 100) / 100);
        return {
          ...b,
          paidAmount: newPaid,
          status: getBillStatus(b.totalAmount, newPaid, b.status === 'void' ? 'void' : undefined),
        };
      });
      const ownerUpdate = get().recalcOwnerUnpaid(target.ownerId, bills);
      const owners = state.owners.map((o) => (o.id === target.ownerId ? { ...o, ...ownerUpdate } : o));
      const receipts = state.receipts.map((r) =>
        r.id === id
          ? { ...r, status: 'void' as const, voidReason: reason, voidDate: nowStr(), voidOperatorId: operatorId, voidOperatorName: operatorName }
          : r
      );
      const voidNotify: Notification = {
        id: generateId('N'),
        receiptId: id,
        ownerId: target.ownerId,
        ownerName: target.ownerName,
        method: 'system',
        notifyDate: nowStr(),
        result: 'void',
        operatorId,
        operatorName,
        content: `作废收款单：实收 ${formatCurrency(target.amount)}${target.discount > 0 ? `，减免 ${formatCurrency(target.discount)}` : ''}，撤回 ${target.allocations?.length || 0} 张账单核销${reason ? `（原因：${reason}）` : ''}`,
        eventType: 'receipt_void',
      };
      const newState = { bills, owners, receipts, notifications: [voidNotify, ...state.notifications] };
      saveToStorage({ ...state, ...newState });
      return newState;
    });
  },

  addReceiptDetailed: ({
    ownerId, ownerName, building, room, method, operatorId, operatorName, remark,
    billSelections,
  }) => {
    if (billSelections.length === 0) return;

    const allocations: ReceiptBillAllocation[] = billSelections.map(({ bill, allocation, discount }) => ({
      billId: bill.id,
      period: bill.period,
      billTotal: bill.totalAmount,
      billUnpaid: bill.totalAmount - bill.paidAmount,
      allocated: Math.round(allocation * 100) / 100,
      discount: Math.round(discount * 100) / 100,
    }));

    const billIds = billSelections.map((b) => b.bill.id);
    const totalBillAmount = Math.round(allocations.reduce((s, a) => s + a.billUnpaid, 0) * 100) / 100;
    const totalDiscount = Math.round(allocations.reduce((s, a) => s + a.discount, 0) * 100) / 100;
    const totalPaid = Math.round(allocations.reduce((s, a) => s + a.allocated, 0) * 100) / 100;

    const newReceipt: Receipt = {
      id: generateId('R'),
      ownerId, ownerName, building, room,
      billId: billIds[0],
      billIds,
      allocations,
      totalBillAmount,
      discount: totalDiscount,
      amount: totalPaid,
      method,
      payDate: nowStr(),
      operatorId,
      operatorName,
      remark,
      status: 'normal' as const,
    };

    set((state) => {
      const bills = state.bills.map((b) => {
        const sel = billSelections.find((s) => s.bill.id === b.id);
        if (!sel) return b;
        const paid = Math.round((b.paidAmount + sel.allocation + sel.discount) * 100) / 100;
        return {
          ...b,
          paidAmount: Math.min(paid, b.totalAmount),
          status: getBillStatus(b.totalAmount, Math.min(paid, b.totalAmount), b.status),
        };
      });

      const ownerUpdate = get().recalcOwnerUnpaid(ownerId, bills);
      const owners = state.owners.map((o) => (o.id === ownerId ? { ...o, ...ownerUpdate } : o));

      const receiptNotify: Notification = {
        id: generateId('N'),
        receiptId: newReceipt.id,
        ownerId,
        ownerName,
        method: 'system',
        notifyDate: nowStr(),
        result: 'success',
        operatorId,
        operatorName,
        content: `登记收款：实收 ${formatCurrency(totalPaid)}${totalDiscount > 0 ? `，减免 ${formatCurrency(totalDiscount)}` : ''}，核销 ${billSelections.length} 张账单（${billSelections.map((s) => s.bill.period).join('、')}）`,
        eventType: totalDiscount > 0 ? 'receipt_discount' : 'receipt_record',
        oldValue: totalDiscount > 0 ? formatCurrency(totalBillAmount) : undefined,
        newValue: totalDiscount > 0 ? formatCurrency(totalPaid) : undefined,
      };

      const newState = {
        receipts: [newReceipt, ...state.receipts],
        bills,
        owners,
        notifications: [receiptNotify, ...state.notifications],
      };
      saveToStorage({ ...state, ...newState });
      return newState;
    });
  },

  resetAllData: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({
      owners: mockOwners,
      bills: mockBills,
      tasks: normalizeMockTaskStatus(mockTasks),
      notifications: mockNotifications,
      receipts: mockReceipts,
    });
  },
}));

export const useFilteredOwners = () => {
  const { owners, ownerFilters } = useAppStore();
  return owners.filter((o) => {
    if (ownerFilters.building && o.building !== ownerFilters.building) return false;
    if (ownerFilters.status && o.status !== ownerFilters.status) return false;
    if (ownerFilters.minUnpaidMonths != null && o.unpaidMonths < ownerFilters.minUnpaidMonths) return false;
    if (ownerFilters.keyword) {
      const kw = ownerFilters.keyword.toLowerCase();
      const matches =
        o.name.toLowerCase().includes(kw) ||
        o.room.toLowerCase().includes(kw) ||
        o.phone.includes(kw);
      if (!matches) return false;
    }
    return true;
  });
};

export const useFilteredBills = () => {
  const { bills, billFilters } = useAppStore();
  return bills.filter((b) => {
    if (billFilters.building && b.building !== billFilters.building) return false;
    if (billFilters.status && b.status !== billFilters.status) return false;
    if (billFilters.period && b.period !== billFilters.period) return false;
    if (billFilters.keyword) {
      const kw = billFilters.keyword.toLowerCase();
      const matches =
        b.ownerName.toLowerCase().includes(kw) ||
        b.room.toLowerCase().includes(kw) ||
        b.id.toLowerCase().includes(kw);
      if (!matches) return false;
    }
    return true;
  });
};

export const useFilteredTasks = () => {
  const { tasks, taskFilters } = useAppStore();
  return tasks.filter((t) => {
    if (taskFilters.building && t.building !== taskFilters.building) return false;
    if (taskFilters.status && t.status !== taskFilters.status) return false;
    if (taskFilters.assigneeId && t.assigneeId !== taskFilters.assigneeId) return false;
    if (taskFilters.keyword) {
      const kw = taskFilters.keyword.toLowerCase();
      const matches =
        t.ownerName.toLowerCase().includes(kw) ||
        t.room.toLowerCase().includes(kw) ||
        (t.assigneeName || '').toLowerCase().includes(kw);
      if (!matches) return false;
    }
    return true;
  });
};
