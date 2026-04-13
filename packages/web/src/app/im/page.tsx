'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Layout from '@/components/Layout';
import { fetchApi, fetchApiSafe } from '@/lib/api';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3000/ws';

export default function IMPage() {
  const [channels, setChannels] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [activeChannel, setActiveChannel] = useState<string | null>(null);
  const [input, setInput] = useState('');
  const [employees, setEmployees] = useState<any[]>([]);
  const [senderId, setSenderId] = useState('owner');
  const [channelForm, setChannelForm] = useState({ name: '', type: 'company' as const });
  const [wsStatus, setWsStatus] = useState<'connecting' | 'connected' | 'disconnected'>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeChannelRef = useRef(activeChannel);

  activeChannelRef.current = activeChannel;

  useEffect(() => {
    fetchApiSafe<any[]>('/api/channels', []).then(chs => {
      setChannels(chs);
      // Auto-select system channel
      const sys = chs.find((c: any) => c.id === 'ch-system');
      if (sys && !activeChannel) setActiveChannel(sys.id);
    });
    fetchApiSafe<any[]>('/api/employees', []).then(setEmployees);
  }, []);

  useEffect(() => {
    if (!activeChannel) return;
    fetchApiSafe<any[]>(`/api/messages/channels/${activeChannel}`, []).then(setMessages);
  }, [activeChannel]);

  const connectWs = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    setWsStatus('connecting');
    const ws = new WebSocket(WS_URL);

    ws.onopen = () => {
      setWsStatus('connected');
      ws.send(JSON.stringify({ type: 'register', employeeId: 'owner' }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'message' && msg.channel === activeChannelRef.current) {
          setMessages(prev => [...prev, msg.data]);
        }
      } catch { /* ignore malformed messages */ }
    };

    ws.onclose = () => {
      setWsStatus('disconnected');
      // Auto-reconnect after 3 seconds
      reconnectTimer.current = setTimeout(connectWs, 3000);
    };

    ws.onerror = () => {
      ws.close();
    };

    wsRef.current = ws;
  }, []);

  useEffect(() => {
    connectWs();
    return () => {
      if (reconnectTimer.current) clearTimeout(reconnectTimer.current);
      wsRef.current?.close();
    };
  }, [connectWs]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const [chatLoading, setChatLoading] = useState(false);

  const sendMessage = async () => {
    if (!input.trim() || !activeChannel) return;
    try {
      if (activeChannel === 'ch-system') {
        // System channel: show user message immediately, then call agent
        const userMsg = {
          id: `temp-${Date.now()}`,
          channelId: activeChannel,
          senderId: 'owner',
          content: input,
          type: 'text',
          createdAt: new Date().toISOString(),
        };
        setMessages(prev => [...prev, userMsg]);
        const userInput = input;
        setInput('');
        setChatLoading(true);
        try {
          const res = await fetchApi('/api/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message: userInput }),
          });
          // Show agent reply immediately
          if (res && (res as any).reply) {
            const agentMsg = {
              id: `agent-${Date.now()}`,
              channelId: activeChannel,
              senderId: (res as any).from || 'secretary',
              content: (res as any).reply,
              type: 'text',
              createdAt: new Date().toISOString(),
            };
            setMessages(prev => [...prev, agentMsg]);
          }
        } catch (err: any) {
          setError(`发送失败: ${err.message}`);
          // Refresh to get server-side error message
          const msgs = await fetchApiSafe<any[]>(`/api/messages/channels/${activeChannel}`, []);
          setMessages(msgs);
        } finally {
          setChatLoading(false);
        }
        return;
      } else {
        await fetchApi(`/api/messages/channels/${activeChannel}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ senderId, content: input }),
        });
      }
      setInput('');
      setError(null);
    } catch (err: any) {
      setError(`发送失败: ${err.message}`);
    }
  };

  const createChannel = async () => {
    if (!channelForm.name) return;
    try {
      const ch = await fetchApi('/api/channels', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(channelForm),
      });
      setChannels([...channels, ch]);
      setChannelForm({ name: '', type: 'company' });
      setError(null);
    } catch (err: any) {
      setError(`创建频道失败: ${err.message}`);
    }
  };

  const wsIndicator = wsStatus === 'connected' ? '🟢' : wsStatus === 'connecting' ? '🟡' : '🔴';

  return (
    <Layout>
      <h1 style={{ marginTop: 0 }}>即时通讯 <span style={{ fontSize: 14, fontWeight: 400 }}>{wsIndicator} {wsStatus}</span></h1>
      {error && <div style={{ padding: '12px 16px', marginBottom: 16, borderRadius: 8, background: '#fce4ec', color: '#c62828' }}>{error}</div>}

      <div style={{ display: 'flex', gap: 24, height: 'calc(100vh - 160px)' }}>
        <div style={{ width: 280, background: '#fff', borderRadius: 12, padding: 16, boxShadow: '0 1px 3px rgba(0,0,0,0.08)', overflowY: 'auto' }}>
          <div style={{ marginBottom: 16 }}>
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <input value={channelForm.name} onChange={e => setChannelForm({ ...channelForm, name: e.target.value })} placeholder="频道名" style={{ flex: 1, padding: '6px 10px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }} />
              <button onClick={createChannel} style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: '#4fc3f7', color: '#fff', cursor: 'pointer', fontSize: 13 }}>+</button>
            </div>
          </div>
          {[...channels].sort((a, b) => (a.id === 'ch-system' ? -1 : b.id === 'ch-system' ? 1 : 0)).map(ch => (
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
                <strong>{activeChannel === 'ch-system' ? '💬 系统对话' : channels.find(c => c.id === activeChannel)?.name}</strong>
                {activeChannel !== 'ch-system' && (
                  <select value={senderId} onChange={e => setSenderId(e.target.value)} style={{ padding: '4px 8px', borderRadius: 6, border: '1px solid #ddd', fontSize: 13 }}>
                    <option value="owner">Owner</option>
                    {employees.filter(e => e.status === 'active').map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                )}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {messages.map((m: any, i: number) => {
                  const isOwner = m.senderId === 'owner';
                  const isSystem = m.senderId === 'system';
                  const senderName = isOwner ? '我' : isSystem ? '系统' : (employees.find(e => e.id === m.senderId)?.name || m.senderId);
                  return (
                  <div key={m.id || i} style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
                      <strong style={{ fontSize: 13, color: isOwner ? '#4fc3f7' : isSystem ? '#e57373' : '#333' }}>{senderName}</strong>
                      <span style={{ fontSize: 11, color: '#aaa' }}>{new Date(m.createdAt).toLocaleTimeString()}</span>
                    </div>
                    <div style={{ marginTop: 4, padding: '8px 12px', background: isOwner ? '#e3f2fd' : '#f5f5f5', borderRadius: 8, display: 'inline-block', whiteSpace: 'pre-wrap', maxWidth: '80%' }}>{m.content}</div>
                  </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <div style={{ padding: 16, borderTop: '1px solid #eee', display: 'flex', gap: 8 }}>
                <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !chatLoading && sendMessage()} placeholder={activeChannel === 'ch-system' ? '跟秘书说点什么...' : '输入消息...'} disabled={chatLoading} style={{ flex: 1, padding: '8px 12px', borderRadius: 8, border: '1px solid #ddd', opacity: chatLoading ? 0.6 : 1 }} />
                <button onClick={sendMessage} disabled={chatLoading} style={{ padding: '8px 20px', borderRadius: 8, border: 'none', background: chatLoading ? '#90caf9' : '#4fc3f7', color: '#fff', cursor: chatLoading ? 'wait' : 'pointer', fontWeight: 600 }}>{chatLoading ? '思考中...' : '发送'}</button>
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
