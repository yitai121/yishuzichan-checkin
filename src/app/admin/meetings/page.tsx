'use client';

import { useState, useEffect } from 'react';
import {
  Plus,
  Loader2,
  Calendar,
  MapPin,
  Clock,
  Pencil,
  Trash2,
  Zap,
  X,
} from 'lucide-react';

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

  useEffect(() => { fetchMeetings(); }, []);

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
        body: JSON.stringify({ name, location: location || null, start_at: startAt || null }),
      }).then((r) => r.json());

      if (res.success) {
        showToast(editingId ? '会议已更新' : '会议已创建');
        resetForm();
        fetchMeetings();
      } else {
        showToast(res.error || '操作失败');
      }
    } catch { showToast('网络错误'); }
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
    if (res.success) { showToast('会议已删除'); fetchMeetings(); }
    else { showToast(res.error || '删除失败'); }
  };

  const handleActivate = async (id: string) => {
    const res = await fetch(`/api/meetings/${id}/activate`, {
      method: 'PATCH',
    }).then((r) => r.json());
    if (res.success) { showToast('会议已激活'); fetchMeetings(); }
    else { showToast(res.error || '操作失败'); }
  };

  return (
    <div>
      {toast && (
        <div className="toast toast-success">{toast}</div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[16px] font-semibold text-[#0F1117]">会议管理</h1>
          <p className="text-[12px] text-[#99A0AE] mt-0.5">创建和管理签到会议</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="btn-primary">
          <Plus className="w-3.5 h-3.5" />
          新建会议
        </button>
      </div>

      {/* Form modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40" onClick={resetForm}>
          <form onSubmit={handleSubmit} onClick={(e) => e.stopPropagation()} className="card p-5 w-full max-w-md animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[14px] font-semibold text-[#0F1117]">{editingId ? '编辑会议' : '新建会议'}</h2>
              <button type="button" onClick={resetForm} className="p-1 rounded hover:bg-[#F6F7F9]">
                <X className="w-3.5 h-3.5 text-[#99A0AE]" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-[11px] font-medium text-[#525866] mb-1">会议名称 *</label>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} required className="input-field" placeholder="如：亿数·山海归序开幕式" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#525866] mb-1">地点</label>
                <input type="text" value={location} onChange={(e) => setLocation(e.target.value)} className="input-field" placeholder="如：主会场A厅" />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#525866] mb-1">开始时间</label>
                <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} className="input-field" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button type="button" onClick={resetForm} className="btn-secondary flex-1 justify-center">取消</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-50">
                {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                {loading ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Meeting list */}
      <div className="space-y-2">
        {meetings.length === 0 ? (
          <div className="card py-12 text-center">
            <Calendar className="w-8 h-8 text-[#C9CDD4] mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-[#525866] text-[12px]">暂无会议，点击上方按钮创建</p>
          </div>
        ) : (
          meetings.map((m, i) => (
            <div
              key={m.id}
              className={`card p-4 flex items-center justify-between animate-stagger-in ${m.is_active ? 'border-l-4 border-l-[#10B981] ring-1 ring-[#10B981]/15' : ''}`}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="text-[13px] font-semibold text-[#0F1117] truncate">{m.name}</h3>
                  {m.is_active && <span className="badge badge-success">进行中</span>}
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {m.location && (
                    <span className="flex items-center gap-1 text-[11px] text-[#99A0AE]">
                      <MapPin className="w-3 h-3" strokeWidth={1.5} />{m.location}
                    </span>
                  )}
                  {m.start_at && (
                    <span className="flex items-center gap-1 text-[11px] text-[#99A0AE]">
                      <Clock className="w-3 h-3" strokeWidth={1.5} />
                      {new Date(m.start_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' })}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-3">
                {!m.is_active ? (
                  <button onClick={() => handleActivate(m.id)} className="btn-primary text-[11px] px-2.5 py-1">
                    <Zap className="w-3 h-3" />激活
                  </button>
                ) : (
                  <button disabled className="btn-secondary text-[11px] px-2.5 py-1 opacity-50 cursor-not-allowed">
                    <Zap className="w-3 h-3" />已激活
                  </button>
                )}
                <button onClick={() => handleEdit(m)} className="btn-secondary text-[11px] px-2.5 py-1">
                  <Pencil className="w-3 h-3" />编辑
                </button>
                <button onClick={() => handleDelete(m.id)} className="btn-danger text-[11px] px-2.5 py-1">
                  <Trash2 className="w-3 h-3" />删除
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
