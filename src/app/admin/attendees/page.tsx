'use client';

import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import {
  Plus,
  Upload,
  Loader2,
  X,
  Pencil,
  Trash2,
  Users,
  FileSpreadsheet,
  Search,
} from 'lucide-react';

interface Meeting {
  id: string;
  name: string;
  is_active: boolean;
}

interface Attendee {
  id: string;
  name: string;
  phone: string | null;
  position: string | null;
  company: string | null;
  note: string | null;
  signin_code: string;
}

interface PreviewRow {
  name: string;
  phone?: string;
  position?: string;
  company?: string;
  note?: string;
}

export default function AttendeesPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<string>('');
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [previewData, setPreviewData] = useState<PreviewRow[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showEditForm, setShowEditForm] = useState(false);
  const [editingAttendee, setEditingAttendee] = useState<Attendee | null>(null);
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editPosition, setEditPosition] = useState('');
  const [editCompany, setEditCompany] = useState('');
  const [editNote, setEditNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  useEffect(() => {
    fetch('/api/meetings')
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setMeetings(res.data);
          const active = res.data.find((m: Meeting) => m.is_active);
          if (active) setSelectedMeeting(active.id);
          else if (res.data.length > 0) setSelectedMeeting(res.data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedMeeting) return;
    fetch(`/api/attendees?meeting_id=${selectedMeeting}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.success) setAttendees(res.data);
      })
      .catch(() => {});
  }, [selectedMeeting]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);

        const rows: PreviewRow[] = json.map((row) => ({
          name: String(row['姓名'] || row['name'] || '').trim(),
          phone: String(row['手机号'] || row['phone'] || '').trim(),
          position: String(row['岗位'] || row['position'] || '').trim(),
          company: String(row['单位'] || row['company'] || '').trim(),
          note: String(row['备注'] || row['note'] || '').trim(),
        })).filter((r) => r.name);

        if (rows.length === 0) {
          showToast('未找到有效数据，请检查表头（需要包含"姓名"列）');
          return;
        }
        setPreviewData(rows);
        setShowPreview(true);
      } catch {
        showToast('文件解析失败，请检查格式');
      }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = async () => {
    if (!selectedMeeting || previewData.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/attendees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ meeting_id: selectedMeeting, attendees: previewData }),
      }).then((r) => r.json());

      if (res.success) {
        showToast(`成功导入 ${res.count} 人`);
        setShowPreview(false);
        setPreviewData([]);
        const attendeesRes = await fetch(`/api/attendees?meeting_id=${selectedMeeting}`).then((r) => r.json());
        if (attendeesRes.success) setAttendees(attendeesRes.data);
      } else {
        showToast(res.error || '导入失败');
      }
    } catch {
      showToast('网络错误');
    }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该参会人？')) return;
    const res = await fetch(`/api/attendees/${id}`, { method: 'DELETE' }).then((r) => r.json());
    if (res.success) {
      showToast('已删除');
      setAttendees((prev) => prev.filter((a) => a.id !== id));
    } else {
      showToast(res.error || '删除失败');
    }
  };

  const handleEdit = (a: Attendee) => {
    setEditingAttendee(a);
    setEditName(a.name);
    setEditPhone(a.phone || '');
    setEditPosition(a.position || '');
    setEditCompany(a.company || '');
    setEditNote(a.note || '');
    setShowEditForm(true);
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAttendee) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/attendees/${editingAttendee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: editName,
          phone: editPhone || null,
          position: editPosition || null,
          company: editCompany || null,
          note: editNote || null,
        }),
      }).then((r) => r.json());

      if (res.success) {
        showToast('已更新');
        setShowEditForm(false);
        setAttendees((prev) =>
          prev.map((a) =>
            a.id === editingAttendee.id
              ? { ...a, name: editName, phone: editPhone || null, position: editPosition || null, company: editCompany || null, note: editNote || null }
              : a
          )
        );
      } else {
        showToast(res.error || '更新失败');
      }
    } catch {
      showToast('网络错误');
    }
    setLoading(false);
  };

  const handleAddSingle = async () => {
    if (!selectedMeeting) return;
    const name = prompt('请输入姓名：');
    if (!name?.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/attendees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          meeting_id: selectedMeeting,
          attendees: [{ name: name.trim() }],
        }),
      }).then((r) => r.json());
      if (res.success) {
        showToast('已添加');
        const attendeesRes = await fetch(`/api/attendees?meeting_id=${selectedMeeting}`).then((r) => r.json());
        if (attendeesRes.success) setAttendees(attendeesRes.data);
      } else {
        showToast(res.error || '添加失败');
      }
    } catch {
      showToast('网络错误');
    }
    setLoading(false);
  };

  const filteredAttendees = attendees.filter((a) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      a.name.toLowerCase().includes(q) ||
      (a.phone && a.phone.includes(q)) ||
      (a.company && a.company.toLowerCase().includes(q)) ||
      (a.position && a.position.toLowerCase().includes(q))
    );
  });

  return (
    <div className="animate-fade-in-up">
      {/* Toast */}
      {toast && (
        <div className="fixed top-6 right-6 bg-[#1A1D24] text-white text-sm px-4 py-3 rounded-xl shadow-lg z-50 animate-toast-in flex items-center gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[#10B981]" />
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[20px] font-bold text-[#1A1D24]">参会名单</h1>
          <p className="text-[13px] text-[#5A6171] mt-1">管理参会人员，支持 Excel 批量导入</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedMeeting}
            onChange={(e) => setSelectedMeeting(e.target.value)}
            className="input-field w-auto text-[13px] font-medium"
          >
            {meetings.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <button onClick={handleAddSingle} className="btn-secondary">
            <Plus className="w-4 h-4" />
            手动添加
          </button>
          <label className="btn-primary cursor-pointer">
            <Upload className="w-4 h-4" />
            上传 Excel
            <input
              ref={fileInputRef}
              type="file"
              accept=".xlsx,.xls,.csv"
              onChange={handleFileUpload}
              className="hidden"
            />
          </label>
        </div>
      </div>

      {/* Preview modal */}
      {showPreview && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40" onClick={() => setShowPreview(false)}>
          <div onClick={(e) => e.stopPropagation()} className="card p-6 w-full max-w-2xl max-h-[80vh] flex flex-col animate-fade-in-up">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-[16px] font-semibold text-[#1A1D24]">
                预览导入数据 ({previewData.length} 条)
              </h2>
              <button onClick={() => setShowPreview(false)} className="p-1 rounded-lg hover:bg-[#F4F5F8]">
                <X className="w-4 h-4 text-[#9CA3AF]" />
              </button>
            </div>
            <div className="flex-1 overflow-auto border border-[#E5E7EB] rounded-xl mb-4">
              <table className="w-full text-[13px]">
                <thead className="table-header sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left font-medium text-[#5A6171]">姓名</th>
                    <th className="px-4 py-3 text-left font-medium text-[#5A6171]">手机号</th>
                    <th className="px-4 py-3 text-left font-medium text-[#5A6171]">岗位</th>
                    <th className="px-4 py-3 text-left font-medium text-[#5A6171]">单位</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i} className="table-row border-t border-[#E5E7EB]">
                      <td className="px-4 py-3 text-[#1A1D24] font-medium">{row.name}</td>
                      <td className="px-4 py-3 text-[#5A6171]">{row.phone || '-'}</td>
                      <td className="px-4 py-3 text-[#5A6171]">{row.position || '-'}</td>
                      <td className="px-4 py-3 text-[#5A6171]">{row.company || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-3">
              <button onClick={() => setShowPreview(false)} className="btn-secondary flex-1 justify-center">取消</button>
              <button onClick={handleImport} disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? '导入中...' : '确认导入'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-40" onClick={() => setShowEditForm(false)}>
          <form
            onSubmit={handleUpdate}
            onClick={(e) => e.stopPropagation()}
            className="card p-6 w-full max-w-md animate-fade-in-up"
          >
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-[16px] font-semibold text-[#1A1D24]">编辑参会人</h2>
              <button type="button" onClick={() => setShowEditForm(false)} className="p-1 rounded-lg hover:bg-[#F4F5F8]">
                <X className="w-4 h-4 text-[#9CA3AF]" />
              </button>
            </div>
            <div className="space-y-4">
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required placeholder="姓名 *" className="input-field" />
              <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="手机号" className="input-field" />
              <input type="text" value={editPosition} onChange={(e) => setEditPosition(e.target.value)} placeholder="岗位" className="input-field" />
              <input type="text" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder="单位" className="input-field" />
              <input type="text" value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="备注" className="input-field" />
            </div>
            <div className="flex gap-3 mt-6">
              <button type="button" onClick={() => setShowEditForm(false)} className="btn-secondary flex-1 justify-center">取消</button>
              <button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-50">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                {loading ? '保存中...' : '保存'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-[13px] font-semibold text-[#1A1D24]">共 {attendees.length} 人</span>
            <span className="text-[11px] text-[#9CA3AF]">Excel 表头：姓名、手机号、岗位、单位、备注</span>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF]" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索..."
              className="input-field w-[200px] pl-9 h-[36px] text-[13px]"
            />
          </div>
        </div>
        {filteredAttendees.length === 0 ? (
          <div className="py-16 text-center">
            <Users className="w-10 h-10 text-[#9CA3AF] mx-auto mb-3" strokeWidth={1.5} />
            <p className="text-[#5A6171] text-sm">
              {attendees.length === 0 ? '暂无参会人，请上传 Excel 或手动添加' : '未找到匹配的参会人'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead className="table-header">
                <tr>
                  <th className="px-5 py-3 text-left font-medium text-[#5A6171]">姓名</th>
                  <th className="px-5 py-3 text-left font-medium text-[#5A6171]">手机号</th>
                  <th className="px-5 py-3 text-left font-medium text-[#5A6171]">岗位</th>
                  <th className="px-5 py-3 text-left font-medium text-[#5A6171]">单位</th>
                  <th className="px-5 py-3 text-left font-medium text-[#5A6171]">签到码</th>
                  <th className="px-5 py-3 text-right font-medium text-[#5A6171]">操作</th>
                </tr>
              </thead>
              <tbody>
                {filteredAttendees.map((a) => (
                  <tr key={a.id} className="table-row border-t border-[#E5E7EB]">
                    <td className="px-5 py-3 text-[#1A1D24] font-semibold">{a.name}</td>
                    <td className="px-5 py-3 text-[#5A6171]">{a.phone || '-'}</td>
                    <td className="px-5 py-3 text-[#5A6171]">{a.position || '-'}</td>
                    <td className="px-5 py-3 text-[#5A6171]">{a.company || '-'}</td>
                    <td className="px-5 py-3">
                      <code className="text-[11px] bg-[#F4F5F8] px-2 py-0.5 rounded-md text-[#5A6171] font-mono">
                        {a.signin_code.slice(0, 8)}...
                      </code>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => handleEdit(a)} className="p-1.5 rounded-lg hover:bg-[#EEEDFB] text-[#5B5FC7] transition-colors">
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={() => handleDelete(a.id)} className="p-1.5 rounded-lg hover:bg-[#FEE2E2] text-[#EF4444] transition-colors">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
