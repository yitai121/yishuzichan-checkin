'use client';

import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  // Fetch meetings
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

  // Fetch attendees
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
        // Refresh attendees
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

  return (
    <div className="p-6">
      {toast && (
        <div className="fixed top-4 right-4 bg-[#111827] text-white text-sm px-4 py-2 rounded-lg shadow-lg z-50 animate-fade-in">
          {toast}
        </div>
      )}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">参会名单</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">管理参会人员，支持 Excel 批量导入</p>
        </div>
        <div className="flex items-center gap-2">
          <select
            value={selectedMeeting}
            onChange={(e) => setSelectedMeeting(e.target.value)}
            className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/30"
          >
            {meetings.map((m) => (
              <option key={m.id} value={m.id}>{m.name}</option>
            ))}
          </select>
          <button
            onClick={handleAddSingle}
            className="px-3 py-2 text-sm text-[#5B5FC7] border border-[#5B5FC7]/30 rounded-lg hover:bg-[#EEEDFB] transition-colors"
          >
            手动添加
          </button>
          <label className="px-4 py-2 bg-[#5B5FC7] text-white text-sm font-medium rounded-lg hover:bg-[#4A4EB0] transition-colors cursor-pointer">
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
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40" onClick={() => setShowPreview(false)}>
          <div onClick={(e) => e.stopPropagation()} className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[80vh] flex flex-col shadow-xl animate-slide-up">
            <h2 className="text-lg font-semibold text-[#111827] mb-3">
              预览导入数据 ({previewData.length} 条)
            </h2>
            <div className="flex-1 overflow-auto border border-[#E5E7EB] rounded-lg mb-4">
              <table className="w-full text-sm">
                <thead className="bg-[#F3F4F6] sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium text-[#6B7280]">姓名</th>
                    <th className="px-3 py-2 text-left font-medium text-[#6B7280]">手机号</th>
                    <th className="px-3 py-2 text-left font-medium text-[#6B7280]">岗位</th>
                    <th className="px-3 py-2 text-left font-medium text-[#6B7280]">单位</th>
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i} className="border-t border-[#E5E7EB]">
                      <td className="px-3 py-1.5 text-[#111827]">{row.name}</td>
                      <td className="px-3 py-1.5 text-[#6B7280]">{row.phone || '-'}</td>
                      <td className="px-3 py-1.5 text-[#6B7280]">{row.position || '-'}</td>
                      <td className="px-3 py-1.5 text-[#6B7280]">{row.company || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowPreview(false)}
                className="flex-1 py-2 text-sm text-[#6B7280] border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleImport}
                disabled={loading}
                className="flex-1 py-2 text-sm bg-[#5B5FC7] text-white font-medium rounded-lg hover:bg-[#4A4EB0] disabled:opacity-50 transition-colors"
              >
                {loading ? '导入中...' : '确认导入'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit modal */}
      {showEditForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40" onClick={() => setShowEditForm(false)}>
          <form
            onSubmit={handleUpdate}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl p-6 w-full max-w-md shadow-xl animate-slide-up"
          >
            <h2 className="text-lg font-semibold text-[#111827] mb-4">编辑参会人</h2>
            <div className="space-y-3">
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required placeholder="姓名 *" className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/30" />
              <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="手机号" className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/30" />
              <input type="text" value={editPosition} onChange={(e) => setEditPosition(e.target.value)} placeholder="岗位" className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/30" />
              <input type="text" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder="单位" className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/30" />
              <input type="text" value={editNote} onChange={(e) => setEditNote(e.target.value)} placeholder="备注" className="w-full px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/30" />
            </div>
            <div className="flex gap-2 mt-5">
              <button type="button" onClick={() => setShowEditForm(false)} className="flex-1 py-2 text-sm text-[#6B7280] border border-[#E5E7EB] rounded-lg hover:bg-[#F3F4F6] transition-colors">取消</button>
              <button type="submit" disabled={loading} className="flex-1 py-2 text-sm bg-[#5B5FC7] text-white font-medium rounded-lg hover:bg-[#4A4EB0] disabled:opacity-50 transition-colors">{loading ? '保存中...' : '保存'}</button>
            </div>
          </form>
        </div>
      )}

      {/* Attendee list */}
      <div className="bg-white rounded-xl border border-[#E5E7EB]">
        <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
          <span className="text-sm font-medium text-[#111827]">共 {attendees.length} 人</span>
          <span className="text-xs text-[#9CA3AF]">Excel 表头：姓名、手机号、岗位、单位、备注</span>
        </div>
        {attendees.length === 0 ? (
          <div className="text-center py-12 text-[#6B7280]">
            <p className="text-3xl mb-2">👥</p>
            <p className="text-sm">暂无参会人，请上传 Excel 或手动添加</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[#F9FAFB]">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-[#6B7280]">姓名</th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#6B7280]">手机号</th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#6B7280]">岗位</th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#6B7280]">单位</th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#6B7280]">签到码</th>
                  <th className="px-4 py-2.5 text-right font-medium text-[#6B7280]">操作</th>
                </tr>
              </thead>
              <tbody>
                {attendees.map((a) => (
                  <tr key={a.id} className="border-t border-[#E5E7EB] hover:bg-[#F9FAFB]">
                    <td className="px-4 py-2.5 text-[#111827] font-medium">{a.name}</td>
                    <td className="px-4 py-2.5 text-[#6B7280]">{a.phone || '-'}</td>
                    <td className="px-4 py-2.5 text-[#6B7280]">{a.position || '-'}</td>
                    <td className="px-4 py-2.5 text-[#6B7280]">{a.company || '-'}</td>
                    <td className="px-4 py-2.5">
                      <code className="text-xs bg-[#F3F4F6] px-1.5 py-0.5 rounded text-[#6B7280]">
                        {a.signin_code.slice(0, 8)}...
                      </code>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button onClick={() => handleEdit(a)} className="text-xs text-[#5B5FC7] hover:underline mr-3">编辑</button>
                      <button onClick={() => handleDelete(a.id)} className="text-xs text-[#EF4444] hover:underline">删除</button>
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
