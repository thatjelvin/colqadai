import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";

let resend: Resend;
if (process.env.RESEND_API_KEY) {
  resend = new Resend(process.env.RESEND_API_KEY);
}

export async function GET(req: NextRequest) {
  // Required cron security check
  const authHeader = req.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    if (!resend) {
      return NextResponse.json({ success: true, count: 0 });
    }
    return NextResponse.json({ success: true, count: 0 });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: "Failed to send reminders" }, { status: 500 });
  }
}
