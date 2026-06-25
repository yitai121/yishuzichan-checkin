-- ============================================================
-- 亿数嘉年华签到系统 - 数据库完整迁移脚本
-- 适用于 Supabase PostgreSQL
-- 使用方法：在 Supabase SQL Editor 中执行，或通过 psql 导入
-- ============================================================

-- 1. 创建会议表
CREATE TABLE IF NOT EXISTS meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  location TEXT,
  start_at TIMESTAMPTZ,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 创建参会人表
CREATE TABLE IF NOT EXISTS attendees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  phone TEXT,
  position TEXT,
  company TEXT,
  note TEXT,
  signin_code TEXT NOT NULL DEFAULT gen_random_uuid()::text,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 3. 创建签到记录表
CREATE TABLE IF NOT EXISTS checkins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  attendee_id UUID NOT NULL REFERENCES attendees(id) ON DELETE CASCADE,
  meeting_id UUID NOT NULL REFERENCES meetings(id) ON DELETE CASCADE,
  checkin_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  device_info TEXT
);

-- 4. 创建索引
CREATE INDEX IF NOT EXISTS idx_attendees_meeting_id ON attendees(meeting_id);
CREATE INDEX IF NOT EXISTS idx_checkins_meeting_id ON checkins(meeting_id);
CREATE INDEX IF NOT EXISTS idx_checkins_attendee_id ON checkins(attendee_id);
CREATE INDEX IF NOT EXISTS idx_meetings_is_active ON meetings(is_active);

-- 5. 唯一索引（防止重复签到码和重复签到）
CREATE UNIQUE INDEX IF NOT EXISTS attendees_signin_code_unique_idx ON attendees(signin_code);
CREATE UNIQUE INDEX IF NOT EXISTS checkins_attendee_meeting_unique_idx ON checkins(attendee_id, meeting_id);

-- 6. 启用 RLS
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendees ENABLE ROW LEVEL SECURITY;
ALTER TABLE checkins ENABLE ROW LEVEL SECURITY;

-- 7. RLS 策略
-- meetings: anon 可读
DROP POLICY IF EXISTS meetings_anon_select ON meetings;
CREATE POLICY meetings_anon_select ON meetings FOR SELECT TO anon USING (true);

-- attendees: anon 可读
DROP POLICY IF EXISTS attendees_anon_select ON attendees;
CREATE POLICY attendees_anon_select ON attendees FOR SELECT TO anon USING (true);

-- checkins: anon 可读可写（前台扫码用）
DROP POLICY IF EXISTS checkins_anon_select ON checkins;
CREATE POLICY checkins_anon_select ON checkins FOR SELECT TO anon USING (true);

DROP POLICY IF EXISTS checkins_anon_insert ON checkins;
CREATE POLICY checkins_anon_insert ON checkins FOR INSERT TO anon WITH CHECK (true);

-- 8. 完成提示
DO $$
BEGIN
  RAISE NOTICE '亿数嘉年华签到系统数据库初始化完成！';
  RAISE NOTICE '表: meetings, attendees, checkins';
  RAISE NOTICE '唯一索引: attendees.signin_code, checkins(attendee_id, meeting_id)';
  RAISE NOTICE 'RLS: 已启用';
END $$;
