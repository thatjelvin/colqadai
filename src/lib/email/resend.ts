import { Resend } from 'resend';

const resendApiKey = process.env.RESEND_API_KEY || '';
export const resend = resendApiKey ? new Resend(resendApiKey) : null;

/**
 * Send an email using Resend.
 * @param to Recipient email address
 * @param subject Subject of the email
 * @param text Text content of the email
 * @param html Html content of the email
 */
export async function sendEmail({ to, subject, text, html }: { to: string; subject: string; text?: string; html?: string }) {
  if (!resend) {
    console.warn('Resend API key missing, email not sent:', { to, subject });
    return;
  }

  try {
    const data = await resend.emails.send({
      from: 'Colqad <noreply@colqad.com>',
      to,
      subject,
      text: text || '',
      html: html || '',
    });
    return data;
  } catch (error) {
    console.error('Failed to send email with Resend:', error);
    throw error;
  }
}
