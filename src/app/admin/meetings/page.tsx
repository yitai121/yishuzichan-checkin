'use client';

import { useState, useEffect } from 'react';

interface Meeting {
  id: string;
  name: string;
  location: string | null;
  start_at: string | null;
  is_active: boolean;
  created_at: string;
}

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [startAt, setStartAt] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

  const fetchMeetings = async () => {
    const res = await fetch('/api/meetings').then((r) => r.json());
    if (res.success) setMeetings(res.data);
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  const resetForm = () => {
    setName('');
    setLocation('');
    setStartAt('');
    setEditingId(null);
    setShowForm(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const url = editingId ? `/api/meetings/${editingId}` : '/api/meetings';
      const method = editingId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          location: location || null,
          start_at: startAt || null,
        }),
      }).then((r) => r.json());

      if (res.success) {
        showToast(editingId ? '会议已更新' : '会议已创建');
        resetForm();
        fetchMeetings();
      } else {
        showToast(res.error || '操作失败');
      }
    } catch {
      showToast('网络错误');
    }
    setLoading(false);
  };

  const handleEdit = (m: Meeting) => {
    setEditingId(m.id);
    setName(m.name);
    setLocation(m.location || '');
    setStartAt(m.start_at ? m.start_at.slice(0, 16) : '');
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该会议？关联的参会人和签到记录也会被删除。')) return;
    const res = await fetch(`/api/meetings/${id}`, { method: 'DELETE' }).then((r) => r.json());
    if (res.success) {
      showToast('会议已删除');
      fetchMeetings();
    } else {
      showToast(res.error || '删除失败');
    }
  };

  const handleActivate = async (id: string) => {
    const res = await fetch(`/api/meetings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: true }),
    }).then((r) => r.json());
    if (res.success) {
      showToast('已设为当前会议');
      fetchMeetings();
    } else {
      showToast(res.error || '操作失败');
    }
  };

  return (
    <div className="p-6">
      {/* Toast */}
      {toast && (
        <div className="fixed top-4 right-4 bg-[#111827] text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">会议管理</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">创建和管理签到会议</p>
        </div>
        <button
          onClick={() => { resetForm(); setShowForm(true); }}
          className="px-4 py-2 bg-[#5B5FC7] text-white text-sm font-medium rounded-lg hover:bg-[#4A4EB0] transition-colors"
        >
          新建会议
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40" onClick={resetForm}>
          <form
            onSubmit={handleSubmit}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl animate-slide-up"
          >
            <h2 className="text-lg font-semibold text-[#111827] mb-4">
              {editingId ? '编辑会议' : '新建会议'}
            </h2>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1">会议名称 *</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/30"
                  placeholder="如：亿数嘉年华开幕式"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1">地点</label>
                <input
                  type="text"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/30"
                  placeholder="如：主会场A厅"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#111827] mb-1">开始时间</label>
                <input
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/30"
                />
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 py-2 text-sm text-[#6B7280] border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] transition-colors"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="flex-1 py-2 text-sm bg-[#5B5FC7] text-white font-medium rounded-lg hover:bg-[#4A4EB0] disabled:opacity-50 transition-colors"
              >
                {loading ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Meeting list */}
      <div className="space-y-3">
        {meetings.length === 0 ? (
          <div className="text-center py-16 text-[#6B7280]">
            <p className="text-3xl mb-2">📋</p>
            <p className="text-sm">暂无会议，点击上方按钮创建</p>
          </div>
        ) : (
          meetings.map((m) => (
            <div
              key={m.id}
              className={`bg-white rounded-xl border p-4 flex items-center justify-between ${
                m.is_active ? 'border-[#5B5FC7]/30 bg-[#EEEDFB]/30' : 'border-[#E5E7EB]'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-[#111827] truncate">{m.name}</h3>
                  {m.is_active && (
                    <span className="px-1.5 py-0.5 text-[10px] font-medium bg-[#5B5FC7] text-white rounded">
                      当前
                    </span>
                  )}
                </div>
                <p className="text-xs text-[#6B7280] mt-0.5">
                  {m.location || '未设置地点'}
                  {m.start_at && ` · ${new Date(m.start_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}`}
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-3">
                {!m.is_active && (
                  <button
                    onClick={() => handleActivate(m.id)}
                    className="px-2.5 py-1.5 text-xs text-[#5B5FC7] border border-[#5B5FC7]/30 rounded-lg hover:bg-[#EEEDFB] transition-colors"
                  >
                    激活
                  </button>
                )}
                <button
                  onClick={() => handleEdit(m)}
                  className="px-2.5 py-1.5 text-xs text-[#6B7280] border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] transition-colors"
                >
                  编辑
                </button>
                <button
                  onClick={() => handleDelete(m.id)}
                  className="px-2.5 py-1.5 text-xs text-[#EF4444] border border-[#EF4444]/30 rounded-lg hover:bg-[#FEE2E2] transition-colors"
                >
                  删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
