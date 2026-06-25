'use client';

import { useState, useEffect } from 'react';
import { History, Search, Filter, RefreshCw, CheckCircle, XCircle, UserCheck } from 'lucide-react';

interface Meeting { id: string; name: string; is_active: boolean; }
interface CheckinRecord {
  id: string;
  attendee_id: string;
  meeting_id: string;
  checkin_at: string;
  device_info: string | null;
  ip_address: string | null;
  attendees: {
    id: string;
    name: string;
    phone: string | null;
    company: string | null;
    position: string | null;
  };
}

export default function CheckinsPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<string>('');
  const [records, setRecords] = useState<CheckinRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [timeFilter, setTimeFilter] = useState<'all' | 'today' | 'hour'>('all');
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

  useEffect(() => {
    if (!selectedMeeting) return;
    fetchRecords();
  }, [selectedMeeting, timeFilter]);

  const fetchRecords = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ meeting_id: selectedMeeting, limit: '100' });
      
      if (timeFilter === 'today') {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        params.set('start_time', today.toISOString());
      } else if (timeFilter === 'hour') {
        const hourAgo = new Date(Date.now() - 3600000);
        params.set('start_time', hourAgo.toISOString());
      }

      const res = await fetch(`/api/checkins?${params}`).then((r) => r.json());
      if (res.success) {
        setRecords(res.data);
        setTotal(res.total);
      }
    } catch {
      showToast('获取记录失败');
    }
    setLoading(false);
  };

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('zh-CN', { 
      month: '2-digit', 
      day: '2-digit',
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    });
  };

  const maskIp = (ip: string | null) => {
    if (!ip) return '-';
    const parts = ip.split('.');
    if (parts.length === 4) {
      return `${parts[0]}.${parts[1]}.*.*`;
    }
    return ip.substring(0, 10) + '...';
  };

  const filtered = records.filter((r) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return r.attendees.name.toLowerCase().includes(q) || 
           (r.attendees.phone && r.attendees.phone.includes(q)) ||
           (r.attendees.company && r.attendees.company.toLowerCase().includes(q));
  });

  return (
    <div>
      {toast && <div className="toast toast-success">{toast}</div>}

      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-[16px] font-semibold text-[#0F1117]">签到记录</h1>
          <p className="text-[12px] text-[#99A0AE] mt-0.5">查看签到日志，支持筛选和核查</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={selectedMeeting} onChange={(e) => setSelectedMeeting(e.target.value)} className="input-field w-auto text-[12px] font-medium">
            {meetings.map((m) => <option key={m.id} value={m.id}>{m.name}</option>)}
          </select>
          <select value={timeFilter} onChange={(e) => setTimeFilter(e.target.value as 'all' | 'today' | 'hour')} className="input-field w-auto text-[12px]">
            <option value="all">全部时间</option>
            <option value="today">今天</option>
            <option value="hour">最近 1 小时</option>
          </select>
          <button onClick={fetchRecords} className="btn-secondary">
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </button>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E7EB] flex items-center justify-between">
          <span className="text-[12px] font-semibold text-[#0F1117]">
            共 {total} 条记录
          </span>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#C9CDD4]" />
            <input 
              type="text" 
              value={searchQuery} 
              onChange={(e) => setSearchQuery(e.target.value)} 
              placeholder="搜索姓名/手机/单位..." 
              className="input-field w-[200px] pl-8 h-[32px] text-[12px]" 
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="py-12 text-center">
            <History className="w-8 h-8 text-[#C9CDD4] mx-auto mb-2" strokeWidth={1.5} />
            <p className="text-[#525866] text-[12px]">
              {records.length === 0 ? '暂无签到记录' : '未找到匹配的记录'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[12px]">
              <thead className="table-header">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium text-[#525866]">签到时间</th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#525866]">姓名</th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#525866]">手机号</th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#525866]">单位</th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#525866]">岗位</th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#525866]">设备</th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#525866]">IP</th>
                  <th className="px-4 py-2.5 text-left font-medium text-[#525866]">状态</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((record) => (
                  <tr key={record.id} className="table-row border-t border-[#E5E7EB]">
                    <td className="px-4 py-2.5 text-[#525866]">{formatTime(record.checkin_at)}</td>
                    <td className="px-4 py-2.5 text-[#0F1117] font-semibold">{record.attendees.name}</td>
                    <td className="px-4 py-2.5 text-[#525866]">{record.attendees.phone || '-'}</td>
                    <td className="px-4 py-2.5 text-[#525866]">{record.attendees.company || '-'}</td>
                    <td className="px-4 py-2.5 text-[#525866]">{record.attendees.position || '-'}</td>
                    <td className="px-4 py-2.5 text-[#525866] max-w-[120px] truncate" title={record.device_info || ''}>
                      {record.device_info || '-'}
                    </td>
                    <td className="px-4 py-2.5 text-[#525866]">{maskIp(record.ip_address)}</td>
                    <td className="px-4 py-2.5">
                      <span className="badge badge-success inline-flex items-center gap-1">
                        <CheckCircle className="w-3 h-3" strokeWidth={1.5} />
                        已签到
                      </span>
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
