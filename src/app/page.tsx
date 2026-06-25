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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [scannerUser, setScannerUser] = useState<string>('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<string>('');
  const [stats, setStats] = useState({ checked_in: 0, total: 0 });
  const [scanStatus, setScanStatus] = useState<ScanStatus>('scanning');
  const [result, setResult] = useState<CheckinResult | null>(null);
  const [cameraError, setCameraError] = useState<string>('');
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const isProcessingRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Check if already logged in
  useEffect(() => {
    const savedUser = sessionStorage.getItem('scanner_auth');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setIsAuthenticated(true);
        setScannerUser(parsed.username);
      } catch {
        sessionStorage.removeItem('scanner_auth');
      }
    }
  }, []);

  const handleLogin = async () => {
    if (!loginUsername.trim() || !loginPassword.trim()) {
      setLoginError('请输入账号和密码');
      return;
    }

    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await fetch('/api/scanner-users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginUsername.trim(), password: loginPassword }),
      });
      const data = await res.json();

      if (data.success) {
        setIsAuthenticated(true);
        setScannerUser(data.data.username);
        sessionStorage.setItem('scanner_auth', JSON.stringify({ username: data.data.username, id: data.data.id }));
      } else {
        setLoginError(data.error || '登录失败');
      }
    } catch {
      setLoginError('网络错误，请重试');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setScannerUser('');
    setLoginUsername('');
    setLoginPassword('');
    sessionStorage.removeItem('scanner_auth');
  };

  useEffect(() => {
    if (!isAuthenticated) return;

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
  }, [isAuthenticated]);

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
    if (!isAuthenticated) return;
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [fetchStats, isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated || !selectedMeeting) return;

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
            // Try to parse as encrypted token first
            let tokenToSend = decodedText;
            let isEncryptedToken = false;

            try {
              const parsed = JSON.parse(decodedText);
              // Legacy format: { code, attendee_id }
              if (parsed.code) {
                tokenToSend = parsed.code;
              }
            } catch {
              // Not JSON - could be an encrypted token (base64url format with dots)
              if (decodedText.includes('.') && decodedText.length > 20) {
                isEncryptedToken = true;
                tokenToSend = decodedText;
              }
            }

            const requestBody = isEncryptedToken
              ? { token: tokenToSend, meeting_id: selectedMeeting, device_info: navigator.userAgent }
              : { signin_code: tokenToSend, meeting_id: selectedMeeting, device_info: navigator.userAgent };

            // Retry logic for network errors (max 2 retries)
            let res: Record<string, unknown> | null = null;
            let lastError: Error | null = null;
            for (let attempt = 0; attempt < 3; attempt++) {
              try {
                const response = await fetch('/api/checkin', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(requestBody),
                  signal: AbortSignal.timeout(10000), // 10s timeout
                });
                res = await response.json();
                lastError = null;
                break;
              } catch (err) {
                lastError = err as Error;
                if (attempt < 2) {
                  await new Promise((resolve) => setTimeout(resolve, 1000 * (attempt + 1))); // 1s, 2s delay
                }
              }
            }

            if (lastError || !res) {
              // Network error after all retries
              setResult({
                type: 'invalid',
                message: '网络连接失败，请检查网络后重试',
              });
              setScanStatus('result');
              timerRef.current = setTimeout(() => {
                setScanStatus('scanning');
                setResult(null);
                isProcessingRef.current = false;
              }, 3000);
              return;
            }

            let checkinResult: CheckinResult;
            const resData = res.data as Record<string, unknown> | undefined;
            if (res.success) {
              checkinResult = {
                type: 'success',
                name: resData?.name as string,
                position: resData?.position as string,
                company: resData?.company as string,
                checkin_at: resData?.checkin_at as string,
                checkin_number: resData?.checkin_number as number,
                message: '签到成功',
              };
            } else if (res.type === 'duplicate') {
              checkinResult = {
                type: 'duplicate',
                name: resData?.name as string,
                position: resData?.position as string,
                checkin_at: resData?.checkin_at as string,
                message: '已签到',
              };
            } else {
              checkinResult = {
                type: 'invalid',
                message: (res.error as string) || '签到码无效',
              };
            }

            setResult(checkinResult);
            setScanStatus('result');
            fetchStats();

            timerRef.current = setTimeout(() => {
              setScanStatus('scanning');
              setResult(null);
              isProcessingRef.current = false;
            }, 3000);
          } catch {
            isProcessingRef.current = false;
          }
        },
        () => {}
      )
      .catch((err) => {
        setCameraError(typeof err === 'string' ? err : '无法访问摄像头，请授权后重试');
      });

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      scannerRef.current?.stop().catch(() => {});
    };
  }, [selectedMeeting, fetchStats, isAuthenticated]);

  const currentMeeting = meetings.find((m) => m.id === selectedMeeting);
  const progress = stats.total > 0 ? (stats.checked_in / stats.total) * 100 : 0;

  // Login screen
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-[#0A0B0F] flex flex-col relative overflow-hidden">
        {/* Ambient background glow */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-[-20%] left-[50%] translate-x-[-50%] w-[600px] h-[600px] rounded-full bg-[#5B5FC7]/8 blur-[120px]" />
        </div>

        <div className="flex-1 flex items-center justify-center px-5 relative z-10">
          <div className="w-full max-w-sm">
            {/* Brand */}
            <div className="text-center mb-8">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#5B5FC7] to-[#7B7FD7] flex items-center justify-center shadow-lg shadow-[#5B5FC7]/20">
                <span className="text-white text-xl font-bold">亿</span>
              </div>
              <h1 className="text-white text-xl font-semibold tracking-tight">亿数嘉年华签到</h1>
              <p className="text-white/40 text-sm mt-2">请使用扫码账号登录</p>
            </div>

            {/* Login form */}
            <div className="bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-white/60 text-xs font-medium mb-2 uppercase tracking-wider">账号</label>
                  <input
                    type="text"
                    value={loginUsername}
                    onChange={(e) => setLoginUsername(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    placeholder="输入用户名"
                    className="w-full px-4 py-3 text-sm bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/40 focus:border-[#5B5FC7]/40 transition-all"
                    autoComplete="username"
                  />
                </div>
                <div>
                  <label className="block text-white/60 text-xs font-medium mb-2 uppercase tracking-wider">密码</label>
                  <input
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                    placeholder="输入密码"
                    className="w-full px-4 py-3 text-sm bg-white/[0.05] border border-white/[0.08] rounded-xl text-white placeholder-white/20 focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/40 focus:border-[#5B5FC7]/40 transition-all"
                    autoComplete="current-password"
                  />
                </div>

                {loginError && (
                  <div className="px-3 py-2 rounded-lg bg-[#EF4444]/10 border border-[#EF4444]/20">
                    <p className="text-[#EF4444] text-xs">{loginError}</p>
                  </div>
                )}

                <button
                  onClick={handleLogin}
                  disabled={loginLoading}
                  className="w-full py-3 px-4 bg-gradient-to-r from-[#5B5FC7] to-[#6B6FD3] text-white text-sm font-medium rounded-xl shadow-lg shadow-[#5B5FC7]/20 hover:shadow-[#5B5FC7]/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                >
                  {loginLoading ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      登录中...
                    </>
                  ) : (
                    '登录'
                  )}
                </button>
              </div>
            </div>

            <p className="text-center text-white/20 text-xs mt-6">
              如需创建账号，请联系管理员
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0B0F] flex flex-col relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[50%] translate-x-[-50%] w-[600px] h-[600px] rounded-full bg-[#5B5FC7]/8 blur-[120px]" />
        <div className="absolute bottom-[-10%] left-[20%] w-[300px] h-[300px] rounded-full bg-[#5B5FC7]/5 blur-[80px]" />
      </div>

      {/* Header */}
      <div className="relative z-10 px-5 pt-5 pb-3">
        <div className="max-w-lg mx-auto">
          {/* Brand + User info */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#5B5FC7] to-[#7B7FD7] flex items-center justify-center shadow-lg shadow-[#5B5FC7]/20">
                <span className="text-white text-xs font-bold">亿</span>
              </div>
              <span className="text-white/90 text-sm font-medium tracking-wide">亿数嘉年华</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-white/40 text-xs">{scannerUser}</span>
              <button
                onClick={handleLogout}
                className="px-2 py-1 text-xs text-white/30 hover:text-white/60 border border-white/10 rounded-lg transition-colors"
              >
                退出
              </button>
            </div>
          </div>

          {/* Meeting selector - glassmorphism */}
          <div className="bg-white/[0.06] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-3">
            <select
              value={selectedMeeting}
              onChange={(e) => setSelectedMeeting(e.target.value)}
              className="w-full px-3 py-2.5 text-sm bg-white/[0.05] border border-white/[0.08] rounded-xl text-white/90 focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/40 appearance-none cursor-pointer"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='rgba(255,255,255,0.5)' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}
            >
              {meetings.length === 0 && <option value="">暂无会议</option>}
              {meetings.map((m) => (
                <option key={m.id} value={m.id} className="bg-[#1A1B23] text-white">
                  {m.name} {m.is_active ? '(当前)' : ''}
                </option>
              ))}
            </select>

            {/* Stats bar */}
            {selectedMeeting && (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-white/[0.06] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-[#5B5FC7] to-[#7B7FD7] rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-xs text-white/50 tabular-nums shrink-0">
                  <span className="text-[#5B5FC7] font-semibold">{stats.checked_in}</span>
                  <span className="mx-0.5">/</span>
                  <span>{stats.total}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scanner area */}
      <div className="flex-1 flex flex-col items-center justify-center px-5 relative z-10">
        {cameraError ? (
          <div className="text-center p-8 bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] rounded-3xl max-w-sm w-full">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.06] flex items-center justify-center">
              <svg className="w-8 h-8 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0z" />
              </svg>
            </div>
            <p className="text-white/50 text-sm">{cameraError}</p>
          </div>
        ) : !selectedMeeting ? (
          <div className="text-center p-8 bg-white/[0.04] backdrop-blur-xl border border-white/[0.06] rounded-3xl max-w-sm w-full">
            <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-white/[0.06] flex items-center justify-center">
              <svg className="w-8 h-8 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
              </svg>
            </div>
            <p className="text-white/50 text-sm">请先在后台创建会议</p>
          </div>
        ) : (
          <>
            {/* Scanner frame */}
            <div className="relative w-full max-w-xs aspect-square">
              {/* Corner markers */}
              <div className="absolute inset-0 pointer-events-none z-10">
                <div className="absolute top-0 left-0 w-8 h-8 border-t-[3px] border-l-[3px] border-[#5B5FC7] rounded-tl-lg" />
                <div className="absolute top-0 right-0 w-8 h-8 border-t-[3px] border-r-[3px] border-[#5B5FC7] rounded-tr-lg" />
                <div className="absolute bottom-0 left-0 w-8 h-8 border-b-[3px] border-l-[3px] border-[#5B5FC7] rounded-bl-lg" />
                <div className="absolute bottom-0 right-0 w-8 h-8 border-b-[3px] border-r-[3px] border-[#5B5FC7] rounded-br-lg" />
              </div>

              {/* Scanning line animation */}
              {scanStatus === 'scanning' && (
                <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-xl">
                  <div className="absolute left-2 right-2 h-[2px] bg-gradient-to-r from-transparent via-[#5B5FC7] to-transparent animate-scan-line opacity-60" />
                </div>
              )}

              <div
                id="qr-reader"
                className="w-full h-full rounded-xl overflow-hidden"
                style={{ visibility: scanStatus === 'scanning' ? 'visible' : 'hidden' }}
              />

              {/* Dark overlay when showing result */}
              {scanStatus === 'result' && (
                <div className="absolute inset-0 bg-[#0A0B23]/80 backdrop-blur-sm rounded-xl" />
              )}
            </div>

            {scanStatus === 'scanning' && (
              <p className="mt-6 text-sm text-white/30 font-light tracking-wide">将二维码放入框内扫描</p>
            )}
          </>
        )}

        {/* Result overlay */}
        {scanStatus === 'result' && result && (
          <div className="absolute inset-0 flex items-center justify-center p-5 z-50 animate-fade-in">
            <div
              className={`w-full max-w-sm rounded-3xl p-8 text-center backdrop-blur-2xl border shadow-2xl ${
                result.type === 'success'
                  ? 'bg-[#10B981]/15 border-[#10B981]/20 shadow-[#10B981]/10'
                  : result.type === 'duplicate'
                  ? 'bg-[#F59E0B]/15 border-[#F59E0B]/20 shadow-[#F59E0B]/10'
                  : 'bg-[#EF4444]/15 border-[#EF4444]/20 shadow-[#EF4444]/10'
              }`}
            >
              {/* Icon */}
              <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${
                result.type === 'success'
                  ? 'bg-[#10B981]/20'
                  : result.type === 'duplicate'
                  ? 'bg-[#F59E0B]/20'
                  : 'bg-[#EF4444]/20'
              }`}>
                {result.type === 'success' && (
                  <svg className="w-8 h-8 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                  </svg>
                )}
                {result.type === 'duplicate' && (
                  <svg className="w-8 h-8 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                )}
                {result.type === 'invalid' && (
                  <svg className="w-8 h-8 text-[#EF4444]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>

              {/* Title */}
              <h2 className={`text-2xl font-bold mb-1 tracking-tight ${
                result.type === 'success' ? 'text-[#10B981]' : result.type === 'duplicate' ? 'text-[#F59E0B]' : 'text-[#EF4444]'
              }`}>
                {result.type === 'success' ? '签到成功' : result.type === 'duplicate' ? '已签到' : '签到码无效'}
              </h2>

              {/* Name */}
              {result.name && (
                <p className="text-white/90 text-xl font-semibold mt-3">{result.name}</p>
              )}

              {/* Position & Company */}
              {result.position && (
                <p className="text-white/40 text-sm mt-1">{result.position}</p>
              )}
              {result.company && (
                <p className="text-white/40 text-sm">{result.company}</p>
              )}

              {/* Time */}
              {result.checkin_at && (
                <p className="text-white/25 text-xs mt-4 tabular-nums">
                  {new Date(result.checkin_at).toLocaleString('zh-CN', {
                    timeZone: 'Asia/Shanghai',
                    month: '2-digit',
                    day: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </p>
              )}

              {/* Checkin number */}
              {result.type === 'success' && result.checkin_number && (
                <div className="mt-4 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#10B981]/10 border border-[#10B981]/20">
                  <span className="text-[#10B981] text-xs font-medium">第 {result.checkin_number} 位签到</span>
                </div>
              )}

              {/* Invalid message */}
              {result.type === 'invalid' && (
                <p className="text-white/30 text-sm mt-2">{result.message}</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="relative z-10 text-center py-4">
        <p className="text-[10px] text-white/15 tracking-widest uppercase">
          {currentMeeting?.name || '请选择会议'}
        </p>
      </div>
    </div>
  );
}
