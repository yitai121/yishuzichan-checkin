'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';

interface Meeting {
  id: string;
  name: string;
  is_active: boolean;
}

interface Attendee {
  id: string;
  name: string;
  position: string | null;
  company: string | null;
  signin_code: string;
}

export default function QRCodesPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<string>('');
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);

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

  const generateQRCodes = useCallback(async () => {
    if (attendees.length === 0) return;
    setGenerating(true);
    const urls: Record<string, string> = {};
    for (const a of attendees) {
      try {
        const qrData = JSON.stringify({ code: a.signin_code, attendee_id: a.id });
        const dataUrl = await QRCode.toDataURL(qrData, {
          width: 200,
          margin: 2,
          color: { dark: '#111827', light: '#FFFFFF' },
        });
        urls[a.id] = dataUrl;
      } catch {
        // skip
      }
    }
    setQrUrls(urls);
    setGenerating(false);
  }, [attendees]);

  useEffect(() => {
    if (attendees.length > 0 && attendees.length <= 500) {
      generateQRCodes();
    }
  }, [attendees, generateQRCodes]);

  const downloadSingle = async (a: Attendee) => {
    const dataUrl = qrUrls[a.id];
    if (!dataUrl) return;
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = `${a.name}-签到码.png`;
    link.click();
  };

  const downloadAllPDF = async () => {
    if (attendees.length === 0) return;
    setLoading(true);
    showToast('正在生成 PDF...');

    try {
      const { default: jsPDF } = await import('jspdf');
      const { default: html2canvas } = await import('html2canvas');

      // Create a temporary container for rendering
      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;padding:20px;background:white;';
      document.body.appendChild(container);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const itemsPerPage = 9;
      const cols = 3;
      const rows = 3;

      for (let page = 0; page < Math.ceil(attendees.length / itemsPerPage); page++) {
        if (page > 0) pdf.addPage();

        const pageAttendees = attendees.slice(page * itemsPerPage, (page + 1) * itemsPerPage);
        container.innerHTML = '';

        const grid = document.createElement('div');
        grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:15px;';

        for (const a of pageAttendees) {
          const cell = document.createElement('div');
          cell.style.cssText = 'text-align:center;padding:10px;';
          const qrData = JSON.stringify({ code: a.signin_code, attendee_id: a.id });
          const qrDataUrl = await QRCode.toDataURL(qrData, {
            width: 150,
            margin: 1,
            color: { dark: '#111827', light: '#FFFFFF' },
          });
          cell.innerHTML = `
            <img src="${qrDataUrl}" style="width:120px;height:120px;margin:0 auto;display:block;" />
            <div style="margin-top:6px;font-size:13px;font-weight:600;color:#111827;">${a.name}</div>
            <div style="font-size:11px;color:#6B7280;">${a.position || ''}</div>
          `;
          grid.appendChild(cell);
        }
        container.appendChild(grid);

        // Wait for rendering
        await new Promise((resolve) => setTimeout(resolve, 100));

        const canvas = await html2canvas(container, { scale: 2, useCORS: true });
        const imgData = canvas.toDataURL('image/png');
        pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      }

      document.body.removeChild(container);

      const meeting = meetings.find((m) => m.id === selectedMeeting);
      pdf.save(`${meeting?.name || '签到'}-二维码.pdf`);
      showToast('PDF 已下载');
    } catch (err) {
      showToast('PDF 生成失败');
      console.error(err);
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
          <h1 className="text-xl font-bold text-[#111827]">二维码生成</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">为参会人生成专属签到二维码</p>
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
            onClick={downloadAllPDF}
            disabled={loading || attendees.length === 0}
            className="px-4 py-2 bg-[#5B5FC7] text-white text-sm font-medium rounded-lg hover:bg-[#4A4EB0] disabled:opacity-50 transition-colors"
          >
            {loading ? '生成中...' : '下载全部 PDF'}
          </button>
        </div>
      </div>

      {generating ? (
        <div className="text-center py-12 text-[#6B7280]">
          <p className="text-sm">正在生成二维码...</p>
        </div>
      ) : attendees.length === 0 ? (
        <div className="text-center py-16 text-[#6B7280]">
          <p className="text-3xl mb-2">📱</p>
          <p className="text-sm">暂无参会人，请先在参会名单中导入</p>
        </div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {attendees.map((a) => (
            <div
              key={a.id}
              className="bg-white rounded-xl border border-[#E5E7EB] p-3 text-center hover:shadow-md transition-shadow group"
            >
              {qrUrls[a.id] ? (
                <img
                  src={qrUrls[a.id]}
                  alt={`${a.name} QR`}
                  className="w-full aspect-square object-contain rounded-lg mb-2"
                />
              ) : (
                <div className="w-full aspect-square bg-[#F3F4F6] rounded-lg mb-2 flex items-center justify-center">
                  <span className="text-xs text-[#9CA3AF]">生成中</span>
                </div>
              )}
              <p className="text-xs font-medium text-[#111827] truncate">{a.name}</p>
              <p className="text-[10px] text-[#9CA3AF] truncate">{a.position || ''}</p>
              <button
                onClick={() => downloadSingle(a)}
                className="mt-1.5 px-2 py-1 text-[10px] text-[#5B5FC7] border border-[#5B5FC7]/30 rounded hover:bg-[#EEEDFB] transition-colors opacity-0 group-hover:opacity-100"
              >
                下载 PNG
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
