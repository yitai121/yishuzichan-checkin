'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  ScanLine,
  Plus,
  Trash2,
  Loader2,
  Search,
  UserCheck,
  UserX,
  Copy,
  Check,
  Shield,
} from 'lucide-react';

interface ScannerUser {
  id: string;
  username: string;
  is_active: boolean;
  created_at: string;
}

export default function ScannerUsersPage() {
  const [users, setUsers] = useState<ScannerUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/scanner-users');
      const data = await res.json();
      if (data.success) {
        setUsers(data.data);
      }
    } catch {
      showToast('加载失败', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const handleCreate = async () => {
    if (!newUsername.trim() || !newPassword.trim()) {
      showToast('请填写完整信息', 'error');
      return;
    }
    if (newPassword.length < 4) {
      showToast('密码至少4位', 'error');
      return;
    }

    setCreating(true);
    try {
      const res = await fetch('/api/scanner-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: newUsername.trim(), password: newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        showToast(`账号「${newUsername}」创建成功`, 'success');
        setShowCreateModal(false);
        setNewUsername('');
        setNewPassword('');
        fetchUsers();
      } else {
        showToast(data.error || '创建失败', 'error');
      }
    } catch {
      showToast('创建失败', 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, username: string) => {
    if (!confirm(`确定删除账号「${username}」？删除后该账号将无法扫码签到。`)) return;

    setDeletingId(id);
    try {
      const res = await fetch(`/api/scanner-users/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        showToast(`账号「${username}」已删除`, 'success');
        fetchUsers();
      } else {
        showToast(data.error || '删除失败', 'error');
      }
    } catch {
      showToast('删除失败', 'error');
    } finally {
      setDeletingId(null);
    }
  };

  const handleCopyCredentials = (username: string) => {
    navigator.clipboard.writeText(`账号: ${username}`);
    setCopiedId(username);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredUsers = users.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="animate-fade-in-up">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #5B5FC7, #7B7FDB)' }}>
            <ScanLine className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight" style={{ color: '#1A1D24' }}>
              扫码账号管理
            </h1>
            <p className="text-sm mt-1" style={{ color: '#5A6171' }}>
              管理前台扫码核验人员的登录账号
            </p>
          </div>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          创建账号
        </button>
      </div>

      {/* Search */}
      <div className="card mb-6 p-4">
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2" style={{ color: '#9CA3AF' }} />
          <input
            type="text"
            placeholder="搜索账号..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input pl-10 w-full max-w-xs"
          />
        </div>
      </div>

      {/* Users List */}
      {loading ? (
        <div className="card p-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin" style={{ color: '#5B5FC7' }} />
          <p style={{ color: '#5A6171' }}>加载中...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="card p-12 text-center">
          <div className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center" style={{ background: 'rgba(91,95,199,0.08)' }}>
            <Shield className="w-8 h-8" style={{ color: '#5B5FC7' }} />
          </div>
          <p className="font-medium mb-2" style={{ color: '#1A1D24' }}>
            {searchQuery ? '未找到匹配的账号' : '还没有扫码账号'}
          </p>
          <p className="text-sm" style={{ color: '#5A6171' }}>
            {searchQuery ? '换个关键词试试' : '创建账号后，前台扫码页需要登录才能使用'}
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead>
              <tr style={{ background: '#F4F5F8' }}>
                <th className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: '#5A6171' }}>
                  账号信息
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: '#5A6171' }}>
                  状态
                </th>
                <th className="text-left px-6 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: '#5A6171' }}>
                  创建时间
                </th>
                <th className="text-right px-6 py-3 text-xs font-medium uppercase tracking-wider" style={{ color: '#5A6171' }}>
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="divide-y" style={{ borderColor: '#E5E7EB' }}>
              {filteredUsers.map((user, index) => (
                <tr
                  key={user.id}
                  className="transition-colors"
                >
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-semibold" style={{ background: 'rgba(91,95,199,0.1)', color: '#5B5FC7' }}>
                        {user.username.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-medium text-sm" style={{ color: '#1A1D24' }}>
                          {user.username}
                        </div>
                        <button
                          onClick={() => handleCopyCredentials(user.username)}
                          className="text-xs flex items-center gap-1 mt-0.5 transition-colors"
                          style={{ color: '#5B5FC7' }}
                        >
                          {copiedId === user.username ? (
                            <><Check className="w-3 h-3" /> 已复制</>
                          ) : (
                            <><Copy className="w-3 h-3" /> 复制账号名</>
                          )}
                        </button>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {user.is_active ? (
                      <span className="badge-success inline-flex items-center gap-1">
                        <UserCheck className="w-3 h-3" /> 启用
                      </span>
                    ) : (
                      <span className="badge-error inline-flex items-center gap-1">
                        <UserX className="w-3 h-3" /> 禁用
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm" style={{ color: '#5A6171' }}>
                    {new Date(user.created_at).toLocaleString('zh-CN')}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => handleDelete(user.id, user.username)}
                      disabled={deletingId === user.id}
                      className="btn-danger-sm inline-flex items-center gap-1.5"
                    >
                      {deletingId === user.id ? (
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="w-3.5 h-3.5" />
                      )}
                      删除
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => !creating && setShowCreateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(91,95,199,0.1)' }}>
                  <Plus className="w-5 h-5" style={{ color: '#5B5FC7' }} />
                </div>
                <h2 className="text-xl font-semibold tracking-tight" style={{ color: '#1A1D24' }}>
                  创建扫码账号
                </h2>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
                style={{ color: '#5A6171' }}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1A1D24' }}>
                  用户名 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="输入用户名（如：张三）"
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  className="input w-full"
                  maxLength={50}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2" style={{ color: '#1A1D24' }}>
                  密码 <span style={{ color: '#EF4444' }}>*</span>
                </label>
                <input
                  type="text"
                  placeholder="输入密码（至少4位）"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="input w-full"
                  maxLength={100}
                />
              </div>

              <div className="p-3 rounded-lg text-sm" style={{ background: 'rgba(91,95,199,0.04)', color: '#5A6171' }}>
                创建后，前台扫码页将需要输入此账号密码才能使用扫码功能。
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="btn-secondary flex-1"
                disabled={creating}
              >
                取消
              </button>
              <button
                onClick={handleCreate}
                className="btn-primary flex-1 flex items-center justify-center gap-2"
                disabled={creating}
              >
                {creating ? (
                  <><Loader2 className="w-4 h-4 animate-spin" /> 创建中...</>
                ) : (
                  '创建账号'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.message}
        </div>
      )}
    </div>
  );
}
