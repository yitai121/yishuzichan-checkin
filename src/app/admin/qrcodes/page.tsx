'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  Download,
  Loader2,
  QrCode,
  FileDown,
} from 'lucide-react';

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
          color: { dark: '#1A1D24', light: '#FFFFFF' },
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

      const container = document.createElement('div');
      container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;padding:20px;background:white;';
      document.body.appendChild(container);

      const pdf = new jsPDF('p', 'mm', 'a4');
      const itemsPerPage = 9;

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
            color: { dark: '#1A1D24', light: '#FFFFFF' },
          });
          cell.innerHTML = `
            <img src="${qrDataUrl}" style="width:120px;height:120px;margin:0 auto;display:block;" />
            <div style="margin-top:6px;font-size:13px;font-weight:600;color:#1A1D24;">${a.name}</div>
            <div style="font-size:11px;color:#5A6171;">${a.position || ''}</div>
          `;
          grid.appendChild(cell);
        }
        container.appendChild(grid);

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
          <h1 className="text-[20px] font-bold text-[#1A1D24]">二维码管理</h1>
          <p className="text-[13px] text-[#5A6171] mt-1">为参会人生成专属签到二维码</p>
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
          <button
            onClick={downloadAllPDF}
            disabled={loading || attendees.length === 0}
            className="btn-primary disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileDown className="w-4 h-4" />}
            {loading ? '生成中...' : '下载全部 PDF'}
          </button>
        </div>
      </div>

      {generating ? (
        <div className="card py-16 text-center">
          <Loader2 className="w-6 h-6 text-[#5B5FC7] animate-spin mx-auto mb-3" />
          <p className="text-[#5A6171] text-sm">正在生成二维码...</p>
        </div>
      ) : attendees.length === 0 ? (
        <div className="card py-16 text-center">
          <QrCode className="w-10 h-10 text-[#9CA3AF] mx-auto mb-3" strokeWidth={1.5} />
          <p className="text-[#5A6171] text-sm">暂无参会人，请先在参会名单中导入</p>
        </div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {attendees.map((a, i) => (
            <div
              key={a.id}
              className="card p-4 text-center group animate-stagger-in"
              style={{ animationDelay: `${Math.min(i * 30, 500)}ms` }}
            >
              {qrUrls[a.id] ? (
                <img
                  src={qrUrls[a.id]}
                  alt={`${a.name} QR`}
                  className="w-full aspect-square object-contain rounded-xl mb-3"
                />
              ) : (
                <div className="w-full aspect-square bg-[#F4F5F8] rounded-xl mb-3 flex items-center justify-center">
                  <Loader2 className="w-5 h-5 text-[#9CA3AF] animate-spin" />
                </div>
              )}
              <p className="text-[12px] font-semibold text-[#1A1D24] truncate">{a.name}</p>
              <p className="text-[11px] text-[#9CA3AF] truncate mt-0.5">{a.position || ''}</p>
              <button
                onClick={() => downloadSingle(a)}
                className="mt-2 btn-secondary w-full justify-center text-[11px] py-1.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Download className="w-3 h-3" />
                PNG
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
