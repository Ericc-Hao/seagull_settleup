export function quoteGroupName(groupName: string): string {
  return `"${groupName}"`;
}

/** Display label for inviter in notification body. */
export function formatInviterNameOrEmail(inviterName?: string, inviterEmail?: string): string {
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
  return 'A group member';
}

/** Inviter line for modal info card — email only if name missing. */
export function formatInviterByLine(inviterName?: string, inviterEmail?: string): string {
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
  return 'A group member';
}

export function resolveGroupDisplayName(groupName?: string): string {
  const trimmed = groupName?.trim();
  return trimmed || 'this group';
}

export function formatInvitationNotificationBody(input: {
  inviterName?: string;
  inviterEmail?: string;
  groupName?: string;
}): string {
  const inviter = formatInviterNameOrEmail(input.inviterName, input.inviterEmail);
  const group = quoteGroupName(resolveGroupDisplayName(input.groupName));
  return `${inviter} invited you to join ${group}.`;
}

export function formatInvitationModalTitle(groupName?: string): string {
  return `Join ${quoteGroupName(resolveGroupDisplayName(groupName))}?`;
}

export function formatInvitationModalBody(input: {
  inviterName?: string;
  inviterEmail?: string;
  groupName?: string;
}): string {
  const inviter = formatInviterNameOrEmail(input.inviterName, input.inviterEmail);
  const group = quoteGroupName(resolveGroupDisplayName(input.groupName));
  return `${inviter} invited you to join ${group}. Accept this invitation to view shared expenses, add bills, and settle balances with the group.`;
}

export function formatInvitationEmailSubject(groupName: string): string {
  return `You've been invited to join ${quoteGroupName(groupName)} on Seagull Split`;
}

export function formatInvitationEmailBodyLine(input: {
  inviterName?: string;
  inviterEmail?: string;
  groupName: string;
}): string {
  const inviter = formatInviterNameOrEmail(input.inviterName, input.inviterEmail);
  return `${inviter} invited you to join ${quoteGroupName(input.groupName)} on Seagull Split.`;
}

/** @deprecated Use formatInvitationNotificationBody */
export function formatInvitationMessage(input: {
  inviterName?: string;
  inviterEmail?: string;
  groupName: string;
}): string {
  return formatInvitationNotificationBody(input);
}

export const GROUP_INVITATION_NOTIFICATION_TITLE = 'Group invitation';
