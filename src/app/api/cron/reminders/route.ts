import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Required cron security check
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    return NextResponse.json({ success: true, count: 0 });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: "Failed to send reminders" }, { status: 500 });
  }
}
