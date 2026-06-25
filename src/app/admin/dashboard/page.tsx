'use client';

import { useState, useEffect, useCallback } from 'react';

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

  return (
    <div className="p-6 lg:p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-xl font-bold text-[#111827] tracking-tight">签到看板</h1>
          <p className="text-[13px] text-[#9CA3AF] mt-1">实时签到数据监控</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#10B981]/[0.08] border border-[#10B981]/15">
            <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
            <span className="text-[11px] font-medium text-[#10B981]">实时</span>
          </div>
          <select
            value={selectedMeeting}
            onChange={(e) => setSelectedMeeting(e.target.value)}
            className="px-4 py-2.5 text-[13px] border border-[#E5E7EB] rounded-xl bg-white text-[#374151] focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/20 focus:border-[#5B5FC7]/30 font-medium shadow-sm transition-all"
          >
            {meetings.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} {m.is_active ? '(当前)' : ''}
              </option>
            ))}
          </select>
        </div>
      </div>

      {!selectedMeeting ? (
        <div className="text-center py-24">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-[#F3F4F6] flex items-center justify-center">
            <svg className="w-8 h-8 text-[#9CA3AF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
          </div>
          <p className="text-[#6B7280] text-sm">请先创建会议</p>
        </div>
      ) : loading ? (
        <div className="text-center py-24">
          <div className="w-5 h-5 mx-auto border-2 border-[#5B5FC7]/30 border-t-[#5B5FC7] rounded-full animate-spin" />
          <p className="text-[#6B7280] text-sm mt-3">加载中...</p>
        </div>
      ) : stats ? (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <StatCard
              label="总人数"
              value={stats.total}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
                </svg>
              }
              color="#5B5FC7"
              bgColor="#EEEDFB"
            />
            <StatCard
              label="已签到"
              value={stats.checked_in}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                </svg>
              }
              color="#10B981"
              bgColor="#ECFDF5"
            />
            <StatCard
              label="签到率"
              value={`${stats.rate}%`}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                </svg>
              }
              color="#5B5FC7"
              bgColor="#EEEDFB"
            />
            <StatCard
              label="平均签到时长"
              value={stats.avg_minutes !== null ? `${stats.avg_minutes} 分钟` : '-'}
              icon={
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
              color="#F59E0B"
              bgColor="#FFFBEB"
            />
          </div>

          {/* Progress bar */}
          <div className="bg-white rounded-2xl border border-[#E5E7EB]/80 p-5 mb-6 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[13px] font-medium text-[#374151]">签到进度</span>
              <span className="text-[13px] font-semibold text-[#5B5FC7] tabular-nums">{stats.rate}%</span>
            </div>
            <div className="h-2.5 bg-[#F3F4F6] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#5B5FC7] to-[#7B7FD7] rounded-full transition-all duration-700 ease-out"
                style={{ width: `${stats.rate}%` }}
              />
            </div>
          </div>

          {/* Chart */}
          {stats.buckets.length > 0 && (
            <div className="bg-white rounded-2xl border border-[#E5E7EB]/80 p-5 mb-6 shadow-sm">
              <h3 className="text-[13px] font-semibold text-[#111827] mb-5">签到趋势</h3>
              <div className="flex items-end gap-1.5 h-36">
                {stats.buckets.map((bucket, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2 group">
                    <div className="relative w-full flex justify-center">
                      <span className="absolute -top-6 text-[10px] font-medium text-[#5B5FC7] opacity-0 group-hover:opacity-100 transition-opacity tabular-nums">
                        {bucket.count}
                      </span>
                    </div>
                    <div
                      className="w-full bg-gradient-to-t from-[#5B5FC7]/80 to-[#5B5FC7]/40 rounded-lg transition-all duration-500 ease-out min-h-[3px] group-hover:from-[#5B5FC7] group-hover:to-[#5B5FC7]/60"
                      style={{ height: `${Math.max((bucket.count / maxBucketCount) * 100, 3)}%` }}
                    />
                    <span className="text-[10px] text-[#9CA3AF] whitespace-nowrap font-medium tabular-nums">
                      {bucket.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Two columns */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent checkins */}
            <div className="bg-white rounded-2xl border border-[#E5E7EB]/80 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#F3F4F6]">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold text-[#111827]">最近签到</h3>
                  <span className="text-[11px] font-medium text-[#5B5FC7] bg-[#EEEDFB] px-2 py-0.5 rounded-full tabular-nums">
                    {stats.recent_checkins.length}
                  </span>
                </div>
              </div>
              <div className="divide-y divide-[#F9FAFB]">
                {stats.recent_checkins.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-[#9CA3AF] text-sm">暂无签到记录</p>
                  </div>
                ) : (
                  stats.recent_checkins.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#FAFBFC] transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#5B5FC7]/10 to-[#5B5FC7]/5 flex items-center justify-center text-[#5B5FC7] text-xs font-bold shrink-0 ring-1 ring-[#5B5FC7]/10">
                        {c.attendees?.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#111827] truncate">
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
            <div className="bg-white rounded-2xl border border-[#E5E7EB]/80 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-[#F3F4F6]">
                <div className="flex items-center justify-between">
                  <h3 className="text-[13px] font-semibold text-[#111827]">未签到</h3>
                  <span className="text-[11px] font-medium text-[#6B7280] bg-[#F3F4F6] px-2 py-0.5 rounded-full tabular-nums">
                    {stats.not_checked_in.length}
                  </span>
                </div>
              </div>
              <div className="divide-y divide-[#F9FAFB]">
                {stats.not_checked_in.length === 0 ? (
                  <div className="py-12 text-center">
                    <div className="w-10 h-10 mx-auto mb-3 rounded-full bg-[#ECFDF5] flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#10B981]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                      </svg>
                    </div>
                    <p className="text-[#10B981] text-sm font-medium">全部已签到</p>
                  </div>
                ) : (
                  stats.not_checked_in.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 px-5 py-3 hover:bg-[#FAFBFC] transition-colors">
                      <div className="w-9 h-9 rounded-xl bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] text-xs font-bold shrink-0">
                        {a.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-semibold text-[#111827] truncate">{a.name}</p>
                        <p className="text-[11px] text-[#9CA3AF] truncate mt-0.5">
                          {a.position || ''} {a.company ? `· ${a.company}` : ''}
                        </p>
                      </div>
                      <div className="w-2 h-2 rounded-full bg-[#F59E0B]/40 shrink-0" />
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  color,
  bgColor,
}: {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E7EB]/80 p-5 shadow-sm hover:shadow-md transition-shadow duration-300">
      <div className="flex items-center justify-between mb-3">
        <span className="text-[12px] font-medium text-[#6B7280]">{label}</span>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center" style={{ backgroundColor: bgColor }}>
          <span style={{ color }}>{icon}</span>
        </div>
      </div>
      <p className="text-2xl font-bold tabular-nums tracking-tight" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
