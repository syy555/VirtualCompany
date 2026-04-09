'use client';

import { useState, useEffect, useCallback } from 'react';
import Layout from '@/components/Layout';
import { fetchApiSafe, fetchApi } from '@/lib/api';

const STATUS_LABELS: Record<string, string> = { active: '在职', warning: '警告', terminated: '已离职' };
const STATUS_COLORS: Record<string, string> = { active: '#81c784', warning: '#ffb74d', terminated: '#e57373' };

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<any[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ role: '', name: '' });
  const [selected, setSelected] = useState<any | null>(null);
  const [empTasks, setEmpTasks] = useState<any[]>([]);
  const [providerConfig, setProviderConfig] = useState<any>({});
  const [editingProvider, setEditingProvider] = useState(false);
  const [providerForm, setProviderForm] = useState({ provider: '', model: '', api_key_env: '', base_url: '' });

  const reload = useCallback(async () => {
    const [emp, r] = await Promise.all([
      fetchApiSafe<any[]>('/api/employees', []),
      fetchApiSafe<{ id: string; name: string }[]>('/api/employees/roles', []),
    ]);
    setEmployees(emp);
    setRoles(r);
    setLoading(false);
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const selectEmployee = async (emp: any) => {
    setSelected(emp);
    setEditingProvider(false);
    const [t, p] = await Promise.all([
      fetchApiSafe<any[]>(`/api/employees/${emp.id}/tasks`, []),
      fetchApiSafe<any>(`/api/employees/roles/${emp.role}/provider`, {}),
    ]);
    setEmpTasks(t);
    setProviderConfig(p);
  };

  const hire = async () => {
    if (!form.role) return;
    try {
      const count = employees.filter(e => e.role === form.role).length + 1;
      const newEmp = await fetchApi('/api/employees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: `${form.role}-${String(count).padStart(3, '0')}`,
          role: form.role,
          name: form.name || `${form.role}-${String(count).padStart(3, '0')}`,
        }),
      });
      setEmployees([...employees, newEmp]);
      setForm({ role: '', name: '' });
      setError(null);
    } catch (err: any) {
      setError(`招聘失败: ${err.message}`);
    }
  };

  const fire = async (id: string) => {
    try {
      await fetchApi(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'terminated', terminatedAt: new Date().toISOString() }),
      });
      await reload();
      if (selected?.id === id) setSelected(null);
    } catch (err: any) {
      setError(`解雇失败: ${err.message}`);
    }
  };

  const reactivate = async (id: string) => {
    try {
      await fetchApi(`/api/employees/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'active', terminatedAt: null }),
      });
      await reload();
    } catch (err: any) {
      setError(`重新激活失败: ${err.message}`);
    }
  };

  const saveProvider = async () => {
    if (!selected) return;
    try {
      const updated = await fetchApi(`/api/employees/roles/${selected.role}/provider`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(providerForm),
      });
      setProviderConfig(updated);
      setEditingProvider(false);
      setError(null);
    } catch (err: any) {
      setError(`保存模型配置失败: ${err.message}`);
    }
  };

  if (loading) return <Layout><div style={{ padding: 40 }}>加载中...</div></Layout>;

  const roleName = (role: string) => roles.find(r => r.id === role)?.name || role;

  return (
    <Layout>
      <h1 style={{ marginTop: 0 }}>员工管理</h1>
      {error && <div style={{ padding: '12px 16px', marginBottom: 16, borderRadius: 8, background: '#fce4ec', color: '#c62828' }}>{error}</div>}

      {/* Hire form */}
      <div style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
        <h3 style={{ marginTop: 0 }}>招聘新员工</h3>
        <div style={{ display: 'flex', gap: 12 }}>
          <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value })} style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', minWidth: 180 }}>
            <option value="">选择角色</option>
            {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
          </select>
          <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="名称（可选）" style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', flex: 1 }} />
          <button onClick={hire} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#4fc3f7', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>招聘</button>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 24 }}>
        {/* Employee list */}
        <div style={{ flex: 1, background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee' }}>
                {['名称', '角色', '状态', '操作'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '12px 8px', color: '#888', fontWeight: 600, fontSize: 13 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {employees.map(e => (
                <tr key={e.id} onClick={() => selectEmployee(e)} style={{ borderBottom: '1px solid #f0f0f0', cursor: 'pointer', background: selected?.id === e.id ? '#e3f2fd' : 'transparent' }}>
                  <td style={{ padding: '12px 8px' }}>
                    <div style={{ fontWeight: 600 }}>{e.name}</div>
                    <div style={{ fontSize: 11, color: '#aaa', fontFamily: 'monospace' }}>{e.id}</div>
                  </td>
                  <td style={{ padding: '12px 8px' }}>{roleName(e.role)}</td>
                  <td style={{ padding: '12px 8px' }}>
                    <span style={{ padding: '2px 10px', borderRadius: 12, fontSize: 12, background: STATUS_COLORS[e.status] || '#ccc', color: '#fff' }}>
                      {STATUS_LABELS[e.status] || e.status}
                    </span>
                  </td>
                  <td style={{ padding: '12px 8px' }} onClick={ev => ev.stopPropagation()}>
                    {e.status === 'active' && (
                      <button onClick={() => fire(e.id)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #e57373', background: '#fff', color: '#e57373', cursor: 'pointer', fontSize: 12 }}>解雇</button>
                    )}
                    {e.status === 'terminated' && (
                      <button onClick={() => reactivate(e.id)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #81c784', background: '#fff', color: '#81c784', cursor: 'pointer', fontSize: 12 }}>重新激活</button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {employees.length === 0 && <div style={{ color: '#999', padding: '24px 0', textAlign: 'center' }}>暂无员工</div>}
        </div>

        {/* Detail panel */}
        {selected && (
          <div style={{ width: 400, background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
            <h3 style={{ marginTop: 0 }}>{selected.name}</h3>
            <div style={{ fontSize: 13, color: '#666', marginBottom: 16 }}>
              <div>ID: <code>{selected.id}</code></div>
              <div>角色: {roleName(selected.role)}</div>
              <div>状态: <span style={{ color: STATUS_COLORS[selected.status] }}>{STATUS_LABELS[selected.status]}</span></div>
              <div>入职: {new Date(selected.createdAt).toLocaleDateString()}</div>
              {selected.terminatedAt && <div>离职: {new Date(selected.terminatedAt).toLocaleDateString()}</div>}
            </div>

            {/* Model config */}
            <div style={{ borderTop: '1px solid #eee', paddingTop: 16, marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                <h4 style={{ margin: 0 }}>模型配置</h4>
                {!editingProvider ? (
                  <button onClick={() => { setProviderForm({ provider: providerConfig.provider || '', model: providerConfig.model || '', api_key_env: providerConfig.api_key_env || '', base_url: providerConfig.base_url || '' }); setEditingProvider(true); }} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #4fc3f7', background: '#fff', color: '#4fc3f7', cursor: 'pointer', fontSize: 12 }}>编辑</button>
                ) : (
                  <div style={{ display: 'flex', gap: 4 }}>
                    <button onClick={saveProvider} style={{ padding: '4px 12px', borderRadius: 6, border: 'none', background: '#4fc3f7', color: '#fff', cursor: 'pointer', fontSize: 12 }}>保存</button>
                    <button onClick={() => setEditingProvider(false)} style={{ padding: '4px 12px', borderRadius: 6, border: '1px solid #ddd', background: '#fff', cursor: 'pointer', fontSize: 12 }}>取消</button>
                  </div>
                )}
              </div>
              {!editingProvider ? (
                <div style={{ fontSize: 13, color: '#666' }}>
                  <div>Provider: {providerConfig.provider || '—'}</div>
                  <div>Model: {providerConfig.model || '—'}</div>
                  <div>API Key: {providerConfig.api_key_env ? '••••••' : '—'}</div>
                  {providerConfig.base_url && <div>Base URL: {providerConfig.base_url}</div>}
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <input value={providerForm.provider} onChange={e => setProviderForm({ ...providerForm, provider: e.target.value })} placeholder="Provider (anthropic/openai/custom)" style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
                  <input value={providerForm.model} onChange={e => setProviderForm({ ...providerForm, model: e.target.value })} placeholder="Model" style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
                  <input value={providerForm.api_key_env} onChange={e => setProviderForm({ ...providerForm, api_key_env: e.target.value })} placeholder="API Key 或环境变量名" style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
                  <input value={providerForm.base_url} onChange={e => setProviderForm({ ...providerForm, base_url: e.target.value })} placeholder="Base URL（可选）" style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
                </div>
              )}
              <div style={{ fontSize: 11, color: '#aaa', marginTop: 4 }}>此配置对所有 {roleName(selected.role)} 角色生效</div>
            </div>

            {/* Tasks */}
            <div style={{ borderTop: '1px solid #eee', paddingTop: 16 }}>
              <h4 style={{ margin: '0 0 8px' }}>分配的任务 ({empTasks.length})</h4>
              {empTasks.length === 0 ? (
                <div style={{ fontSize: 13, color: '#999' }}>暂无任务</div>
              ) : (
                empTasks.map(t => (
                  <div key={t.id} style={{ padding: '8px 0', borderBottom: '1px solid #f5f5f5', fontSize: 13 }}>
                    <div style={{ fontWeight: 500 }}>{t.title}</div>
                    <span style={{ padding: '1px 6px', borderRadius: 4, fontSize: 11, background: t.status === 'done' ? '#81c784' : t.status === 'in_progress' ? '#4fc3f7' : '#eee', color: t.status === 'done' || t.status === 'in_progress' ? '#fff' : '#666' }}>{t.status}</span>
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
