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
      <div className="flex flex-col items-center justify-center py-20">
        <div className="w-12 h-12 rounded-lg bg-[#F6F7F9] flex items-center justify-center mb-3">
          <Calendar className="w-5 h-5 text-[#99A0AE]" strokeWidth={1.75} />
        </div>
        <p className="text-[#525866] text-sm">请先创建会议</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="w-5 h-5 text-[#5B5FC7] animate-spin mb-2" />
        <p className="text-[#525866] text-sm">加载数据中</p>
      </div>
    );
  }

  if (!stats) return null;

  const statCards = [
    { label: '总人数', value: stats.total, icon: Users, accent: '#5B5FC7' },
    { label: '已签到', value: stats.checked_in, icon: CheckCircle2, accent: '#10B981' },
    { label: '签到率', value: `${stats.rate}%`, icon: TrendingUp, accent: '#5B5FC7' },
    { label: '平均时长', value: stats.avg_minutes !== null ? `${stats.avg_minutes}min` : '-', icon: Clock, accent: '#F59E0B' },
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-[#D1FAE5]/50">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse-subtle" />
            <span className="text-[10px] font-medium text-[#059669] uppercase tracking-wide">LIVE</span>
          </div>
          <span className="text-[11px] text-[#99A0AE]">5s 自动刷新</span>
        </div>
        <select
          value={selectedMeeting}
          onChange={(e) => setSelectedMeeting(e.target.value)}
          className="input-field w-auto text-[12px] font-medium"
        >
          {meetings.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} {m.is_active ? '(当前)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {statCards.map((card, i) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="stat-card animate-stagger-in"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="stat-label">{card.label}</span>
                <Icon className="w-4 h-4" style={{ color: card.accent }} strokeWidth={1.75} />
              </div>
              <p
                className="stat-value animate-number-grow"
                style={{ color: card.accent, animationDelay: `${i * 80 + 150}ms` }}
              >
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Progress */}
      <div className="card p-4 mb-6">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-[#5B5FC7]" strokeWidth={1.75} />
            <span className="text-[12px] font-semibold text-[#0F1117]">签到进度</span>
          </div>
          <span className="text-[13px] font-bold text-[#5B5FC7] font-tabular">{stats.rate}%</span>
        </div>
        <div className="h-1.5 bg-[#F6F7F9] rounded-full overflow-hidden">
          <div
            className="h-full bg-[#5B5FC7] rounded-full transition-all duration-700 ease-out"
            style={{ width: `${stats.rate}%` }}
          />
        </div>
        <div className="flex items-center justify-between mt-1.5">
          <span className="text-[10px] text-[#99A0AE]">已签到 {stats.checked_in}</span>
          <span className="text-[10px] text-[#99A0AE]">共 {stats.total} 人</span>
        </div>
      </div>

      {/* Chart */}
      {stats.buckets.length > 0 && (
        <div className="card p-4 mb-6">
          <h3 className="text-[12px] font-semibold text-[#0F1117] mb-4">签到趋势</h3>
          <div className="flex items-end gap-1.5 h-32">
            {stats.buckets.map((bucket, i) => {
              const height = Math.max((bucket.count / maxBucketCount) * 100, 4);
              return (
                <div key={i} className="flex-1 flex flex-col items-center gap-1.5 group">
                  <div className="relative w-full flex justify-center">
                    <span className="absolute -top-4 text-[9px] font-semibold text-[#5B5FC7] opacity-0 group-hover:opacity-100 transition-opacity font-tabular">
                      {bucket.count}
                    </span>
                  </div>
                  <div
                    className="w-full bg-[#5B5FC7]/15 rounded-sm transition-all duration-500 ease-out min-h-[2px] group-hover:bg-[#5B5FC7]/40"
                    style={{ height: `${height}%` }}
                  />
                  <span className="text-[9px] text-[#99A0AE] whitespace-nowrap font-medium font-tabular">
                    {bucket.time}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Two columns */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Recent checkins */}
        <div className="card overflow-hidden">
          <div className="px-4 py-3 border-b border-[#EBEDF0] flex items-center justify-between">
            <h3 className="text-[12px] font-semibold text-[#0F1117]">最近签到</h3>
            <span className="badge badge-success">{stats.recent_checkins.length}</span>
          </div>
          <div className="divide-y divide-[#EBEDF0]">
            {stats.recent_checkins.length === 0 ? (
              <div className="py-10 text-center">
                <p className="text-[#99A0AE] text-[12px]">暂无签到记录</p>
              </div>
            ) : (
              stats.recent_checkins.map((c, i) => (
                <div
                  key={c.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#FAFBFC] transition-colors animate-stagger-in"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="w-7 h-7 rounded-md bg-[#EEEDFB] flex items-center justify-center text-[#5B5FC7] text-[10px] font-bold shrink-0">
                    {c.attendees?.name?.charAt(0) || '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#0F1117] truncate">
                      {c.attendees?.name || '未知'}
                    </p>
                    <p className="text-[10px] text-[#99A0AE] truncate">
                      {c.attendees?.position || ''} {c.attendees?.company ? `· ${c.attendees.company}` : ''}
                    </p>
                  </div>
                  <span className="text-[10px] text-[#99A0AE] shrink-0 font-medium font-tabular">
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
          <div className="px-4 py-3 border-b border-[#EBEDF0] flex items-center justify-between">
            <h3 className="text-[12px] font-semibold text-[#0F1117]">未签到</h3>
            <span className="badge badge-warning">{stats.not_checked_in.length}</span>
          </div>
          <div className="divide-y divide-[#EBEDF0]">
            {stats.not_checked_in.length === 0 ? (
              <div className="py-10 text-center">
                <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-[#D1FAE5] flex items-center justify-center">
                  <CheckCircle2 className="w-4 h-4 text-[#10B981]" strokeWidth={2} />
                </div>
                <p className="text-[#059669] text-[12px] font-medium">全部已签到</p>
              </div>
            ) : (
              stats.not_checked_in.map((a, i) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 px-4 py-2.5 hover:bg-[#FAFBFC] transition-colors animate-stagger-in"
                  style={{ animationDelay: `${i * 30}ms` }}
                >
                  <div className="w-7 h-7 rounded-md bg-[#F6F7F9] flex items-center justify-center text-[#525866] text-[10px] font-bold shrink-0">
                    {a.name.charAt(0)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[12px] font-semibold text-[#0F1117] truncate">{a.name}</p>
                    <p className="text-[10px] text-[#99A0AE] truncate">
                      {a.position || ''} {a.company ? `· ${a.company}` : ''}
                    </p>
                  </div>
                  <div className="w-1.5 h-1.5 rounded-full bg-[#F59E0B]/40 shrink-0" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
