import { create } from 'zustand';
import type { Owner, Bill, Task, Notification, Receipt, Staff, BillStatus, TaskStatus } from '@/types';
import { mockOwners, mockBills, mockTasks, mockNotifications, mockReceipts, mockStaffs } from '@/data/mockData';
import { generateId, todayStr, nowStr } from '@/utils/format';

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

  addTask: (task: Omit<Task, 'id' | 'createDate' | 'status'> & { status?: Task['status'] }) => void;
  assignTask: (id: string, assigneeId: string, assigneeName: string, dueDate: string) => void;
  updateTaskStatus: (id: string, status: TaskStatus) => void;
  updateTask: (id: string, data: Partial<Task>) => void;

  addNotification: (notification: Omit<Notification, 'id' | 'notifyDate'>) => void;

  addReceipt: (receipt: Omit<Receipt, 'id' | 'payDate'>) => void;
}

export const useAppStore = create<AppStore>((set, get) => ({
  owners: mockOwners,
  bills: mockBills,
  tasks: mockTasks,
  notifications: mockNotifications,
  receipts: mockReceipts,
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
    set((state) => ({ bills: [newBill, ...state.bills] }));
  },

  updateBill: (id, data) => {
    set((state) => ({
      bills: state.bills.map((b) => {
        if (b.id !== id) return b;
        const updated = { ...b, ...data };
        const total = updated.totalAmount;
        const paid = updated.paidAmount;
        if (paid >= total) {
          updated.status = 'paid';
        } else if (paid > 0) {
          updated.status = 'partial';
        } else if (updated.status !== 'void') {
          updated.status = 'unpaid';
        }
        return updated;
      }),
    }));
  },

  voidBill: (id, reason) => {
    set((state) => ({
      bills: state.bills.map((b) =>
        b.id === id ? { ...b, status: 'void', remark: reason } : b
      ),
    }));
  },

  addTask: (taskData) => {
    const newTask: Task = {
      id: generateId('T'),
      ...taskData,
      status: taskData.status || 'pending',
      createDate: todayStr(),
    };
    set((state) => ({ tasks: [newTask, ...state.tasks] }));
  },

  assignTask: (id, assigneeId, assigneeName, dueDate) => {
    set((state) => ({
      tasks: state.tasks.map((t) =>
        t.id === id
          ? { ...t, assigneeId, assigneeName, dueDate, status: 'in_progress' }
          : t
      ),
    }));
  },

  updateTaskStatus: (id, status) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
    }));
  },

  updateTask: (id, data) => {
    set((state) => ({
      tasks: state.tasks.map((t) => (t.id === id ? { ...t, ...data } : t)),
    }));
  },

  addNotification: (notificationData) => {
    const newNotification: Notification = {
      id: generateId('N'),
      ...notificationData,
      notifyDate: nowStr(),
    };
    set((state) => ({ notifications: [newNotification, ...state.notifications] }));
  },

  addReceipt: (receiptData) => {
    const newReceipt: Receipt = {
      id: generateId('R'),
      ...receiptData,
      payDate: nowStr(),
    };
    set((state) => {
      const bills = [...state.bills];
      if (newReceipt.billId) {
        const billIdx = bills.findIndex((b) => b.id === newReceipt.billId);
        if (billIdx !== -1) {
          const bill = bills[billIdx];
          const newPaid = Math.min(bill.paidAmount + newReceipt.amount, bill.totalAmount);
          bills[billIdx] = {
            ...bill,
            paidAmount: newPaid,
            status: newPaid >= bill.totalAmount ? 'paid' : newPaid > 0 ? 'partial' : bill.status,
          };
        }
      }

      const unpaidReceiptsForOwner = state.receipts
        .filter((r) => r.ownerId === newReceipt.ownerId)
        .reduce((sum, r) => sum + r.amount + r.discount, 0);
      const billsForOwner = bills.filter((b) => b.ownerId === newReceipt.ownerId && b.status !== 'void');
      const totalBilled = billsForOwner.reduce((sum, b) => sum + b.totalAmount, 0);
      const totalPaid = billsForOwner.reduce((sum, b) => sum + b.paidAmount, 0);
      const unpaidAmount = Math.max(0, totalBilled - totalPaid);

      const owners: AppStore['owners'] = state.owners.map((o) => {
        if (o.id !== newReceipt.ownerId) return o;
        const feePerMonth = o.area * 2.5;
        const unpaidMonths = feePerMonth > 0 ? Math.round(unpaidAmount / feePerMonth) : 0;
        const status: Owner['status'] = unpaidMonths === 0 ? 'normal' : unpaidMonths >= 6 ? 'serious' : 'arrears';
        return {
          ...o,
          unpaidAmount,
          unpaidMonths,
          status,
        };
      });

      return {
        receipts: [newReceipt, ...state.receipts],
        bills,
        owners,
      };
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
