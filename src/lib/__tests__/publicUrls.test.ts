import { describe, expect, it } from 'vitest';

import { getInvitationUrl, getPasswordResetUrl, getPublicWebBaseUrl } from '../publicUrls';

describe('publicUrls', () => {
  it('builds password reset and invitation links from the public web base', () => {
    const base = getPublicWebBaseUrl();
    expect(getPasswordResetUrl()).toBe(`${base}/reset-password`);
    expect(getInvitationUrl('invite-token')).toBe(`${base}/register?invite=invite-token`);
  });
});
