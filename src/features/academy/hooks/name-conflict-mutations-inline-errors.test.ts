/**
 * W4 — every form that shows a taken name on its name field renders all of
 * its failures itself, so each mutation behind one declares
 * `meta.inlineErrors`: without it the app-wide error toast repeated the
 * field message as a second, floating copy.
 */
import { describe, expect, it, vi } from 'vitest';
import { INLINE_ERRORS_META } from '@services/query';

const captured: Array<{ meta?: Record<string, unknown> }> = [];

vi.mock('@/shared/hooks', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useApiMutation: (options: { meta?: Record<string, unknown> }) => {
    captured.push(options);
    return {};
  },
  useAuth: () => ({ refreshSession: vi.fn() }),
  useInvalidate: () => ({ invalidate: vi.fn() }),
}));
vi.mock('@tanstack/react-query', async (importOriginal) => ({
  ...(await importOriginal<Record<string, unknown>>()),
  useQueryClient: () => ({}),
}));

const hooks = {
  useUpdateAcademy: async () =>
    (await import('./useUpdateAcademy')).useUpdateAcademy,
  useUpdateAcademyBranding: async () =>
    (await import('./useUpdateAcademyBranding')).useUpdateAcademyBranding,
  useCreateAcademyStudent: async () =>
    (await import('./useCreateAcademyStudent')).useCreateAcademyStudent,
  useCreateOrganization: async () =>
    (await import('@features/organization/hooks/useCreateOrganization'))
      .useCreateOrganization,
  useUpdateProfile: async () =>
    (await import('@features/profile/hooks/useUpdateProfile')).useUpdateProfile,
  useCreateProvisioningRequest: async () =>
    (await import('@features/provisioning/hooks/useCreateProvisioningRequest'))
      .useCreateProvisioningRequest,
};

describe('name-conflict mutations render their own failures', () => {
  it.each(Object.keys(hooks))('%s declares meta.inlineErrors', async (name) => {
    const hook = await hooks[name as keyof typeof hooks]();
    captured.length = 0;
    (hook as () => unknown)();
    expect(captured).toHaveLength(1);
    expect(captured[0].meta?.[INLINE_ERRORS_META]).toBe(true);
  });
});
