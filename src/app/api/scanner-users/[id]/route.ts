import { NextRequest, NextResponse } from "next/server";
import { getSupabaseClient } from "@/storage/database/supabase-client";
import { isValidUUID } from "@/lib/validation";

// DELETE /api/scanner-users/[id] - Delete a scanner user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = getSupabaseClient();
    const { id } = await params;

    if (!isValidUUID(id)) {
      return NextResponse.json({ success: false, error: "无效的用户ID" }, { status: 400 });
    }

    const { error } = await supabase
      .from("scanner_users")
      .delete()
      .eq("id", id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
