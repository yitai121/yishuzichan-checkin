'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import {
  BarChart3,
  Calendar,
  Users,
  QrCode,
  Download,
  Monitor,
  LogOut,
  Bell,
  ChevronRight,
  Loader2,
} from 'lucide-react';

const navItems = [
  { href: '/admin/dashboard', label: '签到看板', icon: BarChart3 },
  { href: '/admin/meetings', label: '会议管理', icon: Calendar },
  { href: '/admin/attendees', label: '参会名单', icon: Users },
  { href: '/admin/qrcodes', label: '二维码管理', icon: QrCode },
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
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center">
        <div className="flex items-center gap-3">
          <Loader2 className="w-5 h-5 text-[#5B5FC7] animate-spin" />
          <span className="text-[#5A6171] text-sm">加载中</span>
        </div>
      </div>
    );
  }

  if (pathname === '/admin') {
    return <>{children}</>;
  }

  const currentPage = navItems.find((item) => pathname.startsWith(item.href));

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex">
      {/* Sidebar - 240px */}
      <aside className="w-[240px] bg-white border-r border-[#E5E7EB] flex flex-col shrink-0 h-screen sticky top-0">
        {/* Brand */}
        <div className="h-[64px] px-5 flex items-center border-b border-[#E5E7EB]">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-[#5B5FC7] flex items-center justify-center">
              <span className="text-white text-sm font-bold">亿</span>
            </div>
            <div>
              <h1 className="text-[13px] font-semibold text-[#1A1D24] leading-tight">亿数嘉年华</h1>
              <p className="text-[11px] text-[#9CA3AF] leading-tight">签到管理系统</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-0.5">
          <p className="px-3 mb-2 text-[10px] font-semibold text-[#9CA3AF] uppercase tracking-[0.08em]">功能</p>
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-[18px] h-[18px]" strokeWidth={1.5} />
                <span>{item.label}</span>
                {isActive && (
                  <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 space-y-0.5 border-t border-[#E5E7EB] pt-3">
          <Link
            href="/"
            className="nav-item"
          >
            <Monitor className="w-[18px] h-[18px]" strokeWidth={1.5} />
            <span>前台扫码页</span>
          </Link>
          <button
            onClick={handleLogout}
            className="nav-item w-full hover:!bg-[#FEF2F2] hover:!text-[#EF4444] group"
          >
            <LogOut className="w-[18px] h-[18px] group-hover:text-[#EF4444]" strokeWidth={1.5} />
            <span>退出登录</span>
          </button>
        </div>
      </aside>

      {/* Main content area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top bar - 64px */}
        <header className="h-[64px] bg-white border-b border-[#E5E7EB] flex items-center justify-between px-8 sticky top-0 z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-[15px] font-semibold text-[#1A1D24]">
              {currentPage?.label || '管理后台'}
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <button className="relative p-2 rounded-lg hover:bg-[#F4F5F8] transition-colors">
              <Bell className="w-[18px] h-[18px] text-[#5A6171]" strokeWidth={1.5} />
            </button>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-[#EEEDFB] flex items-center justify-center">
                <span className="text-[#5B5FC7] text-xs font-semibold">管</span>
              </div>
              <span className="text-[13px] font-medium text-[#1A1D24]">管理员</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-8 overflow-auto">
          <div className="max-w-[1440px] mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
