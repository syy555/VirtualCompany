'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function PipelinesPage() {
  const [definitions, setDefinitions] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [runForm, setRunForm] = useState({ type: '', projectId: '', goal: '' });

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/pipelines/definitions`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/pipelines/runs`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/projects`).then(r => r.json()).catch(() => []),
    ]).then(([defs, r, p]) => {
      setDefinitions(defs);
      setRuns(r);
      setProjects(p);
      setLoading(false);
    });
  }, []);

  const startRun = async () => {
    if (!runForm.type || !runForm.projectId || !runForm.goal) return;
    const res = await fetch(`${API}/api/pipelines/runs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(runForm),
    });
    if (res.ok) {
      const created = await res.json();
      setRuns([created, ...runs]);
      setRunForm({ type: '', projectId: '', goal: '' });
    }
  };

  const approve = async (id: string) => {
    await fetch(`${API}/api/pipelines/runs/${id}/approve`, { method: 'POST' });
    setRuns(runs.map(r => r.id === id ? { ...r, status: 'running' } : r));
  };

  if (loading) return <Layout><div style={{ padding: 40 }}>加载中...</div></Layout>;

  return (
    <Layout>
      <h1 style={{ marginTop: 0 }}>流水线</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 32 }}>
        {definitions.map(d => (
          <div key={d.name} style={{ background: '#fff', borderRadius: 12, padding: 20, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <strong>{d.name}</strong>
            <div style={{ color: '#888', fontSize: 13, marginTop: 4 }}>{d.description}</div>
            <div style={{ marginTop: 8, fontSize: 12, color: '#aaa' }}>{d.stages?.length || 0} 个阶段</div>
          </div>
        ))}
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 style={{ marginTop: 0 }}>启动流水线</h3>
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
          <select value={runForm.type} onChange={e => setRunForm({ ...runForm, type: e.target.value })} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', minWidth: 160 }}>
            <option value="">选择流水线</option>
            {definitions.map(d => <option key={d.name} value={d.name}>{d.name} — {d.description}</option>)}
          </select>
          <select value={runForm.projectId} onChange={e => setRunForm({ ...runForm, projectId: e.target.value })} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', minWidth: 160 }}>
            <option value="">选择项目</option>
            {projects.filter((p: any) => p.status === 'active').map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
          </select>
          <input value={runForm.goal} onChange={e => setRunForm({ ...runForm, goal: e.target.value })} placeholder="目标描述" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', flex: 1, minWidth: 200 }} />
          <button onClick={startRun} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#4fc3f7', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>启动</button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 style={{ marginTop: 0 }}>运行记录</h3>
        {runs.length === 0 ? <div style={{ color: '#999' }}>暂无运行记录</div> : (
          runs.map(run => (
            <div key={run.id} style={{ border: '1px solid #eee', borderRadius: 8, padding: 16, marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{run.type}</strong> — {run.goal}
                  <div style={{ color: '#888', fontSize: 12, marginTop: 4 }}>ID: {run.id} | {new Date(run.startedAt).toLocaleString()}</div>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <StatusBadge status={run.status} />
                  {run.status === 'paused' && (
                    <button onClick={() => approve(run.id)} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: '#81c784', color: '#fff', cursor: 'pointer', fontSize: 12 }}>批准</button>
                  )}
                </div>
              </div>
              {run.stages && run.stages.length > 0 && (
                <div style={{ display: 'flex', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                  {run.stages.map((s: any, i: number) => (
                    <span key={i} style={{ padding: '4px 10px', borderRadius: 6, fontSize: 12, background: stageBg(s.status), color: '#fff' }}>
                      {s.name}: {s.status}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </Layout>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = { running: '#4fc3f7', completed: '#81c784', failed: '#e57373', paused: '#ffb74d', pending: '#bdbdbd' };
  return <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, background: colors[status] || '#bdbdbd', color: '#fff' }}>{status}</span>;
}

function stageBg(status: string) {
  const c: Record<string, string> = { pending: '#bdbdbd', running: '#4fc3f7', completed: '#81c784', failed: '#e57373', skipped: '#e0e0e0' };
  return c[status] || '#bdbdbd';
}
