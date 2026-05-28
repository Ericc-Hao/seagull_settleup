import { describe, expect, it } from 'vitest';

import { INVITE_EMAIL_ERRORS, resolveFinalInviteEmails } from '../inviteEmailSubmit';

describe('resolveFinalInviteEmails', () => {
  it('includes current input when send is pressed without pressing +', () => {
    const result = resolveFinalInviteEmails([], 'Friend@Example.com', { requireAtLeastOne: true });
    expect(result).toEqual({ ok: true, finalEmails: ['friend@example.com'] });
  });

  it('requires at least one email when configured', () => {
    const result = resolveFinalInviteEmails([], '', { requireAtLeastOne: true });
    expect(result).toEqual({ ok: false, error: INVITE_EMAIL_ERRORS.empty });
  });

  it('allows empty submit when invites are optional', () => {
    const result = resolveFinalInviteEmails([], '');
    expect(result).toEqual({ ok: true, finalEmails: [] });
  });

  it('rejects invalid current input', () => {
    const result = resolveFinalInviteEmails([], 'not-an-email', { requireAtLeastOne: true });
    expect(result).toEqual({ ok: false, error: INVITE_EMAIL_ERRORS.invalid });
  });

  it('combines added emails with current input', () => {
    const result = resolveFinalInviteEmails(['one@example.com'], 'two@example.com', { requireAtLeastOne: true });
    expect(result).toEqual({ ok: true, finalEmails: ['one@example.com', 'two@example.com'] });
  });

  it('rejects duplicate current input against added list', () => {
    const result = resolveFinalInviteEmails(['one@example.com'], 'ONE@example.com', { requireAtLeastOne: true });
    expect(result).toEqual({ ok: false, error: INVITE_EMAIL_ERRORS.duplicate });
  });

  it('submits only added emails when input is empty', () => {
    const result = resolveFinalInviteEmails(['one@example.com'], '', { requireAtLeastOne: true });
    expect(result).toEqual({ ok: true, finalEmails: ['one@example.com'] });
  });
});
