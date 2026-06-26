'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import QRCode from 'qrcode';
import { Download, Loader2, QrCode, FileDown } from 'lucide-react';

interface Meeting { id: string; name: string; is_active: boolean; }
interface Attendee { id: string; name: string; position: string | null; company: string | null; signin_code: string; }

export default function QRCodesPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<string>('');
  const [attendees, setAttendees] = useState<Attendee[]>([]);
  const [qrUrls, setQrUrls] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState('');
  const gridRef = useRef<HTMLDivElement>(null);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(''), 2500); };

  useEffect(() => {
    fetch('/api/meetings').then((r) => r.json()).then((res) => {
      if (res.success) { setMeetings(res.data); const active = res.data.find((m: Meeting) => m.is_active); if (active) setSelectedMeeting(active.id); else if (res.data.length > 0) setSelectedMeeting(res.data[0].id); }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    if (!selectedMeeting) return;
    fetch(`/api/attendees?meeting_id=${selectedMeeting}`).then((r) => r.json()).then((res) => { if (res.success) setAttendees(res.data); }).catch(() => {});
  }, [selectedMeeting]);

  const [qrProgress, setQrProgress] = useState(0);

  const generateQRCodes = useCallback(async () => {
    if (attendees.length === 0) return; setGenerating(true); setQrProgress(0);
    const urls: Record<string, string> = {};
    const batchSize = 20;
    for (let i = 0; i < attendees.length; i += batchSize) {
      const batch = attendees.slice(i, i + batchSize);
      await Promise.all(batch.map(async (a) => {
        try { const qrData = JSON.stringify({ code: a.signin_code, attendee_id: a.id }); const dataUrl = await QRCode.toDataURL(qrData, { width: 200, margin: 2, color: { dark: '#0F1117', light: '#FFFFFF' } }); urls[a.id] = dataUrl; } catch {}
      }));
      setQrProgress(Math.min(i + batchSize, attendees.length));
    }
    setQrUrls(urls); setGenerating(false);
  }, [attendees]);

  useEffect(() => { if (attendees.length > 0) generateQRCodes(); }, [attendees, generateQRCodes]);

  const downloadSingle = async (a: Attendee) => { const dataUrl = qrUrls[a.id]; if (!dataUrl) return; const link = document.createElement('a'); link.href = dataUrl; link.download = `${a.name}-签到码.png`; link.click(); };

  const downloadAllPDF = async () => {
    if (attendees.length === 0) return; setLoading(true); showToast('正在生成 PDF...');
    try {
      const { default: jsPDF } = await import('jspdf'); const { default: html2canvas } = await import('html2canvas');
      const container = document.createElement('div'); container.style.cssText = 'position:fixed;left:-9999px;top:0;width:794px;padding:20px;background:white;'; document.body.appendChild(container);
      const pdf = new jsPDF('p', 'mm', 'a4'); const itemsPerPage = 9;
      for (let page = 0; page < Math.ceil(attendees.length / itemsPerPage); page++) {
        if (page > 0) pdf.addPage();
        const pageAttendees = attendees.slice(page * itemsPerPage, (page + 1) * itemsPerPage); container.innerHTML = '';
        const grid = document.createElement('div'); grid.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:15px;';
        for (const a of pageAttendees) {
          const cell = document.createElement('div'); cell.style.cssText = 'text-align:center;padding:10px;';
          const qrData = JSON.stringify({ code: a.signin_code, attendee_id: a.id });
          const qrDataUrl = await QRCode.toDataURL(qrData, { width: 150, margin: 1, color: { dark: '#0F1117', light: '#FFFFFF' } });
          cell.innerHTML = `<img src="${qrDataUrl}" style="width:120px;height:120px;margin:0 auto;display:block;" /><div style="margin-top:6px;font-size:13px;font-weight:600;color:#0F1117;">${a.name}</div><div style="font-size:11px;color:#525866;">${a.position || ''}</div>`;
          grid.appendChild(cell);
        }
        container.appendChild(grid); await new Promise((resolve) => setTimeout(resolve, 100));
        const canvas = await html2canvas(container, { scale: 2, useCORS: true }); const imgData = canvas.toDataURL('image/png'); pdf.addImage(imgData, 'PNG', 0, 0, 210, 297);
      }
      document.body.removeChild(container);
      const meeting = meetings.find((m) => m.id === selectedMeeting); pdf.save(`${meeting?.name || '签到'}-二维码.pdf`); showToast('PDF 已下载');
    } catch (err) { showToast('PDF 生成失败'); console.error(err); }
    setLoading(false);
  };

  return (
    <div>
      {toast && <div className="toast toast-success">{toast}</div>}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[16px] font-semibold text-[#0F1117]">二维码管理</h1>
          <p className="text-[12px] text-[#99A0AE] mt-0.5">为参会人生成专属签到二维码</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedMeeting} onChange={(e) => setSelectedMeeting(e.target.value)} className="input-field w-auto text-[12px] font-medium">
            {meetings.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <button onClick={downloadAllPDF} disabled={loading || attendees.length === 0} className="btn-primary disabled:opacity-50">
            {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
            {loading ? '生成中...' : '下载全部 PDF'}
          </button>
        </div>
      </div>

      {generating ? (
        <div className="card py-12 text-center"><Loader2 className="w-6 h-6 text-[#5B5FC7] animate-spin mx-auto mb-2" /><p className="text-[#525866] text-[12px]">正在生成二维码... {qrProgress}/{attendees.length}</p></div>
      ) : attendees.length === 0 ? (
        <div className="card py-12 text-center"><QrCode className="w-8 h-8 text-[#C9CDD4] mx-auto mb-2" strokeWidth={1.5} /><p className="text-[#525866] text-[12px]">暂无参会人，请先在参会名单中导入</p></div>
      ) : (
        <div ref={gridRef} className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
          {attendees.map((a, i) => (
            <div key={a.id} className="card p-3 text-center group animate-stagger-in" style={{ animationDelay: `${Math.min(i * 25, 400)}ms` }}>
              {qrUrls[a.id] ? (
                <img src={qrUrls[a.id]} alt={`${a.name} QR`} className="w-full aspect-square object-contain rounded-lg mb-2" />
              ) : (
                <div className="w-full aspect-square bg-[#F6F7F9] rounded-lg mb-2 flex items-center justify-center"><Loader2 className="w-4 h-4 text-[#C9CDD4] animate-spin" /></div>
              )}
              <p className="text-[11px] font-semibold text-[#0F1117] truncate">{a.name}</p>
              <p className="text-[10px] text-[#99A0AE] truncate mt-0.5">{a.position || ''}</p>
              <button onClick={() => downloadSingle(a)} className="mt-1.5 btn-secondary w-full justify-center text-[10px] py-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Download className="w-2.5 h-2.5" />PNG
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
