'use client';

import { useState, useEffect, useRef } from 'react';
import * as XLSX from 'xlsx';
import { Plus, Upload, Download, Loader2, X, Pencil, Trash2, Users, Search, CheckCircle, Clock, UserCheck } from 'lucide-react';

interface Meeting { id: string; name: string; is_active: boolean; }
interface Attendee { 
  id: string; 
  name: string; 
  phone: string | null; 
  company: string | null; 
  signin_code: string;
  checked_in: boolean;
  checkin_at: string | null;
}
interface PreviewRow { name: string; phone?: string; company?: string; }

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
  const [editCompany, setEditCompany] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  useEffect(() => {
    fetch('/api/meetings').then((r) => r.json()).then((res) => {
      if (res.success) {
        setMeetings(res.data);
        const active = res.data.find((m: Meeting) => m.is_active);
        if (active) setSelectedMeeting(active.id);
        else if (res.data.length > 0) setSelectedMeeting(res.data[0].id);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedMeeting) return;
    fetchAttendees();
  }, [selectedMeeting]);

  const fetchAttendees = async () => {
    const res = await fetch(`/api/attendees?meeting_id=${selectedMeeting}`).then((r) => r.json());
    if (res.success) {
      // Fetch check-in status for each attendee
      const attendeesWithStatus = await Promise.all(
        res.data.map(async (a: Attendee) => {
          try {
            const checkinRes = await fetch(`/api/checkin?attendee_id=${a.id}&meeting_id=${selectedMeeting}`).then((r) => r.json());
            return {
              ...a,
              checked_in: checkinRes.success && checkinRes.data?.checked_in,
              checkin_at: checkinRes.success ? checkinRes.data?.checkin_at : null,
            };
          } catch {
            return { ...a, checked_in: false, checkin_at: null };
          }
        })
      );
      setAttendees(attendeesWithStatus);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      try {
        const data = new Uint8Array(evt.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet);
        const rows: PreviewRow[] = json.map((row) => ({
          name: String(row['姓名'] || row['name'] || '').trim(),
          phone: String(row['电话'] || row['手机号'] || row['phone'] || '').trim(),
          company: String(row['所属分公司'] || row['单位'] || row['company'] || '').trim(),
        })).filter((r) => r.name);
        if (rows.length === 0) { showToast('未找到有效数据，请检查表头'); return; }
        setPreviewData(rows); setShowPreview(true);
      } catch { showToast('文件解析失败'); }
    };
    reader.readAsArrayBuffer(file);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleImport = async () => {
    if (!selectedMeeting || previewData.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch('/api/attendees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meeting_id: selectedMeeting, attendees: previewData }) }).then((r) => r.json());
      if (res.success) {
        const { imported, skipped, failed, skippedDetails, errorDetails } = res.data;
        let msg = `成功导入 ${imported} 人`;
        if (skipped > 0) msg += `，跳过 ${skipped} 人（重复）`;
        if (failed > 0) msg += `，失败 ${failed} 人`;
        showToast(msg);
        
        // Show detailed results if there are issues
        if (skipped > 0 || failed > 0) {
          console.log('导入详情:', { skippedDetails, errorDetails });
        }
        
        setShowPreview(false); setPreviewData([]); fetchAttendees();
      }
      else { showToast(res.error || '导入失败'); }
    } catch { showToast('网络错误'); }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定删除该参会人？')) return;
    const res = await fetch(`/api/attendees/${id}`, { method: 'DELETE' }).then((r) => r.json());
    if (res.success) { showToast('已删除'); fetchAttendees(); }
    else { showToast(res.error || '删除失败'); }
  };

  const handleEdit = (a: Attendee) => { setEditingAttendee(a); setEditName(a.name); setEditPhone(a.phone || ''); setEditCompany(a.company || ''); setShowEditForm(true); };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault(); if (!editingAttendee) return; setLoading(true);
    try {
      const res = await fetch(`/api/attendees/${editingAttendee.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: editName, phone: editPhone || null, company: editCompany || null }) }).then((r) => r.json());
      if (res.success) { showToast('已更新'); setShowEditForm(false); fetchAttendees(); }
      else { showToast(res.error || '更新失败'); }
    } catch { showToast('网络错误'); }
    setLoading(false);
  };

  // Download Excel template
  const handleDownloadTemplate = () => {
    const templateData = [
      { '姓名': '张三', '电话': '13800138000', '所属分公司': '杭州分公司' },
      { '姓名': '李四', '电话': '13900139000', '所属分公司': '上海分公司' },
      { '姓名': '王五', '电话': '13700137000', '所属分公司': '北京分公司' },
    ];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, '参会人模板');
    XLSX.writeFile(wb, '参会人导入模板.xlsx');
  };

  const handleAddSingle = async () => {
    if (!selectedMeeting) return;
    const name = prompt('请输入姓名：'); if (!name?.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/attendees', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ meeting_id: selectedMeeting, attendees: [{ name: name.trim() }] }) }).then((r) => r.json());
      if (res.success) { showToast('已添加'); fetchAttendees(); }
      else { showToast(res.error || '添加失败'); }
    } catch { showToast('网络错误'); }
    setLoading(false);
  };

  const handleManualCheckin = async (attendeeId: string) => {
    if (!confirm('确定要为此人现场补签？')) return;
    setLoading(true);
    try {
      const res = await fetch('/api/checkin', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' }, 
        body: JSON.stringify({ attendee_id: attendeeId, meeting_id: selectedMeeting, manual: true }) 
      }).then((r) => r.json());
      if (res.success) { showToast('已补签'); fetchAttendees(); }
      else { showToast(res.error || '补签失败'); }
    } catch { showToast('网络错误'); }
    setLoading(false);
  };

  const formatRelativeTime = (dateStr: string | null) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffMins < 1) return '刚刚';
    if (diffMins < 60) return `${diffMins} 分钟前`;
    if (diffHours < 24) return `${diffHours} 小时前`;
    if (diffDays < 7) return `${diffDays} 天前`;
    return date.toLocaleDateString('zh-CN');
  };

  const filtered = attendees.filter((a) => { if (!searchQuery) return true; const q = searchQuery.toLowerCase(); return a.name.toLowerCase().includes(q) || (a.phone && a.phone.includes(q)) || (a.company && a.company.toLowerCase().includes(q)); });

  return (
    <div>
      {toast && <div className="toast toast-success">{toast}</div>}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[16px] font-semibold text-[#0F1117]">参会名单</h1>
          <p className="text-[12px] text-[#99A0AE] mt-0.5">管理参会人员，支持 Excel 批量导入</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedMeeting} onChange={(e) => setSelectedMeeting(e.target.value)} className="input-field w-auto text-[12px] font-medium">
            {meetings.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button onClick={handleAddSingle} className="btn-secondary"><Plus className="w-3.5 h-3.5" />手动添加</button>
          <button onClick={handleDownloadTemplate} className="btn-secondary"><Download className="w-3.5 h-3.5" />下载模板</button>
          <label className="btn-primary cursor-pointer"><Upload className="w-3.5 h-3.5" />上传 Excel<input ref={fileInputRef} type="file" accept=".xlsx,.xls,.csv" onChange={handleFileUpload} className="hidden" /></label>
        </div>
      </div>

      {showPreview && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40" onClick={() => setShowPreview(false)}>
          <div onClick={(e) => e.stopPropagation()} className="card p-5 w-full max-w-xl max-h-[70vh] flex flex-col animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] font-semibold text-[#0F1117]">预览导入 ({previewData.length} 条)</h2>
              <button onClick={() => setShowPreview(false)} className="p-1 rounded hover:bg-[#F6F7F9]"><X className="w-3.5 h-3.5 text-[#99A0AE]" /></button>
            </div>
            <div className="flex-1 overflow-auto border border-[#E5E7EB] rounded-lg mb-3">
              <table className="w-full text-[12px]">
                <thead className="table-header sticky top-0"><tr><th className="px-3 py-2 text-left font-medium text-[#525866]">姓名</th><th className="px-3 py-2 text-left font-medium text-[#525866]">电话</th><th className="px-3 py-2 text-left font-medium text-[#525866]">所属分公司</th></tr></thead>
                <tbody>{previewData.map((row, i) => (<tr key={i} className="table-row border-t border-[#E5E7EB]"><td className="px-3 py-2 text-[#0F1117] font-medium">{row.name}</td><td className="px-3 py-2 text-[#525866]">{row.phone || '-'}</td><td className="px-3 py-2 text-[#525866]">{row.company || '-'}</td></tr>))}</tbody>
              </table>
            </div>
            <div className="flex gap-2"><button onClick={() => setShowPreview(false)} className="btn-secondary flex-1 justify-center">取消</button><button onClick={handleImport} disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-50">{loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}{loading ? '导入中...' : '确认导入'}</button></div>
          </div>
        </div>
      )}

      {showEditForm && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-40" onClick={() => setShowEditForm(false)}>
          <form onSubmit={handleUpdate} onClick={(e) => e.stopPropagation()} className="card p-5 w-full max-w-sm animate-fade-in-up">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-[14px] font-semibold text-[#0F1117]">编辑参会人</h2>
              <button type="button" onClick={() => setShowEditForm(false)} className="p-1 rounded hover:bg-[#F6F7F9]"><X className="w-3.5 h-3.5 text-[#99A0AE]" /></button>
            </div>
            <div className="space-y-2.5">
              <input type="text" value={editName} onChange={(e) => setEditName(e.target.value)} required placeholder="姓名 *" className="input-field" />
              <input type="text" value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="电话" className="input-field" />
              <input type="text" value={editCompany} onChange={(e) => setEditCompany(e.target.value)} placeholder="所属分公司" className="input-field" />
            </div>
            <div className="flex gap-2 mt-3"><button type="button" onClick={() => setShowEditForm(false)} className="btn-secondary flex-1 justify-center">取消</button><button type="submit" disabled={loading} className="btn-primary flex-1 justify-center disabled:opacity-50">{loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}{loading ? '保存中...' : '保存'}</button></div>
          </form>
        </div>
      )}

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
          <span className="text-[12px] font-semibold text-[#0F1117]">共 {attendees.length} 人</span>
          <div className="relative"><Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#C9CDD4]" /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="搜索..." className="input-field w-[180px] pl-8 h-[32px] text-[12px]" /></div>
        </div>
        {filtered.length === 0 ? (
          <div className="py-12 text-center"><Users className="w-8 h-8 text-[#C9CDD4] mx-auto mb-2" strokeWidth={1.5} /><p className="text-[#525866] text-[12px]">{attendees.length === 0 ? '暂无参会人，请上传 Excel 或手动添加' : '未找到匹配的参会人'}</p></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="table-header">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-[#525866]">姓名</th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#525866]">电话</th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#525866]">所属分公司</th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#525866]">签到状态</th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#525866]">签到时间</th>
                  <th className="px-4 py-2.5 text-right font-medium text-[#525866]">操作</th>
                </tr>
              </thead>
              <tbody>{filtered.map((a) => (
                <tr key={a.id} className="table-row border-t border-[#E5E7EB]">
                  <td className="px-4 py-2.5 text-[#0F1117] font-semibold">{a.name}</td>
                  <td className="px-4 py-2.5 text-[#525866]">{a.phone || '-'}</td>
                  <td className="px-4 py-2.5 text-[#525866]">{a.company || '-'}</td>
                  <td className="px-4 py-2.5">
                    {a.checked_in ? (
                      <span className="badge badge-success inline-flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" strokeWidth={1.5} />已签到
                      </span>
                    ) : (
                      <span className="badge badge-warning inline-flex items-center gap-1">
                        <Clock className="w-3 h-3" strokeWidth={1.5} />未签到
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-[#525866]" title={a.checkin_at ? new Date(a.checkin_at).toLocaleString('zh-CN') : ''}>
                    {formatRelativeTime(a.checkin_at)}
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-0.5">
                      {!a.checked_in && (
                        <button onClick={() => handleManualCheckin(a.id)} className="p-1 rounded hover:bg-[#ECFDF5] text-[#10B981] transition-colors" title="现场补签">
                          <UserCheck className="w-3 h-3" />
                        </button>
                      )}
                      <button onClick={() => handleEdit(a)} className="p-1 rounded hover:bg-[#EEEDFB] text-[#5B5FC7] transition-colors"><Pencil className="w-3 h-3" /></button>
                      <button onClick={() => handleDelete(a.id)} className="p-1 rounded hover:bg-[#FEE2E2] text-[#EF4444] transition-colors"><Trash2 className="w-3 h-3" /></button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
