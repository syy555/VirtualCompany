'use client';

import { useState, useEffect, useRef } from 'react';
import Layout from '@/components/Layout';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000/ws';

export default function IMPage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [senderId, setSenderId] = useState('owner');
  const [channelForm, setChannelForm] = useState({ name: '', type: 'company' as const });
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch(`${API}/api/channels`).then(r => r.json()).then(setChannels).catch(() => {});
    fetch(`${API}/api/employees`).then(r => r.json()).then(setEmployees).catch(() => {});
  }, []);

  useEffect(() => {
    if (!activeChannel) return;
    fetch(`${API}/api/messages/channels/${activeChannel}`)
      .then(r => r.json())
      .then(setMessages)
      .catch(() => {});
  }, [activeChannel]);

  useEffect(() => {
    const ws = new WebSocket(WS_URL);
    ws.onopen = () => ws.send(JSON.stringify({ type: 'register', employeeId: 'owner' }));
    ws.onmessage = (event) => {
      const msg = JSON.parse(event.data);
      if (msg.type === 'message' && msg.channel === activeChannel) {
        setMessages(prev => [...prev, msg.data]);
      }
    };
    wsRef.current = ws;
    return () => ws.close();
  }, [activeChannel]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = () => {
    if (!input.trim() || !activeChannel) return;
    fetch(`${API}/api/messages/channels/${activeChannel}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ senderId, content: input }),
    }).then(r => r.json()).then(() => setInput('')).catch(() => {});
  };

  const createChannel = async () => {
    if (!channelForm.name) return;
    const res = await fetch(`${API}/api/channels`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(channelForm),
    });
    if (res.ok) {
      const ch = await res.json();
      setChannels([...channels, ch]);
      setChannelForm({ name: '', type: 'company' });
    }
  };

  return (
    <Layout>
      <h1 style={{ marginTop: 0 }}>即时通讯</h1>

      <div style={{ display: 'flex', gap: 24, height: 'calc(100vh - 160px)' }}>
        <div style={{ width: 280, background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflowY: 'auto' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input value={channelForm.name} onChange={e => setChannelForm({ ...channelForm, name: e.target.value })} placeholder="频道名" style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
              <button onClick={createChannel} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#4fc3f7', color: '#fff', cursor: 'pointer', fontSize: 13 }}>+</button>
            </div>
          </div>
          {channels.map(ch => (
            <div
              key={ch.id}
              onClick={() => setActiveChannel(ch.id)}
              style={{
                padding: '10px 12px',
                borderRadius: 8,
                cursor: 'pointer',
                background: activeChannel === ch.id ? '#e3f2fd' : 'transparent',
                marginBottom: 4,
              }}
            >
              <div style={{ fontWeight: 600, fontSize: 14 }}>{ch.name}</div>
              <div style={{ fontSize: 12, color: '#888' }}>{ch.type} · {ch.members?.length || 0} 成员</div>
            </div>
          ))}
        </div>

        <div style={{ flex: 1, background: '#fff', borderRadius: 12, display: 'flex', flexDirection: 'column', boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
          {activeChannel ? (
            <>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid #eee', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <strong>{channels.find(c => c.id === activeChannel)?.name}</strong>
                <select value={senderId} onChange={e => setSenderId(e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}>
                  <option value="owner">Owner</option>
                  {employees.filter(e => e.status === 'active').map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                </select>
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {messages.map((m: any, i: number) => (
                  <div key={i} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <strong style={{ fontSize: 13 }}>{m.senderId}</strong>
                      <span style={{ fontSize: 11, color: '#aaa' }}>{new Date(m.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ marginTop: 4, padding: '8px 12px', background: '#f5f5f5', borderRadius: 8, display: 'inline-block' }}>{m.content}</div>
                  </div>
                ))}
                <div ref={messagesEndRef} />
              </div>
              <div style={{ padding: 16, borderTop: '1px solid #eee', display: 'flex', gap: 8 }}>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()} placeholder="输入消息..." style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd' }} />
                <button onClick={sendMessage} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: '#4fc3f7', color: '#fff', cursor: 'pointer', fontWeight: 600 }}>发送</button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#999' }}>选择一个频道开始聊天</div>
          )}
        </div>
      </div>
    </Layout>
  );
}
