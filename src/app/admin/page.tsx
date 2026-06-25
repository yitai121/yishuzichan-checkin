'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Lock, Loader2, AlertCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-4">
      <div className="w-full max-w-[380px] animate-fade-in-up">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-[#5B5FC7] mb-5">
            <span className="text-white text-xl font-bold">亿</span>
          </div>
          <h1 className="text-xl font-bold text-[#1A1D24] tracking-tight">亿数嘉年华</h1>
          <p className="text-[13px] text-[#9CA3AF] mt-1.5">签到管理后台</p>
        </div>

        {/* Login card */}
        <form onSubmit={handleLogin} className="card p-7">
          <div className="mb-5">
            <label className="block text-[13px] font-semibold text-[#1A1D24] mb-2">管理密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-[18px] h-[18px] text-[#9CA3AF]" strokeWidth={1.5} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入管理密码"
                className="input-field pl-10 h-[44px]"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 mb-4 px-3 py-2.5 rounded-lg bg-[#FEE2E2]/50 border border-[#EF4444]/20">
              <AlertCircle className="w-4 h-4 text-[#EF4444] shrink-0" />
              <p className="text-[12px] text-[#EF4444] font-medium">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading || !password}
            className="btn-primary w-full justify-center h-[44px] text-[13px] font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
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
