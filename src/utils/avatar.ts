export function avatarInitials(displayName?: string | null, email?: string | null): string {
  const trimmedName = displayName?.trim();
  if (trimmedName) {
    const parts = trimmedName.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) {
      return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
    }
    return trimmedName.charAt(0).toUpperCase();
  }

  const emailPrefix = email?.split('@')[0]?.trim();
  if (emailPrefix) {
    return emailPrefix.charAt(0).toUpperCase();
  }

  return '?';
}
