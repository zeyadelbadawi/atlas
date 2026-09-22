/**
 * Certificate hooks (P64 Phase 3, D6/D7) — learner, public and staff.
 */
import {
  useApiMutation,
  useApiQuery,
  useAuth,
  useInvalidate,
} from '@/shared/hooks';
import { certificateKeys, completionKeys } from '@services/query';
import type { ApiError } from '@api';
import { certificateService } from '../services/CertificateService';
import type {
  Certificate,
  CertificateDetail,
  CertificateDownload,
  CertificateTemplate,
  CertificateVerification,
  CollectionQuery,
  IssueCertificatePayload,
  LearnerCertificatesResponse,
  ListCertificatesQuery,
  PaginatedResult,
  RegenerateCertificatePayload,
  RevokeCertificatePayload,
  UpdateCertificateTemplatePayload,
} from '@types';

/* ---------- learner ---------- */

export function useMyCertificates(
  academyId: string,
  options?: { readonly enabled?: boolean }
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<LearnerCertificatesResponse, ApiError>({
    queryKey: certificateKeys.mine(user?.id, academyId),
    queryFn: () => certificateService.getMyCertificates(),
    enabled: enabled && !!user?.id,
  });
}

export function useMyCertificate(
  certificateId: string | undefined,
  options?: { readonly enabled?: boolean }
) {
  const { enabled = true } = options ?? {};
  const { user } = useAuth();

  return useApiQuery<CertificateDetail, ApiError>({
    queryKey: certificateKeys.detail(user?.id, certificateId ?? ''),
    queryFn: () => certificateService.getMyCertificate(certificateId ?? ''),
    enabled: enabled && !!user?.id && !!certificateId,
  });
}

/** A mutation, not a query: every call mints a fresh one-hour link. */
export function useMyCertificateDownload() {
  return useApiMutation<CertificateDownload, string, ApiError>({
    mutationFn: (certificateId) =>
      certificateService.getMyCertificateDownload(certificateId),
    showSuccessToast: false,
    showErrorToast: false,
  });
}

/* ---------- public ---------- */

export function useVerifyCertificate(code: string | undefined) {
  return useApiQuery<CertificateVerification, ApiError>({
    queryKey: certificateKeys.verify(code ?? ''),
    queryFn: () => certificateService.verify(code ?? ''),
    enabled: !!code,
    retry: false,
  });
}

/* ---------- academy staff ---------- */

export interface UseAcademyCertificatesOptions {
  readonly query?: CollectionQuery;
  readonly filters?: ListCertificatesQuery;
  readonly enabled?: boolean;
}

export function useAcademyCertificates(
  academyId: string,
  options?: UseAcademyCertificatesOptions
) {
  const { query, filters, enabled = true } = options ?? {};

  return useApiQuery<PaginatedResult<Certificate>, ApiError>({
    queryKey: certificateKeys.academyList(academyId, query, {
      courseId: filters?.courseId,
      status: filters?.status,
    }),
    queryFn: () => certificateService.listForAcademy(academyId, query, filters),
    enabled: enabled && !!academyId,
  });
}

export function useAcademyCertificate(
  academyId: string,
  certificateId: string | undefined,
  options?: { readonly enabled?: boolean }
) {
  const { enabled = true } = options ?? {};

  return useApiQuery<CertificateDetail, ApiError>({
    queryKey: certificateKeys.academyDetail(academyId, certificateId ?? ''),
    queryFn: () =>
      certificateService.getForAcademy(academyId, certificateId ?? ''),
    enabled: enabled && !!academyId && !!certificateId,
  });
}

function useInvalidateAcademyCertificates(academyId: string) {
  const { invalidate } = useInvalidate();
  return async () => {
    await invalidate(certificateKeys.all);
    // Completion screens show the certificate state too.
    await invalidate(completionKeys.all);
    void academyId;
  };
}

export function useRevokeCertificate(academyId: string) {
  const refresh = useInvalidateAcademyCertificates(academyId);
  return useApiMutation<
    Certificate,
    {
      readonly certificateId: string;
      readonly payload: RevokeCertificatePayload;
    },
    ApiError
  >({
    mutationFn: ({ certificateId, payload }) =>
      certificateService.revoke(academyId, certificateId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: refresh,
  });
}

export function useRegenerateCertificate(academyId: string) {
  const refresh = useInvalidateAcademyCertificates(academyId);
  return useApiMutation<
    Certificate,
    {
      readonly certificateId: string;
      readonly payload: RegenerateCertificatePayload;
    },
    ApiError
  >({
    mutationFn: ({ certificateId, payload }) =>
      certificateService.regenerate(academyId, certificateId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: refresh,
  });
}

export function useIssueCertificate(academyId: string) {
  const refresh = useInvalidateAcademyCertificates(academyId);
  return useApiMutation<
    Certificate,
    {
      readonly enrollmentId: string;
      readonly payload: IssueCertificatePayload;
    },
    ApiError
  >({
    mutationFn: ({ enrollmentId, payload }) =>
      certificateService.issueManually(academyId, enrollmentId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: refresh,
  });
}

export function useCertificateTemplate(
  academyId: string,
  options?: { readonly enabled?: boolean }
) {
  const { enabled = true } = options ?? {};

  return useApiQuery<CertificateTemplate, ApiError>({
    queryKey: certificateKeys.template(academyId),
    queryFn: () => certificateService.getTemplate(academyId),
    enabled: enabled && !!academyId,
  });
}

export function useUpdateCertificateTemplate(academyId: string) {
  const { invalidate } = useInvalidate();

  return useApiMutation<
    CertificateTemplate,
    UpdateCertificateTemplatePayload,
    ApiError
  >({
    mutationFn: (payload) =>
      certificateService.updateTemplate(academyId, payload),
    showSuccessToast: false,
    showErrorToast: false,
    onSuccess: async () => {
      await invalidate(certificateKeys.template(academyId));
    },
  });
}
