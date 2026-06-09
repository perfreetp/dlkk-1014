import type { Owner, Bill, Task, Notification, Receipt, Staff } from '@/types';
import { generateId } from '@/utils/format';

const buildings = ['1号楼', '2号楼', '3号楼', '4号楼', '5号楼', '6号楼', '7号楼', '8号楼'];
const ownerNames = ['张伟', '王芳', '李明', '刘洋', '陈静', '杨帆', '赵磊', '黄丽', '周强', '吴敏',
  '徐涛', '孙洁', '马超', '朱红', '胡军', '郭英', '林伟', '何娜', '高翔', '罗雪',
  '郑浩', '梁琴', '谢斌', '宋梅', '唐鹏', '韩露', '曹刚', '许莉', '邓辉', '苏燕'];

const phoneNumbers = ['138', '139', '150', '151', '152', '158', '159', '186', '187', '188', '136', '137'];
const staffNames: Record<string, string[]> = {
  finance: ['李会计', '王出纳'],
  service: ['张客服', '刘客服', '陈客服', '杨客服'],
  manager: ['赵主管'],
};

const genPhone = (): string => {
  const prefix = phoneNumbers[Math.floor(Math.random() * phoneNumbers.length)];
  const suffix = Math.floor(Math.random() * 100000000).toString().padStart(8, '0');
  return prefix + suffix;
};

const genRoom = (): string => {
  const floor = Math.floor(Math.random() * 28) + 1;
  const room = (Math.floor(Math.random() * 4) + 1) * 100 + (Math.floor(Math.random() * 2) + 1);
  return `${String(floor).padStart(2, '0')}${String(room).padStart(3, '0')}`;
};

export const mockOwners: Owner[] = ownerNames.map((name, i) => {
  const unpaidMonths = [0, 0, 0, 0, 1, 1, 2, 2, 3, 4, 5, 6, 8, 12][Math.floor(Math.random() * 14)];
  const area = 75 + Math.floor(Math.random() * 175);
  const monthlyFee = area * 2.5;
  const unpaidAmount = Math.round(unpaidMonths * monthlyFee * 100) / 100;
  return {
    id: generateId('O'),
    name,
    phone: genPhone(),
    building: buildings[i % buildings.length],
    room: genRoom(),
    area,
    ownerType: i % 5 === 0 ? '商铺' : '住宅',
    moveInDate: `202${1 + Math.floor(Math.random() * 4)}-${String(1 + Math.floor(Math.random() * 12)).padStart(2, '0')}-${String(1 + Math.floor(Math.random() * 28)).padStart(2, '0')}`,
    unpaidMonths,
    unpaidAmount,
    status: unpaidMonths === 0 ? 'normal' : unpaidMonths >= 6 ? 'serious' : 'arrears',
  };
});

const periods = ['2026-01', '2026-02', '2026-03', '2026-04', '2026-05', '2026-06'];

export const mockBills: Bill[] = mockOwners.flatMap((owner) => {
  const bills: Bill[] = [];
  const numBills = 2 + Math.floor(Math.random() * 3);
  const baseFee = owner.area * 2.5;
  for (let i = 0; i < numBills; i++) {
    const period = periods[periods.length - 1 - i];
    const propertyFee = Math.round(baseFee * 100) / 100;
    const waterFee = Math.round((20 + Math.random() * 80) * 100) / 100;
    const electricFee = Math.round((80 + Math.random() * 320) * 100) / 100;
    const otherFee = Math.floor(Math.random() * 3) === 0 ? Math.round(Math.random() * 200 * 100) / 100 : 0;
    const totalAmount = Math.round((propertyFee + waterFee + electricFee + otherFee) * 100) / 100;
    const paidRatio = owner.status === 'normal' ? 1 : owner.status === 'arrears' ? (Math.random() > 0.5 ? 0.5 : 0) : 0;
    const paidAmount = Math.round(totalAmount * paidRatio * 100) / 100;
    const status = paidAmount === 0 ? 'unpaid' : paidAmount >= totalAmount ? 'paid' : 'partial';
    bills.push({
      id: generateId('B'),
      ownerId: owner.id,
      ownerName: owner.name,
      building: owner.building,
      room: owner.room,
      period,
      propertyFee,
      waterFee,
      electricFee,
      otherFee,
      totalAmount,
      paidAmount,
      status,
      generateDate: `${period}-05`,
      dueDate: `${period}-28`,
      remark: i === 2 && otherFee > 0 ? '含电梯维护分摊费' : undefined,
    });
  }
  return bills;
});

const taskPriorities: Task['priority'][] = ['low', 'medium', 'medium', 'high', 'urgent'];
const taskTypes: Task['type'][] = ['sms', 'sms', 'call', 'call', 'visit'];
const taskStatuses: Task['status'][] = ['pending', 'pending', 'contacted', 'contacted', 'completed', 'completed', 'cancelled'];

