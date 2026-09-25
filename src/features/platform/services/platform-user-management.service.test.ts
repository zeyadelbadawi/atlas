/**
 * What the deletion request actually puts on the wire.
 *
 * WHY THIS EXISTS. `DeleteAccountDto` declares `confirm` as
 * `@IsBoolean() @Equals(true)` — deliberately, so "the operator explicitly
 * confirmed" is part of the contract rather than something trusted from the
 * UI. The dialog shipped sending `{}`, so every administrative deletion
 * failed `ValidationPipe` with a 400 and the modal showed "some information
 * needs to be corrected before saving". The backend was right; the client
 * was wrong.
 *
 * Nothing caught it. The dialog's own tests mock this service, so they
 * asserted the button was pressed and never what was sent; typecheck was
 * happy because the field was simply absent from an optional-only type; and
 * the endpoint returned a perfectly well-formed error. The gap was the
 * request body itself, which is what these tests pin.
 *
 * They assert the shape, not the transport: that `confirm: true` is always
 * present, that the caller cannot omit or override it, and that the path is
 * the flat hyphenated resource rather than a slashed one — `resourcePath`
 * percent-encodes each segment, so a slash would 404.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlatformUserManagementService } from './PlatformUserManagementService';

interface Sent {
  path: string;
  body: unknown;
}

/** A client that records what it was asked to send. */
function buildClient(sent: Sent[]) {
  return {
    get: vi.fn(async (path: string) => {
      sent.push({ path, body: undefined });
      return {} as unknown;
    }),
    post: vi.fn(async (path: string, body: unknown) => {
      sent.push({ path, body });
      return { deleted: true, academiesArchived: 0 };
    }),
  } as never;
}

afterEach(() => vi.clearAllMocks());

describe('PlatformUserManagementService.deleteUser', () => {
  it('always sends confirm: true, which the API requires', async () => {
    const sent: Sent[] = [];
    const service = new PlatformUserManagementService(buildClient(sent));

    await service.deleteUser('u1', {});

    expect(sent).toHaveLength(1);
    expect(sent[0]?.body).toMatchObject({ confirm: true });
  });

  it('keeps confirm: true even when the caller passes a reason', async () => {
    const sent: Sent[] = [];
    const service = new PlatformUserManagementService(buildClient(sent));

    await service.deleteUser('u1', { reason: 'privacy_concerns' });

    expect(sent[0]?.body).toMatchObject({
      confirm: true,
      reason: 'privacy_concerns',
    });
  });

  it('cannot be talked out of confirming by a caller passing confirm: false', async () => {
    const sent: Sent[] = [];
    const service = new PlatformUserManagementService(buildClient(sent));

    // Not expressible through the public type, but a plain object at runtime
    // could carry it. The service sets the field last, so it wins.
    await service.deleteUser('u1', {
      confirm: false,
    } as unknown as Parameters<typeof service.deleteUser>[1]);

    expect(sent[0]?.body).toMatchObject({ confirm: true });
  });

  it('posts to the flat hyphenated resource, never a slashed one', async () => {
    const sent: Sent[] = [];
    const service = new PlatformUserManagementService(buildClient(sent));

    await service.deleteUser('u1', {});
    await service.getDeletionPlan('u1');

    // A slash inside the resource would be percent-encoded and 404 — a real
    // production bug once, which is why the convention exists.
    expect(sent[0]?.path).toContain('platform-user-management');
    expect(sent[0]?.path).not.toContain('%2F');
    expect(sent[0]?.path).toContain('delete');
    expect(sent[1]?.path).toContain('deletion-plan');
  });

  it('reads the plan without sending a body', async () => {
    const sent: Sent[] = [];
    const service = new PlatformUserManagementService(buildClient(sent));

    await service.getDeletionPlan('u1');

    expect(sent[0]?.body).toBeUndefined();
  });
});
