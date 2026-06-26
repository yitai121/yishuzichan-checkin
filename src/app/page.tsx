'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Camera, CameraOff, CheckCircle2, AlertCircle, XCircle, RefreshCw, HelpCircle, LogOut, ChevronDown } from 'lucide-react';

interface Meeting {
  id: string;
  name: string;
  is_active: boolean;
}

interface Stats {
  total: number;
  checked_in: number;
}

interface ScanResult {
  status: 'success' | 'duplicate' | 'error';
  message: string;
  attendee?: {
    name: string;
    position: string;
    company: string;
  };
  checkin_at?: string;
}

// Camera error message mapping
function getCameraErrorMessage(error: unknown): { title: string; message: string } {
  const errorMsg = error instanceof Error ? error.message : String(error);
  
  if (errorMsg.includes('NotFoundError') || errorMsg.includes('not found')) {
    return {
      title: '未检测到摄像头设备',
      message: '请确保设备已连接摄像头，或使用后置摄像头重试'
    };
  }
  if (errorMsg.includes('NotAllowedError') || errorMsg.includes('Permission')) {
    return {
      title: '请允许浏览器访问摄像头',
      message: '点击浏览器地址栏左侧的锁形图标，允许摄像头权限后刷新页面'
    };
  }
  if (errorMsg.includes('NotReadableError') || errorMsg.includes('in use')) {
    return {
      title: '摄像头被其他应用占用',
      message: '请关闭其他使用摄像头的应用（如微信、腾讯会议）后重试'
    };
  }
  return {
    title: '摄像头初始化失败',
    message: '请刷新页面重试，或检查浏览器是否支持摄像头功能'
  };
}

