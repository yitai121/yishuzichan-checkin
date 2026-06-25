'use client';

import { useState, useEffect } from 'react';

interface Meeting {
  id: string;
  name: string;
  is_active: boolean;
}

export default function ExportPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState('');

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

  const handleExport = async () => {
    if (!selectedMeeting) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/export/${selectedMeeting}`).then((r) => r.json());
      if (res.success) {
        // Download from base64
        const byteCharacters = atob(res.data.base64);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: res.data.content_type });
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = res.data.filename;
        link.click();
        window.URL.revokeObjectURL(url);
        showToast('导出成功');
      } else {
        showToast(res.error || '导出失败');
      }
    } catch {
      showToast('导出失败');
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

      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#111827]">数据导出</h1>
        <p className="text-sm text-[#6B7280] mt-0.5">导出会议签到记录为 Excel 文件</p>
      </div>

      <div className="bg-white rounded-xl border border-[#E5E7EB] p-6 max-w-lg">
        <div className="mb-4">
          <label className="block text-sm font-medium text-[#111827] mb-1.5">选择会议</label>
          <select
            value={selectedMeeting}
            onChange={(e) => setSelectedMeeting(e.target.value)}
            className="w-full px-3 py-2.5 text-sm border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/30"
          >
            {meetings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} {m.is_active ? '(当前)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="bg-[#F9FAFB] rounded-lg p-4 mb-4">
          <h3 className="text-sm font-medium text-[#111827] mb-2">导出内容</h3>
          <ul className="text-xs text-[#6B7280] space-y-1">
            <li>- 参会人姓名、手机号、岗位、单位、备注</li>
            <li>- 签到状态（已签到/未签到）</li>
            <li>- 签到时间</li>
          </ul>
        </div>

        <button
          onClick={handleExport}
          disabled={loading || !selectedMeeting}
          className="w-full py-2.5 bg-[#5B5FC7] text-white text-sm font-medium rounded-lg hover:bg-[#4A4EB0] disabled:opacity-50 transition-colors"
        >
          {loading ? '导出中...' : '导出 Excel'}
        </button>
      </div>
    </div>
  );
}
