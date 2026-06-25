'use client';

import { useState, useEffect } from 'react';
import { Plus, Trash2, Loader2, Users, Search, Copy, CheckCircle2 } from 'lucide-react';

interface ScannerUser { id: string; username: string; is_active: boolean; created_at: string; }

export default function ScannerUsersPage() {
  const [users, setUsers] = useState<ScannerUser[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  useEffect(() => { fetchUsers(); }, []);

  const fetchUsers = async () => {
    const res = await fetch('/api/scanner-users').then((r) => r.json());
    if (res.success) setUsers(res.data);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault(); if (!newUsername.trim() || !newPassword.trim()) return; setLoading(true);
    try {
      const res = await fetch('/api/scanner-users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: newUsername.trim(), password: newPassword.trim() }) }).then((r) => r.json());
      if (res.success) { showToast('账号创建成功'); setShowCreateForm(false); setNewUsername(''); setNewPassword(''); fetchUsers(); }
      else { showToast(res.error || '创建失败'); }
    } catch { showToast('网络错误'); }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该扫码账号？')) return;
    const res = await fetch(`/api/scanner-users/${id}`, { method: 'DELETE' }).then((r) => r.json());
    if (res.success) { showToast('已删除'); setUsers((prev) => prev.filter((u) => u.id !== id)); }
    else { showToast(res.error || '删除失败'); }
  };

  const copyUsername = (username: string, id: string) => {
    navigator.clipboard.writeText(username); setCopiedId(id); showToast('已复制'); setTimeout(() => setCopiedId(null), 1500);
  };

  const filtered = users.filter((u) => !searchQuery || u.username.toLowerCase().includes(searchQuery.toLowerCase()));

  return (
    <div>
      {toast && <div className="toast toast-success">{toast}</div>}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[16px] font-semibold text-[#0F1117]">扫码账号</h1>
          <p className="text-[12px] text-[#99A0AE] mt-0.5">管理前台扫码核验页的登录账号</p>
        </div>
        <button onClick={() => setShowCreateForm(true)} className="btn-primary"><Plus className="w-3.5 h-3.5" />创建账号</button>
      </div>

      {showCreateForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40" onClick={() => setShowCreateForm(false)}>
          <form onSubmit={handleCreate} onClick={(e) => e.stopPropagation()} className="card p-5 w-full max-w-sm animate-fade-in-up">
            <h2 className="text-[14px] font-semibold text-[#0F1117] mb-3">创建扫码账号</h2>
            <div className="space-y-2.5">
              <input type="text" value={newUsername} onChange={(e) => setNewUsername(e.target.value)} required placeholder="账号名 *" className="input-field" />
              <input type="text" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required placeholder="密码 *" className="input-field" />
            </div>
            <div className="flex gap-2 mt-3">
              <button type="button" onClick={() => setShowCreateForm(false)} className="btn-secondary flex-1 justify-center">取消</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-50">{loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}{loading ? '创建中...' : '创建'}</button>
            </div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
          <span className="text-[12px] font-semibold text-[#0F1117]">共 {users.length} 个账号</span>
          <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#C9CDD4]" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索..." className="input-field w-[180px] pl-8 h-[32px] text-[12px]" /></div>
        </div>
        {filtered.length === 0 ? (
          <div className="py-12 text-center"><Users className="w-8 h-8 text-[#C9CDD4] mx-auto mb-2" strokeWidth={1.5} /><p className="text-[#525866] text-[12px]">{users.length === 0 ? '暂无扫码账号，请创建' : '未找到匹配的账号'}</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="table-header"><tr><th className="px-4 py-2.5 text-left font-medium text-[#525866]">账号名</th><th className="px-4 py-2.5 text-left font-medium text-[#525866]">状态</th><th className="px-4 py-2.5 text-left font-medium text-[#525866]">创建时间</th><th className="px-4 py-2.5 text-right font-medium text-[#525866]">操作</th></tr></thead>
              <tbody>{filtered.map((u) => (
                <tr key={u.id} className="table-row border-t border-[#E5E7EB]">
                  <td className="px-4 py-2.5 text-[#0F1117] font-semibold">{u.username}</td>
                  <td className="px-4 py-2.5"><span className="badge badge-success">启用</span></td>
                  <td className="px-4 py-2.5 text-[#525866]">{new Date(u.created_at).toLocaleDateString('zh-CN')}</td>
                  <td className="px-4 py-2.5 text-right"><div className="flex items-center justify-end gap-0.5">
                    <button onClick={() => copyUsername(u.username, u.id)} className="p-1 rounded hover:bg-[#EEEDFB] text-[#5B5FC7] transition-colors">{copiedId === u.id ? <CheckCircle2 className="w-3 h-3" /> : <Copy className="w-3 h-3" />}</button>
                    <button onClick={() => handleDelete(u.id)} className="p-1 rounded hover:bg-[#FEE2E2] text-[#EF4444] transition-colors"><Trash2 className="w-3 h-3" /></button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
