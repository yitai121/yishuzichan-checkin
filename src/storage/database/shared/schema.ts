import { pgTable, serial, timestamp, text, boolean, index, uniqueIndex } from "drizzle-orm/pg-core"
import { sql } from "drizzle-orm"

export const healthCheck = pgTable("health_check", {
	id: serial().notNull(),
	updatedAt: timestamp("updated_at", { withTimezone: true, mode: 'string' }).defaultNow(),
});

export const meetings = pgTable(
  "meetings",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    name: text("name").notNull(),
    location: text("location"),
    start_at: timestamp("start_at", { withTimezone: true }),
    is_active: boolean("is_active").default(false).notNull(),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("meetings_is_active_idx").on(table.is_active),
    index("meetings_created_at_idx").on(table.created_at),
  ]
);

export const attendees = pgTable(
  "attendees",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    meeting_id: text("meeting_id").notNull().references(() => meetings.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    phone: text("phone"),
    position: text("position"),
    company: text("company"),
    note: text("note"),
    signin_code: text("signin_code").notNull().default(sql`gen_random_uuid()::text`),
    created_at: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => [
    index("attendees_meeting_id_idx").on(table.meeting_id),
    uniqueIndex("attendees_signin_code_unique_idx").on(table.signin_code),
  ]
);

export const checkins = pgTable(
  "checkins",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()::text`),
    attendee_id: text("attendee_id").notNull().references(() => attendees.id, { onDelete: "cascade" }),
    meeting_id: text("meeting_id").notNull().references(() => meetings.id, { onDelete: "cascade" }),
    checkin_at: timestamp("checkin_at", { withTimezone: true }).defaultNow().notNull(),
    device_info: text("device_info"),
  },
  (table) => [
    index("checkins_attendee_id_idx").on(table.attendee_id),
    index("checkins_meeting_id_idx").on(table.meeting_id),
    index("checkins_checkin_at_idx").on(table.checkin_at),
    uniqueIndex("checkins_attendee_meeting_unique_idx").on(table.attendee_id, table.meeting_id),
  ]
);
