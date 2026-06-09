import { useState, useMemo } from 'react';
import { Plus, UserCheck, Calendar, Search, Filter, MoreHorizontal, MessageSquare, CheckCircle2, XCircle, Send } from 'lucide-react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { TaskTypeBadge, TaskPriorityBadge, TaskStatusBadge, NotifyMethodBadge, NotifyResultBadge } from '@/components/ui/StatusBadge';
import { useAppStore, useFilteredTasks } from '@/store';
import type { Task, TaskPriority, TaskStatus, TaskType, NotificationResult } from '@/types';
import { formatCurrency, formatDate, todayStr } from '@/utils/format';
import { cn } from '@/utils/helpers';

const priorityOptions: { value: '' | TaskPriority; label: string }[] = [
  { value: '', label: '全部优先级' },
  { value: 'urgent', label: '紧急' },
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' },
];

const statusColors: Record<TaskStatus, string> = {
  pending: 'border-l-slate-400',
  in_progress: 'border-l-blue-500',
  completed: 'border-l-success-500',
  cancelled: 'border-l-slate-300',
};

export const Tasks = () => {
  const tasks = useFilteredTasks();
  const staffs = useAppStore((s) => s.staffs);
  const owners = useAppStore((s) => s.owners);
  const { taskFilters, setTaskFilters, resetTaskFilters, assignTask, updateTaskStatus, addTask, addNotification, updateTask } = useAppStore();
  const serviceStaff = staffs.filter((s) => s.role === 'service');

  const [view, setView] = useState<'board' | 'list'>('board');
  const [assignOpen, setAssignOpen] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [searchInput, setSearchInput] = useState(taskFilters.keyword || '');
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const [assignForm, setAssignForm] = useState({ assigneeId: '', assigneeName: '', dueDate: todayStr(), remark: '' });
  const [notifForm, setNotifForm] = useState({ method: 'call' as Task['type'], result: 'success' as NotificationResult, content: '' });
  const [createForm, setCreateForm] = useState({
    ownerId: '', type: 'call' as TaskType, priority: 'medium' as TaskPriority,
    dueDate: todayStr(), remark: '',
  });

  const selectedTask = useMemo(() => tasks.find((t) => t.id === selectedTaskId), [tasks, selectedTaskId]);
  const selectedOwner = useMemo(() => selectedTask ? owners.find((o) => o.id === selectedTask.ownerId) : null, [owners, selectedTask]);

  const openAssign = (t: Task) => {
    setSelectedTaskId(t.id);
    setAssignForm({ assigneeId: t.assigneeId || '', assigneeName: t.assigneeName || '', dueDate: t.dueDate, remark: '' });
    setAssignOpen(true);
  };

  const openNotif = (t: Task) => {
    setSelectedTaskId(t.id);
    setNotifForm({ method: t.type, result: 'success', content: '' });
    setNotifOpen(true);
  };

  const handleAssign = () => {
    if (!selectedTaskId || !assignForm.assigneeId) return;
    assignTask(selectedTaskId, assignForm.assigneeId, assignForm.assigneeName, assignForm.dueDate);
    setAssignOpen(false);
  };

  const handleNotif = () => {
    if (!selectedTask || !notifForm.content.trim()) return;
    addNotification({
      taskId: selectedTask.id,
      ownerId: selectedTask.ownerId,
      ownerName: selectedTask.ownerName,
      method: notifForm.method,
      result: notifForm.result,
      operatorId: staffs[0].id,
      operatorName: '赵主管',
      content: notifForm.content,
    });
    if (notifForm.result === 'success') {
      updateTaskStatus(selectedTask.id, 'completed');
    } else if (notifForm.result === 'promised') {
      updateTask(selectedTask.id, { status: 'in_progress' });
    }
    setNotifOpen(false);
  };

  const handleCreate = () => {
    const owner = owners.find((o) => o.id === createForm.ownerId);
    if (!owner) return;
    addTask({
      ownerId: owner.id,
      ownerName: owner.name,
      ownerPhone: owner.phone,
      building: owner.building,
      room: owner.room,
      type: createForm.type,
      priority: createForm.priority,
      dueDate: createForm.dueDate,
      unpaidAmount: owner.unpaidAmount,
      status: 'pending',
      remark: createForm.remark || undefined,
    });
    setCreateOpen(false);
  };

  const boardGroups: TaskStatus[] = ['pending', 'in_progress', 'completed', 'cancelled'];
  const boardLabels: Record<TaskStatus, string> = {
    pending: '待处理',
    in_progress: '处理中',
    completed: '已完成',
    cancelled: '已取消',
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {boardGroups.map((s) => (
          <Card key={s} className="p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">{boardLabels[s]}</p>
              <TaskStatusBadge status={s} />
            </div>
            <p className="mt-2 text-2xl font-bold text-slate-900 font-serif tabular-nums">
              {tasks.filter((t) => t.status === s).length}
            </p>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader
          title={
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  value={searchInput}
                  onChange={(e) => {
                    setSearchInput(e.target.value);
                    setTaskFilters({ keyword: e.target.value || undefined });
                  }}
                  placeholder="搜索业主 / 负责人 / 房号"
                  className="w-64 h-10 pl-9 pr-4 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30"
                />
              </div>
              <Button
                variant={showFilters ? 'primary' : 'outline'}
                size="sm"
                icon={<Filter className="w-4 h-4" />}
                onClick={() => setShowFilters((v) => !v)}
              >
                筛选
              </Button>
              <Button
                variant={view === 'board' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setView('board')}
              >
                看板视图
              </Button>
              <Button
                variant={view === 'list' ? 'primary' : 'outline'}
                size="sm"
                onClick={() => setView('list')}
              >
                列表视图
              </Button>
            </div>
          }
          subtitle={`共 ${tasks.length} 个任务`}
          action={<Button icon={<Plus className="w-4 h-4" />} onClick={() => setCreateOpen(true)}>新建任务</Button>}
        />

        {showFilters && (
          <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/50 grid grid-cols-1 md:grid-cols-4 gap-3 animate-fade-in">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">负责人</label>
              <select
                value={taskFilters.assigneeId || ''}
                onChange={(e) => setTaskFilters({ assigneeId: e.target.value || undefined })}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400/30"
              >
                <option value="">全部负责人</option>
                {serviceStaff.map((s) => (<option key={s.id} value={s.id}>{s.name}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">任务状态</label>
              <select
                value={taskFilters.status || ''}
                onChange={(e) => setTaskFilters({ status: (e.target.value as any) || undefined })}
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400/30"
              >
                <option value="">全部状态</option>
                {boardGroups.map((s) => (<option key={s} value={s}>{boardLabels[s]}</option>))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">优先级</label>
              <select
                className="w-full h-9 px-3 rounded-lg border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-400/30"
              >
                {priorityOptions.map((o) => (<option key={o.value} value={o.value}>{o.label}</option>))}
              </select>
            </div>
            <div className="flex items-end gap-2">
              <Button variant="outline" size="sm" onClick={resetTaskFilters}>重置</Button>
            </div>
          </div>
        )}

        <CardBody className="p-5">
          {view === 'board' ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
              {boardGroups.map((status, si) => (
                <div key={status} className="rounded-xl bg-slate-50/80 border border-slate-100 p-3 min-h-[400px] animate-fade-in-stagger" style={{ animationDelay: `${si * 60}ms` }}>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-semibold text-slate-700">{boardLabels[status]}</h4>
                      <span className="px-1.5 py-0.5 rounded-md bg-white text-xs font-medium text-slate-500 shadow-sm">
                        {tasks.filter((t) => t.status === status).length}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-3">
                    {tasks.filter((t) => t.status === status).map((t, i) => (
                      <div
                        key={t.id}
                        className={cn(
                          'p-3.5 rounded-xl bg-white shadow-card border border-slate-100 border-l-4 transition-all hover:shadow-card-hover hover:-translate-y-0.5 cursor-pointer animate-fade-in-stagger',
                          statusColors[status]
                        )}
                        style={{ animationDelay: `${i * 30}ms` }}
                      >
                        <div className="flex items-start justify-between gap-2 mb-2.5">
                          <TaskTypeBadge type={t.type} />
                          <TaskPriorityBadge priority={t.priority} />
                        </div>
                        <div className="mb-2">
                          <p className="font-semibold text-slate-900">{t.ownerName}</p>
                          <p className="text-xs text-slate-500 mt-0.5">{t.building} {t.room}</p>
                        </div>
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-xs text-slate-500">欠费金额</p>
                          <p className="text-sm font-bold text-danger-500 tabular-nums">{formatCurrency(t.unpaidAmount)}</p>
                        </div>
                        <div className="pt-3 border-t border-slate-100 space-y-2">
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <Calendar className="w-3.5 h-3.5 text-slate-400" />
                            <span>截止：{formatDate(t.dueDate, 'MM-dd')}</span>
                          </div>
                          <div className="flex items-center gap-1.5 text-xs text-slate-600">
                            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
                            <span>{t.assigneeName || '未分配'}</span>
                          </div>
                        </div>
                        <div className="mt-3 flex gap-1 pt-2 border-t border-slate-50">
                          {t.status !== 'completed' && t.status !== 'cancelled' && (
                            <>
                              <Button size="sm" variant="ghost" className="flex-1 text-xs" icon={<UserCheck className="w-3.5 h-3.5" />} onClick={() => openAssign(t)}>
                                {t.assigneeId ? '改派' : '分配'}
                              </Button>
                              <Button size="sm" variant="ghost" className="flex-1 text-xs text-success-700" icon={<Send className="w-3.5 h-3.5" />} onClick={() => openNotif(t)}>
                                催缴
                              </Button>
                            </>
                          )}
                        </div>
                      </div>
                    ))}
                    {tasks.filter((t) => t.status === status).length === 0 && (
                      <div className="py-10 text-center text-xs text-slate-400">暂无任务</div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="overflow-x-auto -mx-5 -my-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50/80 border-b border-slate-100 text-left text-xs font-semibold text-slate-600 uppercase">
                    <th className="px-5 py-3">业主</th>
                    <th className="px-5 py-3">类型</th>
                    <th className="px-5 py-3">优先级</th>
                    <th className="px-5 py-3 text-right">欠费金额</th>
                    <th className="px-5 py-3">负责人</th>
                    <th className="px-5 py-3">截止日期</th>
                    <th className="px-5 py-3">状态</th>
                    <th className="px-5 py-3 text-right">操作</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t, i) => (
                    <tr key={t.id} className="border-b border-slate-50 hover:bg-primary-50/40 transition-colors animate-fade-in-stagger" style={{ animationDelay: `${i * 20}ms` }}>
                      <td className="px-5 py-3.5">
                        <p className="font-medium text-slate-900">{t.ownerName}</p>
                        <p className="text-xs text-slate-500">{t.building} {t.room}</p>
                      </td>
                      <td className="px-5 py-3.5"><TaskTypeBadge type={t.type} /></td>
                      <td className="px-5 py-3.5"><TaskPriorityBadge priority={t.priority} /></td>
                      <td className="px-5 py-3.5 text-right font-bold text-danger-500 tabular-nums">{formatCurrency(t.unpaidAmount)}</td>
                      <td className="px-5 py-3.5 text-slate-700">{t.assigneeName || '—'}</td>
                      <td className="px-5 py-3.5 text-slate-600">{formatDate(t.dueDate)}</td>
                      <td className="px-5 py-3.5"><TaskStatusBadge status={t.status} /></td>
                      <td className="px-5 py-3.5 text-right space-x-1">
                        <Button size="sm" variant="ghost" icon={<UserCheck className="w-3.5 h-3.5" />} onClick={() => openAssign(t)}>分配</Button>
                        <Button size="sm" variant="ghost" icon={<Send className="w-3.5 h-3.5" />} onClick={() => openNotif(t)}>催缴</Button>
                        {t.status !== 'completed' && (
                          <Button size="sm" variant="ghost" className="text-success-700" icon={<CheckCircle2 className="w-3.5 h-3.5" />} onClick={() => updateTaskStatus(t.id, 'completed')}>完成</Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>

      <Modal
        open={assignOpen}
        title="分配催缴任务"
        subtitle={selectedTask ? `${selectedTask.ownerName} · ${formatCurrency(selectedTask.unpaidAmount)}` : ''}
        onClose={() => setAssignOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setAssignOpen(false)}>取消</Button>
            <Button onClick={handleAssign} disabled={!assignForm.assigneeId}>确认分配</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">选择客服人员</label>
            <div className="grid grid-cols-2 gap-2">
              {serviceStaff.map((s) => (
                <label
                  key={s.id}
                  className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
                    assignForm.assigneeId === s.id
                      ? 'border-primary-500 bg-primary-50 ring-1 ring-primary-200'
                      : 'border-slate-200 hover:border-slate-300'
                  )}
                >
                  <input
                    type="radio"
                    checked={assignForm.assigneeId === s.id}
                    onChange={() => setAssignForm({ ...assignForm, assigneeId: s.id, assigneeName: s.name })}
                    className="text-primary-600"
                  />
                  <div>
                    <p className="text-sm font-medium text-slate-900">{s.name}</p>
                    <p className="text-xs text-slate-500">{s.department}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">跟进截止日期</label>
            <input
              type="date"
              value={assignForm.dueDate}
              onChange={(e) => setAssignForm({ ...assignForm, dueDate: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">任务备注</label>
            <textarea
              value={assignForm.remark}
              onChange={(e) => setAssignForm({ ...assignForm, remark: e.target.value })}
              rows={2}
              placeholder="补充说明或特殊要求"
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30 resize-none"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={notifOpen}
        title="记录催缴情况"
        subtitle={selectedTask ? `${selectedTask.ownerName} · ${selectedTask.building} ${selectedTask.room}` : ''}
        onClose={() => setNotifOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setNotifOpen(false)}>取消</Button>
            <Button onClick={handleNotif} disabled={!notifForm.content.trim()}>提交记录</Button>
          </>
        }
      >
        <div className="space-y-4">
          {selectedOwner && (
            <div className="p-4 rounded-xl bg-gradient-to-br from-primary-50 to-white border border-primary-100">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">联系电话</p>
                  <p className="text-base font-bold text-slate-900 mt-0.5 font-mono">{selectedOwner.phone}</p>
                </div>
                <p className="text-xs text-danger-500 font-semibold">欠费 {formatCurrency(selectedOwner.unpaidAmount)}</p>
              </div>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">催缴方式</label>
              <div className="flex gap-2">
                {(['sms', 'call', 'visit'] as TaskType[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setNotifForm({ ...notifForm, method: m })}
                    className={cn(
                      'flex-1 h-10 rounded-lg border text-sm font-medium transition-all',
                      notifForm.method === m
                        ? 'border-primary-500 bg-primary-50 text-primary-800'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {m === 'sms' ? '短信' : m === 'call' ? '电话' : '上门'}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">催缴结果</label>
              <select
                value={notifForm.result}
                onChange={(e) => setNotifForm({ ...notifForm, result: e.target.value as any })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30"
              >
                <option value="success">催缴成功</option>
                <option value="promised">已承诺缴费</option>
                <option value="pending">待继续跟进</option>
                <option value="failed">无法联系</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">沟通内容 <span className="text-danger-500">*</span></label>
            <textarea
              value={notifForm.content}
              onChange={(e) => setNotifForm({ ...notifForm, content: e.target.value })}
              rows={4}
              placeholder="记录与业主的沟通内容，如：业主表示本周五前转账..."
              className="w-full px-3 py-2 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30 resize-none"
            />
          </div>
        </div>
      </Modal>

      <Modal
        open={createOpen}
        title="新建催缴任务"
        subtitle="手动为欠费业主创建催缴任务"
        onClose={() => setCreateOpen(false)}
        footer={
          <>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>取消</Button>
            <Button onClick={handleCreate} disabled={!createForm.ownerId}>创建任务</Button>
          </>
        }
      >
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">选择业主</label>
            <select
              value={createForm.ownerId}
              onChange={(e) => setCreateForm({ ...createForm, ownerId: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30"
            >
              <option value="">请选择欠费业主</option>
              {owners.filter((o) => o.status !== 'normal').map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name} - {o.building} {o.room} - 欠费{formatCurrency(o.unpaidAmount)}
                </option>
              ))}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">催缴方式</label>
              <select
                value={createForm.type}
                onChange={(e) => setCreateForm({ ...createForm, type: e.target.value as any })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30"
              >
                <option value="sms">短信催缴</option>
                <option value="call">电话催缴</option>
                <option value="visit">上门催缴</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">优先级</label>
              <select
                value={createForm.priority}
                onChange={(e) => setCreateForm({ ...createForm, priority: e.target.value as any })}
                className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30"
              >
                <option value="low">低</option>
                <option value="medium">中</option>
                <option value="high">高</option>
                <option value="urgent">紧急</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1.5">完成截止日期</label>
            <input
              type="date"
              value={createForm.dueDate}
              onChange={(e) => setCreateForm({ ...createForm, dueDate: e.target.value })}
              className="w-full h-10 px-3 rounded-lg border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-primary-400/30"
            />
          </div>
        </div>
      </Modal>
    </div>
  );
};
