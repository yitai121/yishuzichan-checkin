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
    <div className="p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-[#111827]">签到看板</h1>
          <p className="text-sm text-[#6B7280] mt-0.5">实时签到数据监控</p>
        </div>
        <select
          value={selectedMeeting}
          onChange={(e) => setSelectedMeeting(e.target.value)}
          className="px-3 py-2 text-sm border border-[#E5E7EB] rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-[#5B5FC7]/30"
        >
          {meetings.map((m) => (
            <option key={m.id} value={m.id}>
              {m.name} {m.is_active ? '(当前)' : ''}
            </option>
          ))}
        </select>
      </div>

      {!selectedMeeting ? (
        <div className="text-center py-20 text-[#6B7280]">请先创建会议</div>
      ) : loading ? (
        <div className="text-center py-20 text-[#6B7280]">加载中...</div>
      ) : stats ? (
        <>
          {/* Stats cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <StatCard label="总人数" value={stats.total} color="#5B5FC7" />
            <StatCard label="已签到" value={stats.checked_in} color="#10B981" />
            <StatCard label="签到率" value={`${stats.rate}%`} color="#5B5FC7" />
            <StatCard
              label="平均签到时长"
              value={stats.avg_minutes !== null ? `${stats.avg_minutes} 分钟` : '-'}
              color="#F59E0B"
            />
          </div>

          {/* Chart */}
          {stats.buckets.length > 0 && (
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-5 mb-6">
              <h3 className="text-sm font-semibold text-[#111827] mb-4">签到曲线（10分钟分桶）</h3>
              <div className="flex items-end gap-1 h-32">
                {stats.buckets.map((bucket, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full bg-[#5B5FC7]/80 rounded-t transition-all duration-300 min-h-[2px]"
                      style={{ height: `${(bucket.count / maxBucketCount) * 100}%` }}
                      title={`${bucket.time}: ${bucket.count}人`}
                    />
                    <span className="text-[10px] text-[#9CA3AF] whitespace-nowrap">
                      {bucket.time}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Two columns: recent + not checked in */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Recent checkins */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
              <h3 className="text-sm font-semibold text-[#111827] mb-3">
                最近签到 ({stats.recent_checkins.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {stats.recent_checkins.length === 0 ? (
                  <p className="text-sm text-[#9CA3AF] text-center py-4">暂无签到记录</p>
                ) : (
                  stats.recent_checkins.map((c) => (
                    <div key={c.id} className="flex items-center gap-3 py-1.5">
                      <div className="w-8 h-8 rounded-full bg-[#5B5FC7]/10 flex items-center justify-center text-[#5B5FC7] text-xs font-semibold shrink-0">
                        {c.attendees?.name?.charAt(0) || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#111827] truncate">
                          {c.attendees?.name || '未知'}
                        </p>
                        <p className="text-xs text-[#9CA3AF] truncate">
                          {c.attendees?.position || ''} {c.attendees?.company ? `· ${c.attendees.company}` : ''}
                        </p>
                      </div>
                      <span className="text-xs text-[#9CA3AF] shrink-0">
                        {new Date(c.checkin_at).toLocaleTimeString('zh-CN', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Shanghai',
                        })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Not checked in */}
            <div className="bg-white rounded-xl border border-[#E5E7EB] p-5">
              <h3 className="text-sm font-semibold text-[#111827] mb-3">
                未签到 ({stats.not_checked_in.length})
              </h3>
              <div className="space-y-2 max-h-96 overflow-y-auto">
                {stats.not_checked_in.length === 0 ? (
                  <p className="text-sm text-[#10B981] text-center py-4">全部已签到！</p>
                ) : (
                  stats.not_checked_in.map((a) => (
                    <div key={a.id} className="flex items-center gap-3 py-1.5">
                      <div className="w-8 h-8 rounded-full bg-[#F3F4F6] flex items-center justify-center text-[#6B7280] text-xs font-semibold shrink-0">
                        {a.name.charAt(0)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#111827] truncate">{a.name}</p>
                        <p className="text-xs text-[#9CA3AF] truncate">
                          {a.position || ''} {a.company ? `· ${a.company}` : ''}
                        </p>
                      </div>
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

function StatCard({ label, value, color }: { label: string; value: string | number; color: string }) {
  return (
    <div className="bg-white rounded-xl border border-[#E5E7EB] p-4">
      <p className="text-xs text-[#6B7280] mb-1">{label}</p>
      <p className="text-2xl font-bold tabular-nums" style={{ color }}>
        {value}
      </p>
    </div>
  );
}
