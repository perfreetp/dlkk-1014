import type { ReactNode } from 'react';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';

interface LayoutProps {
  children: ReactNode;
}

export const Layout = ({ children }: LayoutProps) => {
  return (
    <div className="min-h-screen bg-slate-50">
      <Sidebar />
      <div className="pl-60">
        <Topbar />
        <main className="p-8 animate-fade-in">
          <div className="container max-w-none">{children}</div>
        </main>
      </div>
    </div>
  );
};
