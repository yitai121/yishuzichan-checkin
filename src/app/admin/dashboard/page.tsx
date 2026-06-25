'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Users,
  CheckCircle2,
  TrendingUp,
  Clock,
  Activity,
  Loader2,
  Calendar,
} from 'lucide-react';

interface Meeting {
  id: string;
  name: string;
  is_active: boolean;
}

interface StatsData {
  total: number;
  checked_in: number;
  rate: number;
  avg_minutes: number | null;
  recent_checkins: Array<{
    id: string;
    attendee_id: string;
    checkin_at: string;
    attendees: { name: string; position: string | null; company: string | null };
  }>;
  not_checked_in: Array<{
    id: string;
    name: string;
    position: string | null;
    company: string | null;
  }>;
  buckets: Array<{ time: string; count: number }>;
}

export default function DashboardPage() {
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [selectedMeeting, setSelectedMeeting] = useState<string>('');
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

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

  const fetchStats = useCallback(async () => {
    if (!selectedMeeting) return;
    try {
      const res = await fetch(`/api/stats/${selectedMeeting}`).then((r) => r.json());
      if (res.success) {
        setStats(res.data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [selectedMeeting]);

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 5000);
    return () => clearInterval(interval);
  }, [fetchStats]);

  const maxBucketCount = stats ? Math.max(...stats.buckets.map((b) => b.count), 1) : 1;

  if (!selectedMeeting) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <div className="w-16 h-16 rounded-2xl bg-[#F4F5F8] flex items-center justify-center mb-4">
          <Calendar className="w-8 h-8 text-[#9CA3AF]" strokeWidth={1.5} />
        </div>
        <p className="text-[#5A6171] text-sm">请先创建会议</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="w-6 h-6 text-[#5B5FC7] animate-spin mb-3" />
        <p className="text-[#5A6171] text-sm">加载数据中</p>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: '总人数', value: stats.total, icon: Users, color: '#5B5FC7', bg: '#EEEDFB' },
    { label: '已签到', value: stats.checked_in, icon: CheckCircle2, color: '#10B981', bg: '#D1FAE5' },
    { label: '签到率', value: `${stats.rate}%`, icon: TrendingUp, color: '#5B5FC7', bg: '#EEEDFB' },
    { label: '平均签到时长', value: stats.avg_minutes !== null ? `${stats.avg_minutes} 分钟` : '-', icon: Clock, color: '#F59E0B', bg: '#FEF3C7' },
  ];

  return (
    <div className="animate-fade-in-up">
      {/* Header with meeting selector */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#D1FAE5] border border-[#10B981]/20">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-[11px] font-medium text-[#10B981]">实时</span>
          </div>
          <span className="text-[12px] text-[#9CA3AF]">5 秒自动刷新</span>
        </div>
        <select
          value={selectedMeeting}
          onChange={(e) => setSelectedMeeting(e.target.value)}
          className="input-field w-auto text-[13px] font-medium"
        >
          {meetings.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} {m.is_active ? '(当前)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Stat cards - 4 columns */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="card p-5 animate-stagger-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[12px] font-medium text-[#5A6171]">{card.label}</span>
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: card.bg }}
                >
                  <Icon className="w-[18px] h-[18px]" style={{ color: card.color }} strokeWidth={1.5} />
                </div>
              </div>
              <p
                className="text-[28px] font-bold tabular-nums tracking-tight leading-none animate-number-grow"
                style={{ color: card.color, animationDelay: `${i * 100 + 200}ms` }}
              >
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="card p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#5B5FC7]" strokeWidth={1.5} />
            <span className="text-[13px] font-semibold text-[#1A1D24]">签到进度</span>
          </div>
          <span className="text-[14px] font-bold text-[#5B5FC7] tabular-nums">{stats.rate}%</span>
        </div>
        <div className="h-2 bg-[#F4F5F8] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#5B5FC7] rounded-full transition-all duration-700 ease-out"
            style={{ width: `${stats.rate}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-[11px] text-[#9CA3AF]">已签到 {stats.checked_in} 人</span>
          <span className="text-[11px] text-[#9CA3AF]">共 {stats.total} 人</span>
        </div>
      </div>

      {/* Chart - sign-in trend */}
      {stats.buckets.length > 0 && (
        <div className="card p-5 mb-6">
          <h3 className="text-[13px] font-semibold text-[#1A1D24] mb-5">签到趋势</h3>
          <div className="flex items-end gap-2 h-40">
            {stats.buckets.map((bucket, i) => {
              const height = Math.max((bucket.count / maxBucketCount) * 100, 4);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                  <div className="relative w-full flex justify-center">
                    <span className="absolute -top-5 text-[10px] font-semibold text-[#5B5FC7] opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                      {bucket.count}
                    </span>
                  </div>
                  <div
                    className="w-full bg-[#5B5FC7]/20 rounded-md transition-all duration-500 ease-out min-h-[4px] group-hover:bg-[#5B5FC7]/60"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[10px] text-[#9CA3AF] whitespace-nowrap font-medium tabular-nums">
                    {bucket.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Two columns - recent checkins & not checked in */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent checkins */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[#1A1D24]">最近签到</h3>
            <span className="badge badge-success">{stats.recent_checkins.length} 人</span>
          </div>
          <div className="divide-y divide-[#F4F5F8]">
            {stats.recent_checkins.length === 0 ? (
              <div className="py-12 text-center">
                <p className="text-[#9CA3AF] text-sm">暂无签到记录</p>
              </div>
            ) : (
              stats.recent_checkins.map((c, i) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[rgba(91,95,199,0.04)] transition-colors animate-stagger-in"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="w-9 h-9 rounded-lg bg-[#EEEDFB] flex items-center justify-center text-[#5B5FC7] text-xs font-bold shrink-0">
                    {c.attendees?.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#1A1D24] truncate">
                      {c.attendees?.name || '未知'}
                    </p>
                    <p className="text-[11px] text-[#9CA3AF] truncate mt-0.5">
                      {c.attendees?.position || ''} {c.attendees?.company ? `· ${c.attendees.company}` : ''}
                    </p>
                  </div>
                  <span className="text-[11px] text-[#9CA3AF] shrink-0 font-medium tabular-nums">
                    {new Date(c.checkin_at).toLocaleTimeString('zh-CN', {
                      hour: '2-digit',
                      minute: '2-digit',
                      second: '2-digit',
                      timeZone: 'Asia/Shanghai',
                    })}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Not checked in */}
        <div className="card overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E7EB] flex items-center justify-between">
            <h3 className="text-[13px] font-semibold text-[#1A1D24]">未签到</h3>
            <span className="badge badge-warning">{stats.not_checked_in.length} 人</span>
          </div>
          <div className="divide-y divide-[#F4F5F8]">
            {stats.not_checked_in.length === 0 ? (
              <div className="py-12 text-center">
                <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-[#D1FAE5] flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5 text-[#10B981]" strokeWidth={2} />
                </div>
                <p className="text-[#10B981] text-sm font-medium">全部已签到</p>
              </div>
            ) : (
              stats.not_checked_in.map((a, i) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 px-5 py-3 hover:bg-[rgba(91,95,199,0.04)] transition-colors animate-stagger-in"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="w-9 h-9 rounded-lg bg-[#F4F5F8] flex items-center justify-center text-[#5A6171] text-xs font-bold shrink-0">
                    {a.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#1A1D24] truncate">{a.name}</p>
                    <p className="text-[11px] text-[#9CA3AF] truncate mt-0.5">
                      {a.position || ''} {a.company ? `· ${a.company}` : ''}
                    </p>
                  </div>
                  <div className="w-2 h-2 rounded-full bg-[#F59E0B]/50 shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
