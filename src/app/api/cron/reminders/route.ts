import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
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
    const now = new Date();

    const dueUsers = await prisma.user.findMany({
      where: {
        userProblems: {
          some: {
            nextReviewAt: { lte: now },
          },
        },
      },
      include: {
        userProblems: {
          where: {
            nextReviewAt: { lte: now },
          },
          include: {
            problem: {
              include: { topic: true },
            },
          },
        },
      },
    });

    const emailsToSend = dueUsers
      .filter((user) => user.email && resend)
      .map((user) => ({
        from: "Colqad <noreply@colqad.tech>",
        to: user.email,
        subject: `You have ${user.userProblems.length} problems due for review!`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h2>Time to practice!</h2>
            <p>Hi ${user.name || "Student"},</p>
            <p>You have <strong>${user.userProblems.length}</strong> math problems waiting for you in your spaced repetition deck.</p>
            <p>Topics include: ${user.userProblems.map((up) => up.problem.topic.name).slice(0, 3).join(", ")}${user.userProblems.length > 3 ? " and more" : ""}.</p>
            <a href="https://colqad.tech/dashboard" style="display: inline-block; background: #000; color: #fff; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Review Now</a>
          </div>
        `,
      }));

    if (emailsToSend.length > 0 && resend) {
      await resend.batch.send(emailsToSend);
    }

    return NextResponse.json({ success: true, count: emailsToSend.length });
  } catch (error) {
    console.error("Cron error:", error);
    return NextResponse.json({ error: "Failed to send reminders" }, { status: 500 });
  }
}