export const mockTasks: Task[] = Array.from({ length: 35 }, (_, i) => {
  const owner = mockOwners[i % mockOwners.length];
  const type = taskTypes[i % taskTypes.length];
  const priority = taskPriorities[Math.floor(Math.random() * taskPriorities.length)];
  const status = taskStatuses[i % taskStatuses.length];
  const serviceStaff = staffNames.service;
  const assigneeName = status === 'pending' && Math.random() > 0.5 ? undefined : serviceStaff[Math.floor(Math.random() * serviceStaff.length)];
  const dueOffset = Math.floor(Math.random() * 10) - 3;
  const dueDate = new Date(2026, 5, 10 + dueOffset).toISOString().slice(0, 10);
  return {
    id: generateId('T'),
    ownerId: owner.id,
    ownerName: owner.name,
    ownerPhone: owner.phone,
    building: owner.building,
    room: owner.room,
    billId: mockBills[i % mockBills.length]?.id,
    assigneeId: assigneeName ? generateId('S') : undefined,
    assigneeName,
    type,
    priority,
    dueDate,
    status,
    unpaidAmount: owner.unpaidAmount || Math.round((500 + Math.random() * 5000) * 100) / 100,
    createDate: new Date(2026, 5, 5 + Math.floor(Math.random() * 5)).toISOString().slice(0, 10),
    remark: priority === 'urgent' ? '长期欠费，需重点跟进' : undefined,
  };
});

const notifyResults: Notification['result'][] = ['success', 'success', 'failed', 'pending', 'promised'];
const notifyContents: Record<Notification['result'], string[]> = {
  success: ['业主承诺本周末缴费', '已确认收到短信', '业主表示明天转账'],
  failed: ['电话无人接听', '业主挂断电话', '上门无人在家', '空号无法联系'],
  pending: ['正在处理中', '业主需要和家人商量'],
  promised: ['承诺月底前一次性缴清', '约定下周三到物业前台缴费'],
  void: ['账单已作废', '该账单已取消'],
  info: ['系统通知', '自动提醒消息'],
  adjusted: ['账单金额已调整', '费用已重新核算'],
};

export const mockNotifications: Notification[] = Array.from({ length: 50 }, (_, i) => {
  const owner = mockOwners[i % mockOwners.length];
  const method = ['sms', 'sms', 'sms', 'call', 'call', 'visit'][i % 6] as Notification['method'];
  const result = notifyResults[Math.floor(Math.random() * notifyResults.length)];
  const contents = notifyContents[result];
  const operatorName = [...staffNames.service, ...staffNames.finance][i % (staffNames.service.length + staffNames.finance.length)];
  const notifyDate = new Date(2026, 5, 1 + Math.floor(Math.random() * 9), 8 + Math.floor(Math.random() * 10), Math.floor(Math.random() * 60)).toISOString().slice(0, 16).replace('T', ' ');
  return {
    id: generateId('N'),
    taskId: mockTasks[i % mockTasks.length]?.id,
    ownerId: owner.id,
    ownerName: owner.name,
    method,
    notifyDate,
    result,
    operatorId: generateId('S'),
    operatorName,
    content: contents[Math.floor(Math.random() * contents.length)],
  };
});

const paymentMethods: Receipt['method'][] = ['wechat', 'wechat', 'alipay', 'bank', 'card', 'cash'];

export const mockReceipts: Receipt[] = Array.from({ length: 40 }, (_, i) => {
  const owner = mockOwners[i % mockOwners.length];
  const ownerBills = mockBills.filter((b) => b.ownerId === owner.id && b.status !== 'void');
  const unpaidBill = ownerBills.find((b) => b.status !== 'paid') || ownerBills[0];
  const billAmount = unpaidBill?.totalAmount || Math.round((500 + Math.random() * 3000) * 100) / 100;
  const fullPay = Math.random() > 0.25;
  const amount = fullPay ? billAmount : Math.round(billAmount * (0.3 + Math.random() * 0.4) * 100) / 100;
  const discount = Math.random() > 0.85 ? Math.round(Math.random() * 200 * 100) / 100 : 0;
  const method = paymentMethods[i % paymentMethods.length];
  const operatorName = staffNames.finance[i % staffNames.finance.length];
  const payDate = new Date(2026, 5, 1 + Math.floor(Math.random() * 9), 9 + Math.floor(Math.random() * 8), Math.floor(Math.random() * 60)).toISOString().slice(0, 16).replace('T', ' ');
  const totalBillAmount = Math.round((amount + discount) * 100) / 100;
  return {
    id: generateId('R'),
    ownerId: owner.id,
    ownerName: owner.name,
    building: owner.building,
    room: owner.room,
    billId: unpaidBill?.id,
    billIds: unpaidBill ? [unpaidBill.id] : undefined,
    allocations: unpaidBill ? [{
      billId: unpaidBill.id,
      period: unpaidBill.period,
      billTotal: unpaidBill.totalAmount,
      billUnpaid: unpaidBill.totalAmount - unpaidBill.paidAmount,
      allocated: amount,
      discount,
    }] : undefined,
    totalBillAmount,
    amount,
    discount,
    method,
    payDate,
    operatorId: generateId('S'),
    operatorName,
    remark: discount > 0 ? '老业主优惠减免' : fullPay ? undefined : '部分缴费，剩余下次缴清',
  };
});

export const mockStaffs: Staff[] = [
  { id: 'S001', name: '赵主管', role: 'manager', department: '物业部', phone: genPhone() },
  ...staffNames.finance.map((name, i) => ({
    id: `SF${String(i + 1).padStart(3, '0')}`,
    name,
    role: 'finance' as const,
    department: '财务部',
    phone: genPhone(),
  })),
  ...staffNames.service.map((name, i) => ({
    id: `SS${String(i + 1).padStart(3, '0')}`,
    name,
    role: 'service' as const,
    department: '客服部',
    phone: genPhone(),
  })),
];
