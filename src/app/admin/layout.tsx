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
  Menu,
  X,
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

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

  const SidebarContent = () => (
    <>
      {/* Brand */}
      <div className="h-14 px-4 flex items-center border-b border-[#EBEDF0] shrink-0">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5B5FC7] to-[#4A4EB5] flex items-center justify-center shadow-sm">
            <span className="text-white text-sm font-bold">亿</span>
          </div>
          <div>
            <h1 className="text-sm font-semibold text-[#0F1117] leading-tight tracking-tight">亿数·山海归序</h1>
            <p className="text-[10px] text-[#99A0AE] leading-tight">签到管理系统</p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <p className="px-3 mb-2 text-[10px] font-semibold text-[#99A0AE] uppercase tracking-wider">管理菜单</p>
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
              <span className="flex-1 text-sm">{item.label}</span>
              {isActive && <ChevronRight className="w-3.5 h-3.5 opacity-50" />}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-3 pb-4 space-y-1 border-t border-[#EBEDF0] pt-3 shrink-0">
        <Link href="/" className="nav-item">
          <Monitor className="w-4 h-4" strokeWidth={1.75} />
          <span className="text-sm">前台扫码</span>
        </Link>
        <button onClick={handleLogout} className="nav-item w-full hover:!bg-[#FEF2F2] hover:!text-[#EF4444] group">
          <LogOut className="w-4 h-4 group-hover:text-[#EF4444]" strokeWidth={1.75} />
          <span className="text-sm">退出登录</span>
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex">
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex w-60 bg-white border-r border-[#EBEDF0] flex-col h-screen sticky top-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
          <aside className="relative w-72 max-w-[85vw] bg-white flex flex-col h-full shadow-2xl animate-slide-in-left">
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#F4F5F8] transition-colors"
            >
              <X className="w-4 h-4 text-[#525866]" />
            </button>
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <header className="h-14 bg-white border-b border-[#EBEDF0] flex items-center justify-between px-4 lg:px-6 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-9 h-9 flex items-center justify-center rounded-lg hover:bg-[#F4F5F8] transition-colors"
            >
              <Menu className="w-5 h-5 text-[#525866]" />
            </button>
            <h2 className="text-base font-semibold text-[#0F1117] tracking-tight">
              {currentPage?.label || '管理后台'}
            </h2>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#EEEDFB] to-[#E0DFFB] flex items-center justify-center shadow-sm">
              <span className="text-[#5B5FC7] text-xs font-semibold">管</span>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 p-4 lg:p-6 overflow-auto">
          <div className="max-w-[1400px] mx-auto animate-fade-in-up">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
