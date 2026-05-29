import { describe, expect, it } from 'vitest';

import { getInvitationUrl, getPasswordResetUrl, getPublicWebBaseUrl, PUBLIC_WEB_BASE_DEFAULT } from '../publicUrls';

describe('publicUrls', () => {
  it('builds password reset and invitation links from the public web base', () => {
    const base = getPublicWebBaseUrl();
    expect(base).toBe(PUBLIC_WEB_BASE_DEFAULT);
    expect(getPasswordResetUrl()).toBe(`${base}/reset-password`);
    expect(getInvitationUrl('invite-token')).toBe(`${base}/register?invite=invite-token`);
  });
});
