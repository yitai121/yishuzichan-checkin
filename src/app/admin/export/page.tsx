'use client';

import { useState, useEffect } from 'react';
import { Download, Loader2, FileSpreadsheet, CheckCircle2 } from 'lucide-react';

interface Meeting { id: string; name: string; is_active: boolean; }

export default function ExportPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

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

  const handleExport = async () => {
    if (!selectedMeeting) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/export/${selectedMeeting}`).then((r) => r.json());
      if (res.success) {
        const byteCharacters = atob(res.data.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) byteNumbers[i] = byteCharacters.charCodeAt(i);
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: res.data.content_type });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url; link.download = res.data.filename; link.click();
        window.URL.revokeObjectURL(url);
        showToast('导出成功');
      } else { showToast(res.error || '导出失败'); }
    } catch { showToast('导出失败'); }
    setLoading(false);
  };

  return (
    <div>
      {toast && <div className="toast toast-success">{toast}</div>}

      <div className="mb-6">
        <h1 className="text-[16px] font-semibold text-[#0F1117]">数据导出</h1>
        <p className="text-[12px] text-[#99A0AE] mt-0.5">导出会议签到记录为 Excel 文件</p>
      </div>

      <div className="card p-5 max-w-md">
        <div className="mb-4">
          <label className="block text-[11px] font-medium text-[#525866] mb-1">选择会议</label>
          <select value={selectedMeeting} onChange={(e) => setSelectedMeeting(e.target.value)} className="input-field">
            {meetings.map((m) => (
              <option key={m.id} value={m.id}>{m.name} {m.is_active ? '(当前)' : ''}</option>
            ))}
          </select>
        </div>

        <div className="bg-[#F6F7F9] rounded-lg p-3 mb-4 border border-[#E5E7EB]">
          <h3 className="text-[12px] font-semibold text-[#0F1117] mb-2 flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#5B5FC7]" strokeWidth={1.5} />
            导出内容
          </h3>
          <ul className="space-y-1.5">
            {['参会人姓名、手机号、岗位、单位、备注', '签到状态（已签到 / 未签到）', '签到时间'].map((item) => (
              <li key={item} className="flex items-center gap-1.5 text-[11px] text-[#525866]">
                <CheckCircle2 className="w-3 h-3 text-[#10B981] shrink-0" strokeWidth={2} />{item}
              </li>
            ))}
          </ul>
        </div>

        <button onClick={handleExport} disabled={loading || !selectedMeeting} className="btn-primary w-full justify-center disabled:opacity-50">
          {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
          {loading ? '导出中...' : '导出 Excel'}
        </button>
      </div>
    </div>
  );
}
