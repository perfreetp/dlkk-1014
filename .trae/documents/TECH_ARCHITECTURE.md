## 1. 架构设计

```mermaid
graph TD
    subgraph "前端层"
        A["React 18 + TypeScript"]
        B["React Router DOM 路由"]
        C["Zustand 状态管理"]
        D["Tailwind CSS 样式"]
        E["Lucide React 图标"]
        F["Recharts 图表库"]
    end

    subgraph "数据层"
        G["Mock 数据模块"]
        H["TypeScript 类型定义"]
        I["工具函数库"]
    end

    subgraph "组件层"
        J["布局组件（导航栏/侧栏）"]
        K["通用 UI 组件（表格/卡片/模态框）"]
        L["业务组件（筛选器/状态标签）"]
    end

    subgraph "页面层"
        M["仪表盘页面"]
        N["业主列表页面"]
        O["账单管理页面"]
        P["催缴任务页面"]
        Q["通知记录页面"]
        R["收款登记页面"]
        S["统计报表页面"]
    end

    A --> B
    A --> C
    A --> D
    A --> E
    A --> F
    G --> H
    G --> I
    J --> K
    J --> L
    M --> J
    N --> J
    O --> J
    P --> J
    Q --> J
    R --> J
    S --> J
    K --> G
    L --> G
```

## 2. 技术说明

- **前端框架**：React@18 + TypeScript@5
- **构建工具**：Vite@5
- **路由管理**：react-router-dom@6
- **样式方案**：tailwindcss@3
- **状态管理**：zustand@4
- **图表库**：recharts@2
- **图标库**：lucide-react@latest
- **日期处理**：date-fns@3（轻量级日期工具）
- **后端**：无后端，使用 Mock 数据模拟业务逻辑
- **数据持久化**：localStorage 模拟数据持久化

## 3. 路由定义

| 路由路径 | 页面名称 | 说明 |
|---------|---------|------|
| `/` | 仪表盘 | 系统首页，数据概览 |
| `/owners` | 业主列表 | 业主信息管理 |
| `/bills` | 账单管理 | 费用生成与管理 |
| `/tasks` | 催缴任务 | 任务分配与跟进 |
| `/notifications` | 通知记录 | 催缴历史记录 |
| `/receipts` | 收款登记 | 收款录入与查询 |
| `/reports` | 统计报表 | 多维度数据报表 |

## 4. 数据模型

### 4.1 实体关系图

```mermaid
erDiagram
    OWNER ||--o{ BILL : "拥有"
    OWNER ||--o{ TASK : "关联"
    OWNER ||--o{ RECEIPT : "产生"
    TASK ||--o{ NOTIFICATION : "生成"
    BILL ||--o{ RECEIPT : "对应"
    STAFF ||--o{ TASK : "负责"

    OWNER {
        string id "业主ID"
        string name "业主姓名"
        string phone "联系电话"
        string building "楼栋号"
        string room "房号"
        number area "建筑面积"
        string ownerType "业主类型"
        date moveInDate "入住日期"
    }

    BILL {
        string id "账单ID"
        string ownerId "业主ID"
        string period "账期"
        number propertyFee "物业费"
        number waterFee "水费"
        number electricFee "电费"
        number totalAmount "总金额"
        string status "状态"
        date generateDate "生成日期"
        string remark "备注"
    }

    TASK {
        string id "任务ID"
        string ownerId "业主ID"
        string billId "账单ID"
        string assigneeId "负责人ID"
        string type "催缴类型"
        string priority "优先级"
        date dueDate "截止日期"
        string status "状态"
        string remark "备注"
    }

    NOTIFICATION {
        string id "记录ID"
        string taskId "任务ID"
        string method "通知方式"
        date notifyDate "通知时间"
        string result "通知结果"
        string operatorId "操作人ID"
        string content "沟通内容"
    }

    RECEIPT {
        string id "收款ID"
        string ownerId "业主ID"
        string billId "账单ID"
        number amount "收款金额"
        number discount "减免金额"
        string method "支付方式"
        date payDate "收款日期"
        string operatorId "操作人ID"
        string remark "备注"
    }

    STAFF {
        string id "员工ID"
        string name "姓名"
        string role "角色"
        string department "部门"
        string phone "电话"
    }
```

