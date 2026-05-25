export function buildInvitationEmail(input: {
  groupName: string;
  inviterName?: string;
  inviterEmail?: string;
  inviteLink: string;
}): { subject: string; html: string; text: string } {
  const { groupName, inviterName, inviterEmail, inviteLink } = input;
  const inviter = formatInviterLine(inviterName, inviterEmail);
  const subject = `You've been invited to join "${groupName}" on Seagull Split`;
  const bodyLine = `${inviter} invited you to join "${groupName}" on Seagull Split.`;

  const text = [
    bodyLine,
    '',
    'Accept this invitation to view shared expenses, add bills, and settle balances with the group.',
    '',
    `Accept invitation: ${inviteLink}`,
    '',
    'If the button does not work, open Seagull Split and check your pending invitations.',
    '',
    'If you do not recognize this invitation, you can ignore this email.',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#EEF1FF;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#1C2340;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color:#EEF1FF;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:560px;background-color:#FFFFFF;border-radius:20px;overflow:hidden;box-shadow:0 8px 24px rgba(28,35,64,0.08);">
          <tr>
            <td style="padding:28px 28px 16px;background:linear-gradient(135deg,#B1B2FF 0%,#AAC4FF 100%);">
              <div style="font-size:13px;font-weight:600;letter-spacing:0.4px;color:#1C2340;opacity:0.85;">Seagull Split</div>
              <h1 style="margin:12px 0 0;font-size:24px;line-height:1.3;font-weight:700;color:#1C2340;">You've been invited to a shared expense group</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:28px;">
              <p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#1C2340;">
                ${escapeHtml(bodyLine)}
              </p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#6B7AAB;">
                Accept this invitation to view shared expenses, add bills, and settle balances with the group.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" style="margin:0 0 24px;">
                <tr>
                  <td style="border-radius:12px;background-color:#B1B2FF;">
                    <a href="${inviteLink}" style="display:inline-block;padding:14px 24px;font-size:15px;font-weight:600;color:#1C2340;text-decoration:none;">Accept Invitation</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0;font-size:13px;line-height:1.6;color:#6B7AAB;">
                If the button does not work, open Seagull Split and check your pending invitations.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 28px 28px;border-top:1px solid #D2DAFF;">
              <p style="margin:0;font-size:12px;line-height:1.5;color:#9BA8C7;">
                If you do not recognize this invitation, you can ignore this email.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

  return { subject, html, text };
}

function formatInviterLine(inviterName?: string, inviterEmail?: string): string {
  const trimmedName = inviterName?.trim();
  const trimmedEmail = inviterEmail?.trim();
  if (trimmedName && trimmedEmail) {
    return `${trimmedName} (${trimmedEmail})`;
  }
  if (trimmedName) {
    return trimmedName;
  }
  if (trimmedEmail) {
    return trimmedEmail;
  }
  return 'Someone';
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}
