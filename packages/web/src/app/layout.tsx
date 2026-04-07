import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Virtual Company Dashboard',
  description: 'AI-powered virtual software company management',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body style={{ margin: 0, fontFamily: 'system-ui, -apple-system, sans-serif' }}>
        {children}
      </body>
    </html>
  );
}
