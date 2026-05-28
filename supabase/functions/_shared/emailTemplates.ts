export interface GroupInvitationEmailParams {
  inviterNameOrEmail: string;
  groupName: string;
  inviteLink: string;
  invitedEmail: string;
  iconUrl?: string;
  inviteeHasAccount?: boolean;
}

export interface GroupInvitationEmail {
  subject: string;
  html: string;
  text: string;
}

const FONT_STACK =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif';

function isUsableIconUrl(iconUrl?: string): boolean {
  const trimmed = iconUrl?.trim();
  return Boolean(trimmed && /^https:\/\/.+/i.test(trimmed));
}

function buildLogoMarkup(iconUrl?: string): string {
  const logoContainerStyle =
    'display:inline-block;width:56px;height:56px;border-radius:18px;background-color:#FFFFFF;overflow:hidden;box-shadow:0 8px 22px rgba(80,90,160,0.12);text-align:center;line-height:56px;';

  if (isUsableIconUrl(iconUrl)) {
    const safeIconUrl = escapeHtmlAttribute(iconUrl!.trim());
    return `<div style="${logoContainerStyle}">
      <img
        src="${safeIconUrl}"
        width="56"
        height="56"
        alt="Seagull Split"
        border="0"
        style="display:block;width:56px;height:56px;border:0;outline:none;text-decoration:none;border-radius:18px;"
      />
    </div>`;
  }

  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="${logoContainerStyle}">
    <tr>
      <td align="center" valign="middle" width="56" height="56" style="width:56px;height:56px;padding:0;">
        <svg xmlns="http://www.w3.org/2000/svg" width="56" height="56" viewBox="0 0 56 56" role="img" aria-label="Seagull Split">
          <rect width="56" height="56" rx="18" fill="#EEF1FF"/>
          <rect x="8" y="8" width="40" height="40" rx="14" fill="#B1B2FF"/>
          <path d="M18 34c6-8 14-8 20 0" stroke="#FFFFFF" stroke-width="3" stroke-linecap="round" fill="none"/>
          <circle cx="22" cy="24" r="2.5" fill="#FFFFFF"/>
          <circle cx="34" cy="24" r="2.5" fill="#FFFFFF"/>
        </svg>
      </td>
    </tr>
  </table>`;
}

function buildBrandMarkHtml(iconUrl?: string): string {
  return `<table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 18px;">
  <tr>
    <td align="left" style="padding:0;">
      ${buildLogoMarkup(iconUrl)}
    </td>
  </tr>
</table>`;
}

export function buildGroupInvitationEmail(params: GroupInvitationEmailParams): GroupInvitationEmail {
  const { inviterNameOrEmail, groupName, inviteLink, invitedEmail, iconUrl, inviteeHasAccount } = params;

  const subject = `You've been invited to join "${groupName}" on Seagull Split`;
  const bodyLine = `${inviterNameOrEmail} invited you to join "${groupName}" on Seagull Split.`;
  const actionLine = inviteeHasAccount
    ? 'Log in with this email to accept the invitation.'
    : 'Create an account with this email to accept the invitation.';

  const text = [
    `You've been invited to join "${groupName}" on Seagull Split.`,
    '',
    bodyLine,
    '',
    actionLine,
    '',
    "After accepting, you'll be able to view shared expenses, add bills, track who paid, and settle balances with the group.",
    '',
    'Accept invitation:',
    inviteLink,
    '',
    `Sent to: ${invitedEmail}`,
    '',
    'If you do not recognize this invitation, you can ignore this email.',
  ].join('\n');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>${escapeHtml(subject)}</title>
</head>
<body style="margin:0;padding:0;background-color:#EEF1FF;font-family:${FONT_STACK};color:#1F2740;-webkit-text-size-adjust:100%;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color:#EEF1FF;padding:32px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="max-width:560px;background-color:#FFFFFF;border-radius:26px;overflow:hidden;border:1px solid #D2DAFF;">
          <tr>
            <td style="padding:32px 32px 24px;background:linear-gradient(135deg,#EEF1FF 0%,#D2DAFF 55%,#AAC4FF 100%);">
              ${buildBrandMarkHtml(iconUrl)}
              <p style="margin:0 0 6px;font-size:14px;font-weight:700;letter-spacing:0.3px;color:#1F2740;">Seagull Split</p>
              <p style="margin:0 0 20px;font-size:13px;line-height:1.5;color:#53618A;">Shared expenses, clearly settled.</p>
              <h1 style="margin:0;font-size:22px;line-height:1.35;font-weight:700;color:#1F2740;">You've been invited to a shared expense group</h1>
            </td>
          </tr>
          <tr>
            <td style="padding:32px;">
              <p style="margin:0 0 20px;font-size:16px;line-height:1.6;color:#1F2740;">
                ${escapeHtml(bodyLine)}
              </p>
              <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#53618A;">
                ${escapeHtml(actionLine)}
              </p>
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 24px;background-color:#F7F8FF;border:1px solid #D2DAFF;border-radius:20px;">
                <tr>
                  <td style="padding:20px 22px;">
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                        <td style="padding:0 0 14px;">
                          <p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;color:#7080B0;">Group</p>
                          <p style="margin:0;font-size:16px;line-height:1.5;font-weight:600;color:#1F2740;">${escapeHtml(groupName)}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:14px 0;border-top:1px solid #D2DAFF;">
                          <p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;color:#7080B0;">Invited by</p>
                          <p style="margin:0;font-size:15px;line-height:1.5;color:#1F2740;">${escapeHtml(inviterNameOrEmail)}</p>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:14px 0 0;border-top:1px solid #D2DAFF;">
                          <p style="margin:0 0 4px;font-size:12px;font-weight:600;letter-spacing:0.4px;text-transform:uppercase;color:#7080B0;">Sent to</p>
                          <p style="margin:0;font-size:15px;line-height:1.5;color:#53618A;">${escapeHtml(invitedEmail)}</p>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#53618A;">
                After accepting, you'll be able to view shared expenses, add bills, track who paid, and settle balances with the group.
              </p>
              <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin:0 0 28px;">
                <tr>
                  <td align="center" style="border-radius:14px;background-color:#B1B2FF;">
                    <a href="${escapeHtmlAttribute(inviteLink)}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:16px 32px;font-size:16px;font-weight:600;line-height:1.2;color:#1F2740;text-decoration:none;">Accept Invitation</a>
                  </td>
                </tr>
              </table>
              <p style="margin:0 0 8px;font-size:13px;line-height:1.6;color:#53618A;">
                If the button does not work, copy and paste this link into your browser:
              </p>
              <p style="margin:0;font-size:13px;line-height:1.6;word-break:break-all;">
                <a href="${escapeHtmlAttribute(inviteLink)}" target="_blank" rel="noopener noreferrer" style="color:#53618A;text-decoration:underline;">${escapeHtml(inviteLink)}</a>
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding:20px 32px 32px;border-top:1px solid #D2DAFF;">
              <p style="margin:0;font-size:12px;line-height:1.6;color:#7080B0;">
                If you do not recognize this invitation, you can safely ignore this email.
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

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value);
}

export { buildLogoMarkup, isUsableIconUrl };
