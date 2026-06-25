'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function AdminLoginPage() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const res = await fetch('/api/admin/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password }),
    });
    const data = await res.json();

    if (data.success) {
      sessionStorage.setItem('admin_auth', 'true');
      router.push('/admin/dashboard');
    } else {
      setError(data.error || '密码错误');
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[10%] right-[15%] w-[400px] h-[400px] rounded-full bg-[#5B5FC7]/[0.03] blur-[80px]" />
        <div className="absolute bottom-[20%] left-[10%] w-[300px] h-[300px] rounded-full bg-[#5B5FC7]/[0.02] blur-[60px]" />
      </div>

      <div className="w-full max-w-[360px] relative z-10">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-[#5B5FC7] to-[#7B7FD7] mb-5 shadow-lg shadow-[#5B5FC7]/20">
            <span className="text-white text-2xl font-bold">亿</span>
          </div>
          <h1 className="text-xl font-bold text-[#111827] tracking-tight">亿数嘉年华</h1>
          <p className="text-[13px] text-[#9CA3AF] mt-1.5 font-medium">签到管理后台</p>
        </div>

        {/* Login card */}
        <form onSubmit={handleLogin} className="bg-white rounded-2xl border border-[#E5E7EB]/80 p-7 shadow-sm shadow-black/[0.02]">
          <div className="mb-5">
            <label className="block text-[13px] font-semibold text-[#111827] mb-2">管理密码</label>
            <div className="relative">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9CA3AF]">
                <svg className="w-[18px] h-[18px]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
                </svg>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入管理密码"
                className="w-full pl-11 pr-4 py-3 text-[13px] border border-[#E5E7EB] rounded-xl text-[#111827] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/15 focus:border-[#5B5FC7]/40 transition-all"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-xl bg-[#FEF2F2] border border-[#FEE2E2]">
              <svg className="w-4 h-4 text-[#EF4444] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <p className="text-[12px] text-[#EF4444] font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-3 bg-gradient-to-r from-[#5B5FC7] to-[#6B6FD7] text-white text-[13px] font-semibold rounded-xl hover:from-[#4A4EB0] hover:to-[#5B5FC7] disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-200 shadow-md shadow-[#5B5FC7]/15 hover:shadow-lg hover:shadow-[#5B5FC7]/20 active:scale-[0.98]"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                登录中...
              </span>
            ) : (
              '登录'
            )}
          </button>
        </form>

        {/* Footer */}
        <p className="text-center text-[11px] text-[#9CA3AF] mt-6">
          亿数嘉年华签到系统 v1.0
        </p>
      </div>
    </div>
  );
}