### 4.2 TypeScript 类型定义

```typescript
// 业主信息
interface Owner {
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

// 账单信息
interface Bill {
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
  status: 'unpaid' | 'partial' | 'paid' | 'void';
  generateDate: string;
  dueDate: string;
  remark?: string;
}

// 催缴任务
interface Task {
  id: string;
  ownerId: string;
  ownerName: string;
  ownerPhone: string;
  building: string;
  room: string;
  billId?: string;
  assigneeId?: string;
  assigneeName?: string;
  type: 'sms' | 'call' | 'visit';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  unpaidAmount: number;
  createDate: string;
  remark?: string;
}

// 通知记录
interface Notification {
  id: string;
  taskId?: string;
  ownerId: string;
  ownerName: string;
  method: 'sms' | 'call' | 'visit';
  notifyDate: string;
  result: 'success' | 'failed' | 'pending' | 'promised';
  operatorId: string;
  operatorName: string;
  content: string;
}

// 收款记录
interface Receipt {
  id: string;
  ownerId: string;
  ownerName: string;
  building: string;
  room: string;
  billId?: string;
  amount: number;
  discount: number;
  method: 'cash' | 'wechat' | 'alipay' | 'bank' | 'card';
  payDate: string;
  operatorId: string;
  operatorName: string;
  remark?: string;
}

// 员工信息
interface Staff {
  id: string;
  name: string;
  role: 'finance' | 'service' | 'manager';
  department: string;
  phone: string;
}
```

## 5. 项目目录结构

```
c:\TraeProjects\1014
├── .trae/
│   └── documents/
│       ├── PRD.md
│       └── TECH_ARCHITECTURE.md
├── src/
│   ├── components/          # 通用组件
│   │   ├── layout/         # 布局组件
│   │   │   ├── Sidebar.tsx
│   │   │   ├── Topbar.tsx
│   │   │   └── Layout.tsx
│   │   ├── ui/           # UI基础组件
│   │   │   ├── Card.tsx
│   │   │   ├── Button.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Drawer.tsx
│   │   │   ├── StatusBadge.tsx
│   │   │   ├── SearchFilter.tsx
│   │   │   └── StatCard.tsx
│   │   └── business/     # 业务组件
│   │       ├── OwnerDetail.tsx
│   │       ├── BillActions.tsx
│   │       └── TaskCard.tsx
│   ├── pages/             # 页面组件
│   │   ├── Dashboard.tsx
│   │   ├── Owners.tsx
│   │   ├── Bills.tsx
│   │   ├── Tasks.tsx
│   │   ├── Notifications.tsx
│   │   ├── Receipts.tsx
│   │   └── Reports.tsx
│   ├── store/             # 状态管理
│   │   └── index.ts
│   ├── data/              # Mock数据
│   │   ├── mockData.ts
│   │   └── initialData.ts
│   ├── types/             # 类型定义
│   │   └── index.ts
│   ├── utils/             # 工具函数
│   │   ├── format.ts
│   │   └── helpers.ts
│   ├── App.tsx
│   ├── main.tsx
│   └── index.css
├── index.html
├── package.json
├── vite.config.ts
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
└── README.md
```

## 6. 状态管理设计

使用 Zustand 创建单一 Store，包含以下状态切片：

```typescript
interface AppStore {
  // 业主相关
  owners: Owner[];
  selectedOwner: Owner | null;
  setSelectedOwner: (owner: Owner | null) => void;

  // 账单相关
  bills: Bill[];
  addBill: (bill: Bill) => void;
  updateBill: (id: string, data: Partial<Bill>) => void;
  voidBill: (id: string, reason: string) => void;

  // 任务相关
  tasks: Task[];
  addTask: (task: Task) => void;
  assignTask: (id: string, assigneeId: string, dueDate: string) => void;
  updateTaskStatus: (id: string, status: Task['status']) => void;

  // 通知相关
  notifications: Notification[];
  addNotification: (notification: Notification) => void;

  // 收款相关
  receipts: Receipt[];
  addReceipt: (receipt: Receipt) => void;

  // 员工相关
  staffs: Staff[];

  // 筛选状态
  filters: {
    building?: string;
    keyword?: string;
    status?: string;
  };
  setFilters: (filters: Partial<AppStore['filters']>) => void;
}
```
