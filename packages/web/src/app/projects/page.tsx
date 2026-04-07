'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function ProjectsPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [projForm, setProjForm] = useState({ name: '', description: '' });
  const [taskForm, setTaskForm] = useState({ title: '', projectId: '', employeeId: '', description: '' });

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/projects`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/tasks`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/employees`).then(r => r.json()).catch(() => []),
    ]).then(([p, t, e]) => {
      setProjects(p);
      setTasks(t);
      setEmployees(e);
      setLoading(false);
    });
  }, []);

  const createProject = async () => {
    if (!projForm.name) return;
    const id = `proj-${Date.now()}`;
    const res = await fetch(`${API}/api/projects`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...projForm }),
    });
    if (res.ok) {
      const created = await res.json();
      setProjects([...projects, created]);
      setProjForm({ name: '', description: '' });
    }
  };

  const createTask = async () => {
    if (!taskForm.title || !taskForm.projectId) return;
    const id = `task-${Date.now()}`;
    const res = await fetch(`${API}/api/tasks`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...taskForm }),
    });
    if (res.ok) {
      const created = await res.json();
      setTasks([...tasks, created]);
      setTaskForm({ title: '', projectId: '', employeeId: '', description: '' });
    }
  };

  if (loading) return <Layout><div style={{ padding: 40 }}>加载中...</div></Layout>;

  return (
    <Layout>
      <h1 style={{ marginTop: 0 }}>项目与任务</h1>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 32 }}>
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

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', marginBottom: 24 }}>
        <h3 style={{ marginTop: 0 }}>项目列表</h3>
        {projects.length === 0 ? <div style={{ color: '#999' }}>暂无项目</div> : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 16 }}>
            {projects.map(p => (
              <div key={p.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 16 }}>
                <strong>{p.name}</strong>
                <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>{p.description || '无描述'}</div>
                <div style={{ marginTop: 8 }}>
                  <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, background: p.status === 'active' ? '#81c784' : '#bdbdbd', color: '#fff' }}>{p.status}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 style={{ marginTop: 0 }}>任务列表</h3>
        {tasks.length === 0 ? <div style={{ color: '#999' }}>暂无任务</div> : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee' }}>
                {['标题', '项目', '负责人', '状态'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 8px', color: '#888', fontWeight: 600, fontSize: 13 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tasks.map(t => (
                <tr key={t.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '12px 8px' }}>{t.title}</td>
                  <td style={{ padding: '12px 8px' }}>{projects.find(p => p.id === t.projectId)?.name || t.projectId}</td>
                  <td style={{ padding: '12px 8px' }}>{employees.find(e => e.id === t.employeeId)?.name || '未分配'}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, background: statusColor(t.status), color: '#fff' }}>{t.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </Layout>
  );
}

function statusColor(status: string) {
  const c: Record<string, string> = { backlog: '#bdbdbd', active: '#4fc3f7', in_progress: '#ffb74d', review: '#ba68c8', done: '#81c784', blocked: '#e57373' };
  return c[status] || '#bdbdbd';
}