export default function ScanPage() {
  const [isClient, setIsClient] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [scannerUser, setScannerUser] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState('');
  const [stats, setStats] = useState<Stats>({ total: 0, checked_in: 0 });
  const [scanning, setScanning] = useState(false);
  const [result, setResult] = useState<ScanResult | null>(null);
  const [cameraError, setCameraError] = useState<{ title: string; message: string } | null>(null);
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanRef = useRef<string>('');
  const lastScanTimeRef = useRef<number>(0);

  useEffect(() => {
    setIsClient(true);
    const user = sessionStorage.getItem('scanner_user');
    const sessionToken = sessionStorage.getItem('scanner_session_token');
    if (user && sessionToken) {
      // Validate session token on mount
      fetch('/api/scanner-users/validate-session', {
        headers: { 'X-Session-Token': sessionToken },
      })
        .then(r => r.json())
        .then(d => {
          if (d.success) {
            setIsLoggedIn(true);
            setScannerUser(user);
          } else {
            // Session invalidated by another device login
            sessionStorage.removeItem('scanner_user');
            sessionStorage.removeItem('scanner_session_token');
          }
        })
        .catch(() => {
          sessionStorage.removeItem('scanner_user');
          sessionStorage.removeItem('scanner_session_token');
        });
    }
  }, []);

  // Fetch meetings
  useEffect(() => {
    if (!isLoggedIn) return;
    fetch('/api/meetings')
      .then(r => r.json())
      .then(d => {
        if (d.success) {
          setMeetings(d.data);
          // Auto-select active meeting
          const active = d.data.find((m: Meeting) => m.is_active);
          if (active) setSelectedMeeting(active.id);
          else if (d.data.length > 0) setSelectedMeeting(d.data[0].id);
        }
      })
      .catch(() => {});
  }, [isLoggedIn]);

  // Fetch stats
  useEffect(() => {
    if (!selectedMeeting) return;
    fetch(`/api/stats/${selectedMeeting}`)
      .then(r => r.json())
      .then(d => { if (d.success) setStats(d.data); })
      .catch(() => {});
  }, [selectedMeeting, result]);

  // Start scanner
  const startScanner = useCallback(async () => {
    if (!selectedMeeting || scannerRef.current) return;
    
    setCameraError(null);
    const scanner = new Html5Qrcode('scanner-region');
    scannerRef.current = scanner;

    try {
      await scanner.start(
        { facingMode: 'environment' },
        { fps: 10, qrbox: { width: 200, height: 200 }, aspectRatio: 1.0 },
        (decodedText) => {
          const now = Date.now();
          if (decodedText === lastScanRef.current && now - lastScanTimeRef.current < 3000) return;
          lastScanRef.current = decodedText;
          lastScanTimeRef.current = now;
          handleScan(decodedText);
        },
        () => {}
      );
      setScanning(true);
    } catch (err) {
      setCameraError(getCameraErrorMessage(err));
      scannerRef.current = null;
    }
  }, [selectedMeeting]);

  // Auto-start scanner when meeting selected
  useEffect(() => {
    if (isClient && isLoggedIn && selectedMeeting && !scannerRef.current && !cameraError) {
      const timer = setTimeout(startScanner, 300);
      return () => clearTimeout(timer);
    }
  }, [isClient, isLoggedIn, selectedMeeting, startScanner, cameraError]);

  // Cleanup
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop().catch(() => {});
        scannerRef.current = null;
      }
    };
  }, []);

  const handleLogin = async () => {
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/scanner-users/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      if (data.success) {
        sessionStorage.setItem('scanner_user', username);
        sessionStorage.setItem('scanner_session_token', data.data.sessionToken);
        setIsLoggedIn(true);
        setScannerUser(username);
      } else {
        setLoginError(data.error || '登录失败');
      }
    } catch {
      setLoginError('网络错误');
    }
    setLoginLoading(false);
  };

  const handleLogout = () => {
    sessionStorage.removeItem('scanner_user');
    sessionStorage.removeItem('scanner_session_token');
    setIsLoggedIn(false);
    setScannerUser('');
    if (scannerRef.current) {
      scannerRef.current.stop().catch(() => {});
      scannerRef.current = null;
    }
  };

  const handleScan = async (code: string) => {
    let parsed = { code, attendee_id: '' };
    try {
      const p = JSON.parse(code);
      if (p.code) parsed = p;
    } catch { /* plain code */ }

    const sessionToken = sessionStorage.getItem('scanner_session_token');

    try {
      const res = await fetch('/api/checkin', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'X-Session-Token': sessionToken || '',
        },
        body: JSON.stringify({
          signin_code: parsed.code,
          meeting_id: selectedMeeting,
          attendee_id: parsed.attendee_id,
        }),
      });
      const data: ScanResult = await res.json();
      
      // Check if session was invalidated (another device logged in)
      if (data.status === 'error' && data.message === '登录已失效，请重新登录') {
        handleLogout();
        return;
      }
      
      setResult(data);
      // Auto-clear after 3s for success/duplicate
      if (data.status !== 'error') {
        setTimeout(() => setResult(null), 3000);
      }
    } catch {
      setResult({ status: 'error', message: '网络错误，请重试' });
    }
  };

  const progress = stats.total > 0 ? (stats.checked_in / stats.total) * 100 : 0;

  if (!isClient) return null;

  // Login screen
  if (!isLoggedIn) {
    return (
      <div className="min-h-screen bg-[#F8F9FB] flex items-center justify-center p-5">
        <div className="w-full max-w-sm">
          {/* Brand */}
          <div className="text-center mb-8">
            <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-[#5B5FC7] to-[#7B7FD7] flex items-center justify-center shadow-lg shadow-[#5B5FC7]/20">
              <span className="text-white text-xl font-bold">亿</span>
            </div>
            <h1 className="text-xl font-semibold text-[#1F2937]">亿数·山海归序签到</h1>
            <p className="text-sm text-[#6B7280] mt-1">请使用扫码账号登录</p>
          </div>

          {/* Login form */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E7EB] p-6">
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1.5">账号</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="请输入账号"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/20 focus:border-[#5B5FC7] transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-[#374151] mb-1.5">密码</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="请输入密码"
                  className="w-full px-3.5 py-2.5 text-sm bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl text-[#1F2937] placeholder:text-[#9CA3AF] focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/20 focus:border-[#5B5FC7] transition-all"
                  onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
                />
              </div>

              {loginError && (
                <div className="px-3 py-2 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5]">
                  <p className="text-[#EF4444] text-xs">{loginError}</p>
                </div>
              )}

              <button
                onClick={handleLogin}
                disabled={loginLoading}
                className="w-full py-3 px-4 bg-[#5B5FC7] text-white text-sm font-medium rounded-xl hover:bg-[#4A4EB5] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {loginLoading ? '登录中...' : '登录'}
              </button>
            </div>
          </div>

          <p className="text-center text-[#9CA3AF] text-xs mt-6">
            如需创建账号，请联系管理员
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8F9FB] flex flex-col relative">
      {/* Header */}
      <div className="bg-white border-b border-[#E5E7EB] px-5 pt-4 pb-3">
        <div className="max-w-lg mx-auto">
          {/* Brand + User info */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#5B5FC7] to-[#7B7FD7] flex items-center justify-center">
                <span className="text-white text-sm font-bold">亿</span>
              </div>
              <span className="text-[#1F2937] text-sm font-medium">亿数·山海归序</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[#6B7280] text-xs">{scannerUser}</span>
              <button
                onClick={handleLogout}
                className="p-1.5 text-[#9CA3AF] hover:text-[#6B7280] hover:bg-[#F3F4F6] rounded-lg transition-colors"
                title="退出登录"
              >
                <LogOut className="w-4 h-4" strokeWidth={1.5} />
              </button>
            </div>
          </div>

          {/* Meeting selector */}
          <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-xl p-3">
            <div className="relative">
              <select
                value={selectedMeeting}
                onChange={(e) => setSelectedMeeting(e.target.value)}
                className="w-full px-3 py-2.5 text-sm bg-white border border-[#E5E7EB] rounded-lg text-[#1F2937] focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/20 focus:border-[#5B5FC7] appearance-none cursor-pointer pr-8"
              >
                {meetings.length === 0 && <option value="">暂无会议</option>}
                {meetings.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} {m.is_active ? '(进行中)' : ''}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#9CA3AF] pointer-events-none" strokeWidth={1.5} />
            </div>

            {/* Stats bar */}
            {selectedMeeting && (
              <div className="mt-3 flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-[#E5E7EB] rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#5B5FC7] rounded-full transition-all duration-700 ease-out"
                    style={{ width: `${progress}%` }}
                  />
                </div>
                <div className="text-xs text-[#6B7280] tabular-nums shrink-0">
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
      <div className="flex-1 flex flex-col items-center justify-center px-5 py-6">
        {cameraError ? (
          <div className="text-center p-6 bg-white border border-[#E5E7EB] rounded-2xl max-w-sm w-full shadow-sm">
            <div className="w-14 h-14 mx-auto mb-4 rounded-xl bg-[#F3F4F6] flex items-center justify-center">
              <CameraOff className="w-7 h-7 text-[#9CA3AF]" strokeWidth={1.5} />
            </div>
            <h3 className="text-[#1F2937] text-lg font-medium mb-2">{cameraError.title}</h3>
            <p className="text-[#6B7280] text-sm leading-relaxed mb-5">{cameraError.message}</p>
            <div className="space-y-2.5">
              <button
                onClick={() => {
                  setCameraError(null);
                  const temp = selectedMeeting;
                  setSelectedMeeting('');
                  setTimeout(() => setSelectedMeeting(temp), 100);
                }}
                className="w-full py-2.5 px-4 bg-[#5B5FC7] text-white text-sm font-medium rounded-lg hover:bg-[#4A4EB5] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-4 h-4" strokeWidth={2} />
                重新尝试
              </button>
              <a
                href="https://support.google.com/chrome/answer/2693767"
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2 px-4 text-[#6B7280] text-xs hover:text-[#5B5FC7] transition-colors flex items-center justify-center gap-1.5"
              >
                <HelpCircle className="w-3.5 h-3.5" strokeWidth={1.5} />
                如何授权？查看帮助
              </a>
            </div>
          </div>
        ) : (
          <>
            {/* Scanner viewport */}
            <div className="w-full max-w-sm aspect-square rounded-2xl overflow-hidden bg-black relative border-4 border-white shadow-lg">
              <div id="scanner-region" className="w-full h-full" />
              {!scanning && (
                <div className="absolute inset-0 flex items-center justify-center bg-[#F3F4F6]">
                  <Camera className="w-10 h-10 text-[#9CA3AF] animate-pulse" strokeWidth={1.5} />
                </div>
              )}
              {/* Scan line animation */}
              {scanning && (
                <div className="absolute inset-x-4 top-1/2 -translate-y-1/2 h-0.5 bg-[#5B5FC7] shadow-[0_0_8px_#5B5FC7] animate-pulse" />
              )}
            </div>

            {/* Hint */}
            <p className="mt-4 text-[#6B7280] text-sm text-center">
              将二维码对准摄像头自动识别
            </p>
          </>
        )}
      </div>

      {/* Result overlay */}
      {result && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-5 bg-black/40 backdrop-blur-sm animate-[fadeIn_200ms_ease-out]">
          <div className={`w-full max-w-sm rounded-2xl p-6 shadow-xl animate-[slideUp_300ms_ease-out] ${
            result.status === 'success' ? 'bg-[#ECFDF5] border border-[#A7F3D0]' :
            result.status === 'duplicate' ? 'bg-[#FFFBEB] border border-[#FDE68A]' :
            'bg-[#FEF2F2] border border-[#FCA5A5]'
          }`}>
            <div className="flex flex-col items-center text-center">
              {result.status === 'success' && (
                <CheckCircle2 className="w-14 h-14 text-[#10B981] mb-3" strokeWidth={1.5} />
              )}
              {result.status === 'duplicate' && (
                <AlertCircle className="w-14 h-14 text-[#F59E0B] mb-3" strokeWidth={1.5} />
              )}
              {result.status === 'error' && (
                <XCircle className="w-14 h-14 text-[#EF4444] mb-3" strokeWidth={1.5} />
              )}
              <h3 className={`text-lg font-semibold mb-1 ${
                result.status === 'success' ? 'text-[#065F46]' :
                result.status === 'duplicate' ? 'text-[#92400E]' :
                'text-[#991B1B]'
              }`}>
                {result.status === 'success' ? '签到成功' :
                 result.status === 'duplicate' ? '已签到' :
                 '签到失败'}
              </h3>
              <p className={`text-sm mb-3 ${
                result.status === 'success' ? 'text-[#059669]' :
                result.status === 'duplicate' ? 'text-[#D97706]' :
                'text-[#DC2626]'
              }`}>
                {result.message}
              </p>
              {result.attendee && (
                <div className={`w-full rounded-xl p-3 ${
                  result.status === 'success' ? 'bg-white/60' :
                  result.status === 'duplicate' ? 'bg-white/60' :
                  'bg-white/60'
                }`}>
                  <p className="text-[#1F2937] font-medium text-base">{result.attendee.name}</p>
                  {result.attendee.company && (
                    <p className="text-[#6B7280] text-xs mt-0.5">{result.attendee.company}</p>
                  )}
                  {result.attendee.position && (
                    <p className="text-[#6B7280] text-xs">{result.attendee.position}</p>
                  )}
                  {result.checkin_at && (
                    <p className="text-[#9CA3AF] text-xs mt-1">
                      {new Date(result.checkin_at).toLocaleString('zh-CN')}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
