'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Lock } from 'lucide-react';

export default function AdminLogin() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError('请输入密码');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('admin_auth', 'true');
        router.push('/admin/dashboard');
      } else {
        setError(data.error || '密码错误');
      }
    } catch {
      setError('网络错误，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex items-center justify-center p-4">
      <div className="w-full max-w-[320px] animate-fade-in-up">
        {/* Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-10 h-10 rounded-lg bg-[#5B5FC7] mb-3">
            <span className="text-white text-sm font-bold">亿</span>
          </div>
          <h1 className="text-[18px] font-semibold text-[#0F1117] tracking-tight">亿数嘉年华</h1>
          <p className="text-[12px] text-[#99A0AE] mt-1">签到管理系统</p>
        </div>

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-[12px] font-medium text-[#525866] mb-1.5">管理密码</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#99A0AE]" strokeWidth={1.75} />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="请输入密码"
                className="input-field pl-9"
                autoFocus
              />
            </div>
          </div>

          {error && (
            <p className="text-[12px] text-[#EF4444] animate-fade-in">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                登录中
              </>
            ) : (
              '登录'
            )}
          </button>
        </form>

        <p className="text-center text-[11px] text-[#99A0AE] mt-6">
          仅限管理员使用
        </p>
      </div>
    </div>
  );
}
