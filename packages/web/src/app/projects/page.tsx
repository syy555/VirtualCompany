'use client';

import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { fetchApi, fetchApiSafe } from '@/lib/api';

const PROJECT_STATUS: Record<string, string> = { active: '进行中', paused: '已暂停', completed: '已完成', archived: '已归档' };
const PROJECT_STATUS_COLOR: Record<string, string> = { active: '#81c784', paused: '#ffb74d', completed: '#4fc3f7', archived: '#bdbdbd' };
const TASK_STATUS: Record<string, string> = { backlog: '待办', active: '就绪', in_progress: '进行中', review: '审核中', done: '已完成', blocked: '阻塞' };
const TASK_STATUS_COLOR: Record<string, string> = { backlog: '#bdbdbd', active: '#4fc3f7', in_progress: '#ffb74d', review: '#ba68c8', done: '#81c784', blocked: '#e57373' };

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [projForm, setProjForm] = useState({ name: '', description: '' });
  const [taskForm, setTaskForm] = useState({ title: '', projectId: '', employeeId: '', description: '' });
  const [selected, setSelected] = useState<any | null>(null);
  const [projTasks, setProjTasks] = useState<any[]>([]);
  const [editingProject, setEditingProject] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', description: '', status: '' });

  const reload = useCallback(async () => {
    const [p, t, e] = await Promise.all([
      fetchApiSafe<any[]>('/api/projects', []),
      fetchApiSafe<any[]>('/api/tasks', []),
      fetchApiSafe<any[]>('/api/employees', []),
    ]);
    setProjects(p);
    setTasks(t);
    setEmployees(e);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const selectProject = (proj: any) => {
    setSelected(proj);
    setEditingProject(false);
    setProjTasks(tasks.filter(t => t.projectId === proj.id));
  };

  useEffect(() => {
    if (selected) setProjTasks(tasks.filter(t => t.projectId === selected.id));
  }, [tasks, selected]);

  const createProject = async () => {
    if (!projForm.name) return;
    try {
      const created = await fetchApi('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: `proj-${Date.now()}`, ...projForm }),
      });
      setProjects([...projects, created]);
      setProjForm({ name: '', description: '' });
      setError(null);
    } catch (err: any) {
      setError(`创建项目失败: ${err.message}`);
    }
  };

  const updateProject = async () => {
    if (!selected) return;
    try {
      const updated = await fetchApi(`/api/projects/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      setProjects(projects.map(p => p.id === selected.id ? updated : p));
      setSelected(updated);
      setEditingProject(false);
      setError(null);
    } catch (err: any) {
      setError(`更新项目失败: ${err.message}`);
    }
  };

  const deleteProject = async (id: string) => {
    try {
      await fetchApi(`/api/projects/${id}`, { method: 'DELETE' });
      setProjects(projects.filter(p => p.id !== id));
      if (selected?.id === id) setSelected(null);
      setError(null);
    } catch (err: any) {
      setError(`删除项目失败: ${err.message}`);
    }
  };

  const createTask = async () => {
    if (!taskForm.title || !taskForm.projectId) return;
    try {
      const created = await fetchApi('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: `task-${Date.now()}`, ...taskForm }),
      });
      setTasks([...tasks, created]);
      setTaskForm({ title: '', projectId: '', employeeId: '', description: '' });
      setError(null);
    } catch (err: any) {
      setError(`创建任务失败: ${err.message}`);
    }
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    try {
      const updated = await fetchApi(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      setTasks(tasks.map(t => t.id === taskId ? updated : t));
    } catch (err: any) {
      setError(`更新任务失败: ${err.message}`);
    }
  };

  const deleteTask = async (taskId: string) => {
    try {
      await fetchApi(`/api/tasks/${taskId}`, { method: 'DELETE' });
      setTasks(tasks.filter(t => t.id !== taskId));
    } catch (err: any) {
      setError(`删除任务失败: ${err.message}`);
    }
  };

  if (loading) return <Layout><div style={{ padding: 40 }}>加载中...</div></Layout>;

  return (
    <Layout>
      <h1 style={{ marginTop: 0 }}>项目与任务</h1>
      {error && <div style={{ padding: '12px 16px', marginBottom: 16, borderRadius: 8, background: '#fce4ec', color: '#c62828' }}>{error}</div>}

      {/* Create forms */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ marginTop: 0 }}>创建项目</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input value={projForm.name} onChange={e => setProjForm({ ...projForm, name: e.target.value })} placeholder="项目名称" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd' }} />
            <input value={projForm.description} onChange={e => setProjForm({ ...projForm, description: e.target.value })} placeholder="描述（可选）" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd' }} />
            <button onClick={createProject} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#4fc3f7', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>创建</button>
          </div>
        </div>
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ marginTop: 0 }}>创建任务</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input value={taskForm.title} onChange={e => setTaskForm({ ...taskForm, title: e.target.value })} placeholder="任务标题" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd' }} />
            <select value={taskForm.projectId} onChange={e => setTaskForm({ ...taskForm, projectId: e.target.value })} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd' }}>
              <option value="">选择项目</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <select value={taskForm.employeeId} onChange={e => setTaskForm({ ...taskForm, employeeId: e.target.value })} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd' }}>
              <option value="">分配员工（可选）</option>
              {employees.filter((e: any) => e.status === 'active').map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
            </select>
            <button onClick={createTask} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#81c784', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>创建任务</button>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        {/* Project list */}
        <div style={{ flex: 1, background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <h3 style={{ marginTop: 0 }}>项目列表</h3>
          {projects.length === 0 ? <div style={{ color: '#999' }}>暂无项目</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {projects.map(p => {
                const pTasks = tasks.filter(t => t.projectId === p.id);
                const done = pTasks.filter(t => t.status === 'done').length;
                return (
                  <div key={p.id} onClick={() => selectProject(p)} style={{ border: selected?.id === p.id ? '2px solid #4fc3f7' : '1px solid #eee', borderRadius: 8, padding: 16, cursor: 'pointer' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <strong>{p.name}</strong>
                      <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, background: PROJECT_STATUS_COLOR[p.status] || '#bdbdbd', color: '#fff' }}>{PROJECT_STATUS[p.status] || p.status}</span>
                    </div>
                    <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>{p.description || '无描述'}</div>
                    <div style={{ fontSize: 12, color: '#aaa', marginTop: 8 }}>
                      任务: {pTasks.length} 个 · 已完成: {done} · 创建于 {new Date(p.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ width: 420, background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <h3 style={{ margin: 0 }}>{selected.name}</h3>
              <div style={{ display: 'flex', gap: 4 }}>
                {!editingProject ? (
                  <button onClick={() => { setEditForm({ name: selected.name, description: selected.description || '', status: selected.status }); setEditingProject(true); }} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #4fc3f7', background: '#fff', color: '#4fc3f7', cursor: 'pointer', fontSize: 12 }}>编辑</button>
                ) : (
                  <>
                    <button onClick={updateProject} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: '#4fc3f7', color: '#fff', cursor: 'pointer', fontSize: 12 }}>保存</button>
                    <button onClick={() => setEditingProject(false)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 12 }}>取消</button>
                  </>
                )}
                <button onClick={() => { if (confirm('确定删除此项目？')) deleteProject(selected.id); }} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #e57373', background: '#fff', color: '#e57373', cursor: 'pointer', fontSize: 12 }}>删除</button>
              </div>
            </div>

            {editingProject ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} placeholder="项目名称" style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
                <input value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} placeholder="描述" style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
                <select value={editForm.status} onChange={e => setEditForm({ ...editForm, status: e.target.value })} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}>
                  {Object.entries(PROJECT_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
                <div>ID: <code>{selected.id}</code></div>
                <div>描述: {selected.description || '无'}</div>
                <div>状态: <span style={{ color: PROJECT_STATUS_COLOR[selected.status] }}>{PROJECT_STATUS[selected.status]}</span></div>
                <div>创建于: {new Date(selected.createdAt).toLocaleDateString()}</div>
              </div>
            )}

            {/* Project tasks */}
            <div style={{ borderTop: '1px solid #eee', paddingTop: 16 }}>
              <h4 style={{ margin: '0 0 12px' }}>任务 ({projTasks.length})</h4>
              {projTasks.length === 0 ? (
                <div style={{ fontSize: 13, color: '#999' }}>暂无任务</div>
              ) : (
                projTasks.map(t => (
                  <div key={t.id} style={{ padding: '10px 0', borderBottom: '1px solid #f5f5f5' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: 13 }}>{t.title}</div>
                        <div style={{ fontSize: 11, color: '#aaa' }}>{employees.find(e => e.id === t.employeeId)?.name || '未分配'}</div>
                      </div>
                      <div style={{ display: 'flex', gap: 4, alignItems: 'center' }}>
                        <select value={t.status} onChange={e => updateTaskStatus(t.id, e.target.value)} style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid #ddd', fontSize: 11, background: TASK_STATUS_COLOR[t.status], color: '#fff' }}>
                          {Object.entries(TASK_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                        <button onClick={() => deleteTask(t.id)} style={{ padding: '2px 6px', borderRadius: 4, border: '1px solid #e57373', background: '#fff', color: '#e57373', cursor: 'pointer', fontSize: 11 }}>×</button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
