/**
 * W2 — everything a provisioning progress surface needs, in one place, so
 * the status page and the onboarding Academy step behave identically:
 * the polled request (`useProvisioningRequest`), the logo attach
 * (`usePendingLogoUpload`), and Retry (`useRetryProvisioning` — the server
 * decides whether that resumes the run or re-applies a failed brand).
 */
import { useAuth } from '@hooks';
import { useProvisioningRequest } from './useProvisioningRequest';
import { usePendingLogoUpload } from './usePendingLogoUpload';
import { useRetryProvisioning } from './useRetryProvisioning';

export function useProvisioningProgress(requestId: string) {
  const { organization } = useAuth();
  const query = useProvisioningRequest(requestId);
  const retryMutation = useRetryProvisioning();
  const logo = usePendingLogoUpload(query.data);

  const retry = (options?: { readonly onSuccess?: () => void }) => {
    if (!organization?.id || !query.data) return;
    retryMutation.mutate(
      { organizationId: organization.id, requestId: query.data.id },
      { onSuccess: () => options?.onSuccess?.() }
    );
  };

  return {
    query,
    request: query.data,
    logo,
    retry,
    isRetrying: retryMutation.isPending,
    retryError: retryMutation.error,
    // A refetch failed but the last real state is still on screen: show
    // "Reconnecting…" (TanStack keeps retrying), never a failure.
    isReconnecting: query.isRefetchError && !!query.data,
  };
}
