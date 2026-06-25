'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';

const navItems = [
  { href: '/admin/dashboard', label: '签到看板', icon: '📊' },
  { href: '/admin/meetings', label: '会议管理', icon: '📋' },
  { href: '/admin/attendees', label: '参会名单', icon: '👥' },
  { href: '/admin/qrcodes', label: '二维码生成', icon: '📱' },
  { href: '/admin/export', label: '数据导出', icon: '📤' },
];

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [authChecked, setAuthChecked] = useState(false);

  useEffect(() => {
    // Skip auth check for login page
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
        <div className="text-[#6B7280] text-sm">加载中...</div>
      </div>
    );
  }

  // Login page has no sidebar
  if (pathname === '/admin') {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex">
      {/* Sidebar */}
      <aside className="w-60 bg-white border-r border-[#E5E7EB] flex flex-col shrink-0">
        <div className="p-4 border-b border-[#E5E7EB]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#5B5FC7] flex items-center justify-center">
              <span className="text-white text-sm font-bold">亿</span>
            </div>
            <div>
              <h1 className="text-sm font-semibold text-[#111827]">签到系统</h1>
              <p className="text-xs text-[#9CA3AF]">管理后台</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 p-3 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-[#EEEDFB] text-[#5B5FC7] font-medium'
                    : 'text-[#6B7280] hover:bg-[#F3F4F6] hover:text-[#111827]'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-3 border-t border-[#E5E7EB]">
          <Link
            href="/"
            className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
          >
            <span className="text-base">📷</span>
            前台扫码页
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-[#6B7280] hover:bg-[#F3F4F6] transition-colors"
          >
            <span className="text-base">🚪</span>
            退出登录
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-auto">
        {children}
      </main>
    </div>
  );
}
