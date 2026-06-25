'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  LayoutDashboard,
  Calendar,
  Users,
  QrCode,
  Download,
  Monitor,
  LogOut,
  Loader2,
  ScanLine,
  ChevronRight,
  History,
} from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', label: '签到看板', icon: LayoutDashboard },
  { href: '/admin/meetings', label: '会议管理', icon: Calendar },
  { href: '/admin/attendees', label: '参会名单', icon: Users },
  { href: '/admin/checkins', label: '签到记录', icon: History },
  { href: '/admin/qrcodes', label: '二维码', icon: QrCode },
  { href: '/admin/scanner-users', label: '扫码账号', icon: ScanLine },
  { href: '/admin/export', label: '数据导出', icon: Download },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    if (pathname === '/admin') {
      setAuthChecked(true);
      return;
    }
    const auth = sessionStorage.getItem('admin_auth');
    if (!auth) {
      router.push('/admin');
    } else {
      setAuthChecked(true);
    }
  }, [pathname, router]);

  const handleLogout = () => {
    sessionStorage.removeItem('admin_auth');
    router.push('/admin');
  };

  if (!authChecked) {
    return (
      <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center">
        <div className="flex items-center gap-2">
          <Loader2 className="w-4 h-4 text-[#5B5FC7] animate-spin" />
          <span className="text-[#525866] text-sm">加载中</span>
        </div>
      </div>
    );
  }

  if (pathname === '/admin') {
    return <>{children}</>;
  }

  const currentPage = navItems.find((item) => pathname.startsWith(item.href));

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex">
      {/* Sidebar */}
      <aside className="w-[220px] bg-white border-r border-[#EBEDF0] flex flex-col shrink-0 h-screen sticky top-0">
        {/* Brand */}
        <div className="h-[52px] px-4 flex items-center border-b border-[#EBEDF0]">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-[#5B5FC7] flex items-center justify-center">
              <span className="text-white text-xs font-bold">亿</span>
            </div>
            <div>
              <h1 className="text-[13px] font-semibold text-[#0F1117] leading-tight tracking-tight">亿数嘉年华</h1>
              <p className="text-[10px] text-[#99A0AE] leading-tight">签到管理</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2.5 py-3 space-y-0.5">
          <p className="px-3 mb-1.5 text-[10px] font-medium text-[#99A0AE] uppercase tracking-wider">管理</p>
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-4 h-4" strokeWidth={1.75} />
                <span className="flex-1">{item.label}</span>
                {isActive && <ChevronRight className="w-3 h-3 opacity-40" />}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-2.5 pb-3 space-y-0.5 border-t border-[#EBEDF0] pt-2.5">
          <Link href="/" className="nav-item">
            <Monitor className="w-4 h-4" strokeWidth={1.75} />
            <span>前台扫码</span>
          </Link>
          <button onClick={handleLogout} className="nav-item w-full hover:!bg-[#FEF2F2] hover:!text-[#EF4444] group">
            <LogOut className="w-4 h-4 group-hover:text-[#EF4444]" strokeWidth={1.75} />
            <span>退出</span>
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="h-[52px] bg-white border-b border-[#EBEDF0] flex items-center justify-between px-6 sticky top-0 z-10">
          <h2 className="text-[14px] font-semibold text-[#0F1117] tracking-tight">
            {currentPage?.label || '管理后台'}
          </h2>
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-full bg-[#EEEDFB] flex items-center justify-center">
              <span className="text-[#5B5FC7] text-[11px] font-semibold">管</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-[1400px] mx-auto animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
