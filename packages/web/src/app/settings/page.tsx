'use client';

import { useState, useEffect } from 'react';
import Layout from '@/components/Layout';
import { fetchApiSafe, fetchApi } from '@/lib/api';

const PROVIDERS = ['anthropic', 'openai', 'deepseek', 'qwen', 'ollama', 'custom'];
const TOOLS = ['claude-code', 'codex', 'opencode'];

export default function SettingsPage() {
  const [config, setConfig] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApiSafe('/api/config', {}).then(setConfig);
  }, []);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const updated = await fetchApi('/api/config', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      setConfig(updated);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const set = (path: string[], value: any) => {
    setConfig((prev: any) => {
      const next = JSON.parse(JSON.stringify(prev));
      let cur = next;
      for (let i = 0; i < path.length - 1; i++) {
        if (!cur[path[i]]) cur[path[i]] = {};
        cur = cur[path[i]];
      }
      cur[path[path.length - 1]] = value;
      return next;
    });
  };

  if (!config) return <Layout><div style={{ padding: 40 }}>加载中...</div></Layout>;

  const d = config.defaults ?? {};
  const c = config.company ?? {};
  const r = config.review ?? {};

  return (
    <Layout>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 32 }}>
        <h1 style={{ margin: 0 }}>设置</h1>
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          {saved && <span style={{ color: '#81c784', fontSize: 14 }}>✓ 已保存</span>}
          {error && <span style={{ color: '#e57373', fontSize: 14 }}>{error}</span>}
          <button onClick={save} disabled={saving} style={{ padding: '8px 24px', borderRadius: 8, border: 'none', background: '#4fc3f7', color: '#fff', cursor: 'pointer', fontWeight: 600, opacity: saving ? 0.6 : 1 }}>
            {saving ? '保存中...' : '保存'}
          </button>
        </div>
      </div>

      <Section title="公司信息">
        <Field label="公司名称">
          <input value={c.name ?? ''} onChange={e => set(['company', 'name'], e.target.value)} style={inputStyle} />
        </Field>
        <Field label="公司描述">
          <input value={c.description ?? ''} onChange={e => set(['company', 'description'], e.target.value)} style={inputStyle} />
        </Field>
      </Section>

      <Section title="默认 LLM 配置">
        <Field label="Provider">
          <select value={d.provider ?? ''} onChange={e => set(['defaults', 'provider'], e.target.value)} style={selectStyle}>
            {PROVIDERS.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </Field>
        <Field label="模型">
          <input value={d.model ?? ''} onChange={e => set(['defaults', 'model'], e.target.value)} style={inputStyle} placeholder="如 claude-opus-4-20250514" />
        </Field>
        <Field label="API Key 环境变量">
          <input value={d.api_key_env ?? ''} onChange={e => set(['defaults', 'api_key_env'], e.target.value)} style={inputStyle} placeholder="如 ANTHROPIC_API_KEY" />
        </Field>
        <Field label="Base URL（可选）">
          <input value={d.base_url ?? ''} onChange={e => set(['defaults', 'base_url'], e.target.value)} style={inputStyle} placeholder="如 https://api.anthropic.com/v1" />
        </Field>
        <Field label="Agent 工具">
          <select value={d.tool ?? 'claude-code'} onChange={e => set(['defaults', 'tool'], e.target.value)} style={selectStyle}>
            {TOOLS.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </Field>
      </Section>

      <Section title="绩效考核">
        <Field label="考核周期">
          <select value={r.cycle ?? 'weekly'} onChange={e => set(['review', 'cycle'], e.target.value)} style={selectStyle}>
            <option value="weekly">每周</option>
            <option value="biweekly">每两周</option>
            <option value="monthly">每月</option>
          </select>
        </Field>
        <Field label="警告阈值（0-1）">
          <input type="number" min={0} max={1} step={0.05} value={r.thresholds?.warning ?? 0.6} onChange={e => set(['review', 'thresholds', 'warning'], parseFloat(e.target.value))} style={{ ...inputStyle, width: 100 }} />
        </Field>
        <Field label="替换阈值（0-1）">
          <input type="number" min={0} max={1} step={0.05} value={r.thresholds?.replace ?? 0.4} onChange={e => set(['review', 'thresholds', 'replace'], parseFloat(e.target.value))} style={{ ...inputStyle, width: 100 }} />
        </Field>
        <Field label="自动替换">
          <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}>
            <input type="checkbox" checked={r.auto_replace ?? false} onChange={e => set(['review', 'auto_replace'], e.target.checked)} />
            <span style={{ fontSize: 14, color: '#666' }}>开启后绩效不达标员工将自动被替换（无需确认）</span>
          </label>
        </Field>
      </Section>
    </Layout>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div style={{ background: '#fff', borderRadius: 12, padding: 24, marginBottom: 24, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
      <h3 style={{ marginTop: 0, marginBottom: 20, color: '#333' }}>{title}</h3>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>{children}</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      <label style={{ width: 180, fontSize: 14, color: '#555', flexShrink: 0 }}>{label}</label>
      {children}
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, flex: 1, minWidth: 0,
};
const selectStyle: React.CSSProperties = {
  padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14, minWidth: 180,
};
