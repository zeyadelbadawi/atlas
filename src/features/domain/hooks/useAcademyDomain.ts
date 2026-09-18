/**
 * useAcademyDomain hook.
 *
 * P63d: accepts an optional `refetchInterval` so the Website access tab
 * can re-read the server's stored facts while a domain is genuinely in
 * progress (provider validating, certificate pending, origin recovering).
 * A re-read is a database read only — it never hits the provider; the
 * provider work happens in the verification sweep and on "Check now".
 */
import { useApiQuery } from '@/shared/hooks';
import { domainKeys } from '@services/query';
import { domainService } from '../services/DomainService';
import type { AcademyDomainConfiguration } from '@types';
import type { ApiError } from '@api';

export interface UseAcademyDomainOptions {
  /** Milliseconds between background re-reads given the latest data, or `false` for none. */
  readonly refetchInterval?: (
    data: AcademyDomainConfiguration | undefined
  ) => number | false;
}

export function useAcademyDomain(
  academyId: string,
  options: UseAcademyDomainOptions = {}
) {
  const { refetchInterval } = options;
  return useApiQuery<AcademyDomainConfiguration, ApiError>({
    queryKey: domainKeys.configuration(academyId),
    queryFn: () => domainService.getDomainConfiguration(academyId),
    enabled: !!academyId,
    refetchInterval: refetchInterval
      ? (query) => refetchInterval(query.state.data)
      : false,
  });
}
