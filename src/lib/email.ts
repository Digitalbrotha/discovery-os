import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendInviteEmail({
  to,
  teamName,
  companyName,
  inviteUrl,
  role,
}: {
  to: string
  teamName: string
  companyName: string
  inviteUrl: string
  role: string
}) {
  const { error } = await resend.emails.send({
    from: 'Discovery OS <onboarding@resend.dev>',
    to,
    subject: `You've been invited to join ${teamName}`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:32px 16px">
        <h2 style="margin:0 0 16px;font-size:20px">You're invited</h2>
        <p style="color:#444;margin:0 0 24px">
          You've been invited to join <strong>${teamName}</strong>${companyName ? ` at <strong>${companyName}</strong>` : ''} as a <strong>${role}</strong>.
        </p>
        <a href="${inviteUrl}" style="display:inline-block;padding:10px 20px;background:#000;color:#fff;text-decoration:none;border-radius:6px;font-size:14px;font-weight:500">
          Accept invitation
        </a>
        <p style="color:#aaa;font-size:12px;margin-top:32px">
          This link expires in 7 days. If you weren't expecting this invite, you can ignore this email.
        </p>
      </div>
    `,
  })
  if (error) throw new Error(error.message)
}
