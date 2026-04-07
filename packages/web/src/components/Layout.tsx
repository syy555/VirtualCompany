'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { href: '/', label: 'Dashboard', icon: '📊' },
  { href: '/employees', label: '员工', icon: '👥' },
  { href: '/projects', label: '项目', icon: '📁' },
  { href: '/pipelines', label: '流水线', icon: '🔄' },
  { href: '/im', label: '消息', icon: '💬' },
];

export default function Layout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside style={{
        width: 220,
        background: '#1a1a2e',
        color: '#fff',
        padding: '20px 0',
        position: 'fixed',
        height: '100vh',
      }}>
        <div style={{ padding: '0 20px 24px', fontSize: 18, fontWeight: 700, borderBottom: '1px solid #333', paddingBottom: 16 }}>
          🏢 Virtual Company
        </div>
        <nav>
          {navItems.map(item => {
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 20px',
                  color: active ? '#4fc3f7' : '#aaa',
                  textDecoration: 'none',
                  background: active ? '#16213e' : 'transparent',
                  borderLeft: active ? '3px solid #4fc3f7' : '3px solid transparent',
                  transition: 'all 0.2s',
                }}
              >
                <span>{item.icon}</span>
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
      <main style={{ flex: 1, marginLeft: 220, padding: 32, background: '#f5f5f5', minHeight: '100vh' }}>
        {children}
      </main>
    </div>
  );
}
