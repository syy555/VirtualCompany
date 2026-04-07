'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ role: '', name: '' });

  useEffect(() => {
    Promise.all([
      fetch(`${API}/api/employees`).then(r => r.json()).catch(() => []),
      fetch(`${API}/api/employees/roles`).then(r => r.json()).catch(() => []),
    ]).then(([emp, r]) => {
      setEmployees(emp);
      setRoles(r);
      setLoading(false);
    });
  }, []);

  const hire = async () => {
    if (!form.role) return;
    const res = await fetch(`${API}/api/employees`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: `${form.role}-${String(employees.filter(e => e.role === form.role).length + 1).padStart(3, '0')}`,
        role: form.role,
        name: form.name || `${form.role}-${String(employees.filter(e => e.role === form.role).length + 1).padStart(3, '0')}`,
      }),
    });
    if (res.ok) {
      const newEmp = await res.json();
      setEmployees([...employees, newEmp]);
      setForm({ role: '', name: '' });
    }
  };

  const fire = async (id: string) => {
    await fetch(`${API}/api/employees/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'terminated' }) });
    setEmployees(employees.map(e => e.id === id ? { ...e, status: 'terminated' } : e));
  };

  if (loading) return <Layout><div style={{ padding: 40 }}>加载中...</div></Layout>;

  return (
    <Layout>
      <h1 style={{ marginTop: 0 }}>员工管理</h1>

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 style={{ marginTop: 0 }}>招聘新员工</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', minWidth: 180 }}>
            <option value="">选择角色</option>
            {roles.map(r => <option key={r} value={r}>{r}</option>)}
          </select>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="名称（可选）" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', flex: 1 }} />
          <button onClick={hire} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#4fc3f7', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>招聘</button>
        </div>
      </div>

      <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #eee' }}>
              {['ID', '名称', '角色', '状态', '操作'].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '12px 8px', color: '#888', fontWeight: 600, fontSize: 13 }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {employees.map(e => (
              <tr key={e.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                <td style={{ padding: '12px 8px', fontFamily: 'monospace', fontSize: 13 }}>{e.id}</td>
                <td style={{ padding: '12px 8px' }}>{e.name}</td>
                <td style={{ padding: '12px 8px' }}><code style={{ background: '#f0f0f0', padding: '2px 8px', borderRadius: 4, fontSize: 12 }}>{e.role}</code></td>
                <td style={{ padding: '12px 8px' }}>
                  <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, background: e.status === 'active' ? '#81c784' : e.status === 'warning' ? '#ffb74d' : '#e57373', color: '#fff' }}>
                    {e.status}
                  </span>
                </td>
                <td style={{ padding: '12px 8px' }}>
                  {e.status === 'active' && (
                    <button onClick={() => fire(e.id)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #e57373', background: '#fff', color: '#e57373', cursor: 'pointer', fontSize: 12 }}>解雇</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {employees.length === 0 && <div style={{ color: '#999', padding: '24px 0', textAlign: 'center' }}>暂无员工</div>}
      </div>
    </Layout>
  );
}
