'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';

interface Meeting {
  id: string;
  name: string;
  is_active: boolean;
}

interface CheckinResult {
  type: 'success' | 'duplicate' | 'invalid';
  name?: string;
  position?: string;
  company?: string;
  checkin_at?: string;
  checkin_number?: number;
  message: string;
}

type ScanStatus = 'scanning' | 'result';

export default function HomePage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<string>('');
  const [stats, setStats] = useState({ checked_in: 0, total: 0 });
  const [scanStatus, setScanStatus] = useState<ScanStatus>('scanning');
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

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

  // Fetch stats
  const fetchStats = useCallback(async () => {
    if (!selectedMeeting) return;
    try {
      const res = await fetch(`/api/stats/${selectedMeeting}`).then((r) => r.json());
      if (res.success) {
        setStats({ checked_in: res.data.checked_in, total: res.data.total });
      }
    } catch {
      // ignore
    }
  }, [selectedMeeting]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  // Initialize scanner
  useEffect(() => {
    if (!selectedMeeting) return;

    const scanner = new Html5Qrcode('qr-reader');
    scannerRef.current = scanner;

    scanner
      .start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 250, height: 250 } },
        async (decodedText) => {
          if (isProcessingRef.current) return;
          isProcessingRef.current = true;

          try {
            // Try to parse as JSON (our QR format)
            let code = decodedText;
            try {
              const parsed = JSON.parse(decodedText);
              if (parsed.code) code = parsed.code;
            } catch {
              // Use raw text as code
            }

            const res = await fetch('/api/checkin', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                signin_code: code,
                meeting_id: selectedMeeting,
                device_info: navigator.userAgent,
              }),
            }).then((r) => r.json());

            let checkinResult: CheckinResult;
            if (res.success) {
              checkinResult = {
                type: 'success',
                name: res.data.name,
                position: res.data.position,
                company: res.data.company,
                checkin_at: res.data.checkin_at,
                checkin_number: res.data.checkin_number,
                message: '签到成功',
              };
            } else if (res.type === 'duplicate') {
              checkinResult = {
                type: 'duplicate',
                name: res.data?.name,
                position: res.data?.position,
                checkin_at: res.data?.checkin_at,
                message: '已签到',
              };
            } else {
              checkinResult = {
                type: 'invalid',
                message: res.error || '签到码无效',
              };
            }

            setResult(checkinResult);
            setScanStatus('result');
            fetchStats();

            // Auto reset after 3 seconds
            timerRef.current = setTimeout(() => {
              setScanStatus('scanning');
              setResult(null);
              isProcessingRef.current = false;
            }, 3000);
          } catch {
            isProcessingRef.current = false;
          }
        },
        () => {
          // QR code error callback - ignore, just means no code detected in this frame
        }
      )
      .catch((err) => {
        setCameraError(typeof err === 'string' ? err : '无法访问摄像头，请授权后重试');
      });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      scannerRef.current?.stop().catch(() => {});
    };
  }, [selectedMeeting, fetchStats]);

  const currentMeeting = meetings.find((m) => m.id === selectedMeeting);

  return (
    <div className="min-h-screen bg-[#FAFBFC] flex flex-col">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-4 py-3 safe-area-top">
        <div className="max-w-lg mx-auto">
          <h1 className="text-base font-semibold text-[#111827] text-center mb-2">
            亿数嘉年华签到系统
          </h1>
          {/* Meeting selector */}
          <select
            value={selectedMeeting}
            onChange={(e) => setSelectedMeeting(e.target.value)}
            className="w-full px-3 py-2 text-sm bg-[#F3F4F6] border border-[#E5E7EB] rounded-lg text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/30"
          >
            {meetings.length === 0 && <option value="">暂无会议</option>}
            {meetings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} {m.is_active ? '(当前)' : ''}
              </option>
            ))}
          </select>
          {/* Stats */}
          {selectedMeeting && (
            <div className="mt-2 text-center text-sm text-[#6B7280]">
              已签到 <span className="font-semibold text-[#5B5FC7]">{stats.checked_in}</span>
              {' / '}
              <span className="font-semibold">{stats.total}</span>
            </div>
          )}
        </div>
      </div>

      {/* Scanner area */}
      <div className="flex-1 flex flex-col items-center justify-center p-4 relative">
        {cameraError ? (
          <div className="text-center p-8">
            <div className="text-4xl mb-4">📷</div>
            <p className="text-[#6B7280] text-sm">{cameraError}</p>
          </div>
        ) : !selectedMeeting ? (
          <div className="text-center p-8">
            <div className="text-4xl mb-4">📋</div>
            <p className="text-[#6B7280] text-sm">请先在后台创建会议</p>
          </div>
        ) : (
          <>
            <div
              id="qr-reader"
              className="w-full max-w-sm rounded-xl overflow-hidden"
              style={{ visibility: scanStatus === 'scanning' ? 'visible' : 'hidden' }}
            />
            {scanStatus === 'scanning' && (
              <p className="mt-4 text-sm text-[#6B7280]">将二维码放入框内扫描</p>
            )}
          </>
        )}

        {/* Result overlay */}
        {scanStatus === 'result' && result && (
          <div className="absolute inset-0 flex items-center justify-center p-4 z-50 animate-fade-in">
            <div
              className={`w-full max-w-sm rounded-2xl p-8 text-center shadow-2xl ${
                result.type === 'success'
                  ? 'bg-[#10B981]'
                  : result.type === 'duplicate'
                  ? 'bg-[#F59E0B]'
                  : 'bg-[#EF4444]'
              }`}
            >
              {result.type === 'success' && (
                <>
                  <div className="text-5xl mb-3">✅</div>
                  <h2 className="text-2xl font-extrabold text-white mb-2">签到成功</h2>
                  <p className="text-white/90 text-lg font-medium">{result.name}</p>
                  {result.position && (
                    <p className="text-white/70 text-sm mt-1">{result.position}</p>
                  )}
                  {result.company && (
                    <p className="text-white/70 text-sm">{result.company}</p>
                  )}
                  <p className="text-white/60 text-xs mt-3">
                    {new Date(result.checkin_at!).toLocaleString('zh-CN', {
                      timeZone: 'Asia/Shanghai',
                    })}
                  </p>
                  <p className="text-white/80 text-sm mt-2 font-semibold">
                    今日第 {result.checkin_number} 位签到
                  </p>
                </>
              )}
              {result.type === 'duplicate' && (
                <>
                  <div className="text-5xl mb-3">⚠️</div>
                  <h2 className="text-2xl font-extrabold text-white mb-2">已签到</h2>
                  <p className="text-white/90 text-lg font-medium">{result.name}</p>
                  {result.position && (
                    <p className="text-white/70 text-sm mt-1">{result.position}</p>
                  )}
                  <p className="text-white/60 text-xs mt-3">
                    首次签到时间：
                    {new Date(result.checkin_at!).toLocaleString('zh-CN', {
                      timeZone: 'Asia/Shanghai',
                    })}
                  </p>
                </>
              )}
              {result.type === 'invalid' && (
                <>
                  <div className="text-5xl mb-3">❌</div>
                  <h2 className="text-2xl font-extrabold text-white mb-2">签到码无效</h2>
                  <p className="text-white/80 text-sm">{result.message}</p>
                </>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="text-center py-3 text-xs text-[#9CA3AF]">
        {currentMeeting?.name || '请选择会议'}
      </div>
    </div>
  );
}
