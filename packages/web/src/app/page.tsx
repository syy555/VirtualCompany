'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { fetchApiSafe } from '@/lib/api';

export default function DashboardPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [runs, setRuns] = useState<any[]>([]);
  const [channels, setChannels] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetchApiSafe<any[]>('/api/employees', []),
      fetchApiSafe<any[]>('/api/projects', []),
      fetchApiSafe<any[]>('/api/pipelines/runs', []),
      fetchApiSafe<any[]>('/api/channels', []),
    ]).then(([emp, proj, r, ch]) => {
      setEmployees(emp);
      setProjects(proj);
      setRuns(r);
      setChannels(ch);
      setLoading(false);
      if ([emp, proj, r, ch].every(arr => arr.length === 0)) {
        setError('无法连接到服务器，请确认 API 服务已启动');
      }
    });
  }, []);

  if (loading) return <Layout><div style={{ padding: 40 }}>加载中...</div></Layout>;
  if (error) return <Layout><div style={{ padding: 40, color: '#e57373' }}>{error}</div></Layout>;

  const activeEmployees = employees.filter((e: any) => e.status === 'active');
  const activeProjects = projects.filter((p: any) => p.status === 'active');
  const runningPipelines = runs.filter((r: any) => r.status === 'running');

  return (
    <Layout>
      <h1 style={{ marginTop: 0, marginBottom: 32 }}>Dashboard</h1>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20, marginBottom: 40 }}>
        <StatCard title="在职员工" value={activeEmployees.length} icon="👥" color="#4fc3f7" />
        <StatCard title="活跃项目" value={activeProjects.length} icon="📁" color="#81c784" />
        <StatCard title="运行中流水线" value={runningPipelines.length} icon="🔄" color="#ffb74d" />
        <StatCard title="频道" value={channels.length} icon="💬" color="#e57373" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <Card title="最近员工">
          {activeEmployees.length === 0 ? <Empty /> : activeEmployees.slice(0, 5).map((e: any) => (
            <div key={e.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
              <strong>{e.name}</strong> <span style={{ color: '#888', fontSize: 13 }}>({e.role})</span>
            </div>
          ))}
        </Card>

        <Card title="最近项目">
          {activeProjects.length === 0 ? <Empty /> : activeProjects.slice(0, 5).map((p: any) => (
            <div key={p.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee' }}>
              <strong>{p.name}</strong> <span style={{ color: '#888', fontSize: 13 }}>— {p.status}</span>
            </div>
          ))}
        </Card>

        <Card title="流水线运行记录" style={{ gridColumn: '1 / -1' }}>
          {runs.length === 0 ? <Empty /> : runs.slice(0, 10).map((r: any) => (
            <div key={r.id} style={{ padding: '8px 0', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between' }}>
              <span><strong>{r.type}</strong> — {r.goal}</span>
              <StatusBadge status={r.status} />
            </div>
          ))}
        </Card>
      </div>
    </Layout>
  );
}

function StatCard({ title, value, icon, color }: { title: string; value: number; icon: string; color: string }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <div style={{ fontSize: 28, marginBottom: 8 }}>{icon}</div>
      <div style={{ fontSize: 32, fontWeight: 700, color }}>{value}</div>
      <div style={{ color: '#888', marginTop: 4 }}>{title}</div>
    </div>
  );
}

function Card({ title, children, style }: { title: string; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', ...style }}>
      <h3 style={{ marginTop: 0, marginBottom: 16 }}>{title}</h3>
      {children}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    running: '#4fc3f7',
    completed: '#81c784',
    failed: '#e57373',
    paused: '#ffb74d',
    pending: '#bdbdbd',
  };
  return (
    <span style={{
      padding: '2px 10px',
      borderRadius: 12,
      fontSize: 12,
      background: colors[status] || '#bdbdbd',
      color: '#fff',
    }}>
      {status}
    </span>
  );
}

function Empty() {
  return <div style={{ color: '#999', padding: '16px 0' }}>暂无数据</div>;
}
