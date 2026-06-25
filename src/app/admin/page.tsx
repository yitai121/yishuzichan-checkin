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

    // Simple client-side auth check (password from env)
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
    <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#5B5FC7] mb-4">
            <span className="text-white text-2xl font-bold">亿</span>
          </div>
          <h1 className="text-xl font-bold text-[#111827]">亿数嘉年华签到系统</h1>
          <p className="text-sm text-[#6B7280] mt-1">管理后台</p>
        </div>

        <form onSubmit={handleLogin} className="bg-white rounded-xl border border-[#E5E7EB] p-6 shadow-sm">
          <div className="mb-4">
            <label className="block text-sm font-medium text-[#111827] mb-1.5">管理密码</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="请输入管理密码"
              className="w-full px-3 py-2.5 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/30 focus:border-[#5B5FC7]"
              autoFocus
            />
          </div>
          {error && (
            <p className="text-sm text-[#EF4444] mb-3">{error}</p>
          )}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full py-2.5 bg-[#5B5FC7] text-white text-sm font-medium rounded-lg hover:bg-[#4A4EB0] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {loading ? '登录中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
