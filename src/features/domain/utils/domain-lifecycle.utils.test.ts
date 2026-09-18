import { describe, expect, it } from 'vitest';
import {
  CUSTOM_DOMAIN_STEPS,
  canChangeDomainFreely,
  deriveCustomDomainStep,
  isFailedStep,
  isInProgressStep,
  isLiveWithCertificatePending,
  shouldShowDnsInstructions,
  stepIndex,
  stepWhileEditing,
} from './domain-lifecycle.utils';
import type { DomainConnection } from '@types';

const conn = (
  status: DomainConnection['status'],
  extra: Partial<DomainConnection> = {}
): DomainConnection =>
  ({
    hostname: 'a.example',
    status,
    providerRegistered: true,
    sslStatus: 'not_configured',
    live: false,
    ...extra,
  }) as DomainConnection;
const dnsReady = {
  records: [{ type: 'TXT', name: 'n', value: 'v' }],
  cnameTarget: 'c.example',
  ready: true,
};
const dnsBlocked = (
  blockedReason: 'provider_not_registered' | 'routing_target_missing'
) => ({
  records: [],
  ready: false,
  blockedReason,
});

describe('domain-lifecycle.utils (P63/P63c/P63d)', () => {
  it('no custom domain means the first step', () => {
    expect(deriveCustomDomainStep(undefined)).toBe('connect');
    expect(
      deriveCustomDomainStep({
        status: 'not_configured',
        providerRegistered: false,
      } as never)
    ).toBe('connect');
  });

  it('maps every pre-connected backend status to exactly one customer step when DNS setup is possible', () => {
    expect(
      deriveCustomDomainStep(conn('verification_required'), dnsReady)
    ).toBe('configure_dns');
    expect(deriveCustomDomainStep(conn('pending'), dnsReady)).toBe('verifying');
    expect(deriveCustomDomainStep(conn('verifying'), dnsReady)).toBe(
      'verifying'
    );
    expect(deriveCustomDomainStep(conn('failed'), dnsReady)).toBe('attention');
    expect(deriveCustomDomainStep(conn('disconnected'), dnsReady)).toBe(
      'attention'
    );
  });

  it('P63d — "connected" is not "live": live only when the server says so; otherwise securing, or https_failed when HTTPS demonstrably fails', () => {
    // The rawc.ae case: hostname active, certificate pending, edge returns 525.
    expect(
      deriveCustomDomainStep(
        conn('connected', {
          sslStatus: 'pending',
          httpsReachable: false,
          httpsStatusCode: 525,
          httpsFailureReason: 'origin_error',
          live: false,
        }),
        dnsReady
      )
    ).toBe('https_failed');
    // Certificate pending, edge not yet probed or answering: still securing, never live.
    expect(
      deriveCustomDomainStep(
        conn('connected', { sslStatus: 'pending', live: false }),
        dnsReady
      )
    ).toBe('securing');
    expect(
      deriveCustomDomainStep(
        conn('connected', {
          sslStatus: 'provisioning',
          httpsReachable: true,
          live: false,
        }),
        dnsReady
      )
    ).toBe('securing');
    // Certificate failed/expired is a failure at the HTTPS step.
    expect(
      deriveCustomDomainStep(
        conn('connected', { sslStatus: 'failed', live: false }),
        dnsReady
      )
    ).toBe('https_failed');
    expect(
      deriveCustomDomainStep(
        conn('connected', { sslStatus: 'expired', live: false }),
        dnsReady
      )
    ).toBe('https_failed');
    // All three facts: live.
    expect(
      deriveCustomDomainStep(
        conn('connected', {
          sslStatus: 'active',
          httpsReachable: true,
          live: true,
        }),
        dnsReady
      )
    ).toBe('live');
    // The rawc.ae case: live through the customer's own proxy while the
    // Atlas-managed certificate is still pending — live, with an advisory.
    const liveCertPending = conn('connected', {
      sslStatus: 'pending',
      httpsReachable: true,
      live: true,
    });
    expect(deriveCustomDomainStep(liveCertPending, dnsReady)).toBe('live');
    expect(isLiveWithCertificatePending(liveCertPending)).toBe(true);
    expect(
      isLiveWithCertificatePending(
        conn('connected', {
          sslStatus: 'active',
          httpsReachable: true,
          live: true,
        })
      )
    ).toBe(false);
    expect(isLiveWithCertificatePending(undefined)).toBe(false);
    // The server's `live` is authoritative — the frontend never promotes on its own.
    expect(
      deriveCustomDomainStep(
        conn('connected', {
          sslStatus: 'active',
          httpsReachable: true,
          live: false,
        }),
        dnsReady
      )
    ).toBe('securing');
  });

  it('is "blocked", never "configure DNS", when the provider has not registered the hostname or there is no routing target', () => {
    expect(
      deriveCustomDomainStep(
        conn('verification_required', { providerRegistered: false }),
        dnsBlocked('provider_not_registered')
      )
    ).toBe('blocked');
    expect(
      deriveCustomDomainStep(
        conn('verifying'),
        dnsBlocked('routing_target_missing')
      )
    ).toBe('blocked');
    // A live or failed domain is reported as such regardless of DNS readiness.
    expect(
      deriveCustomDomainStep(
        conn('connected', {
          sslStatus: 'active',
          httpsReachable: true,
          live: true,
        }),
        dnsBlocked('routing_target_missing')
      )
    ).toBe('live');
    expect(
      deriveCustomDomainStep(
        conn('failed'),
        dnsBlocked('provider_not_registered')
      )
    ).toBe('attention');
  });

  it("P63d — while a replacement hostname is being entered, the indicator shows Connect: the old domain's progress is never shown for the new one", () => {
    expect(stepWhileEditing('live', 'change')).toBe('connect');
    expect(stepWhileEditing('verifying', 'change')).toBe('connect');
    expect(stepWhileEditing('https_failed', 'change')).toBe('connect');
    expect(stepWhileEditing('live', 'closed')).toBe('live');
    expect(stepWhileEditing('connect', 'add')).toBe('connect');
  });

  it('orders the five positions and places attention/blocked/securing/https_failed where they happen', () => {
    expect(CUSTOM_DOMAIN_STEPS).toEqual([
      'connect',
      'configure_dns',
      'verifying',
      'https',
      'live',
    ]);
    expect(stepIndex('connect')).toBe(0);
    expect(stepIndex('blocked')).toBe(1);
    expect(stepIndex('configure_dns')).toBe(1);
    expect(stepIndex('verifying')).toBe(2);
    expect(stepIndex('attention')).toBe(2);
    expect(stepIndex('securing')).toBe(3);
    expect(stepIndex('https_failed')).toBe(3);
    expect(stepIndex('live')).toBe(4);
    expect(isFailedStep('https_failed')).toBe(true);
    expect(isFailedStep('attention')).toBe(true);
    expect(isFailedStep('blocked')).toBe(true);
    expect(isFailedStep('securing')).toBe(false);
    expect(isFailedStep('live')).toBe(false);
  });

  it('keeps DNS instructions visible until the domain is live, and never in the blocked state', () => {
    expect(shouldShowDnsInstructions('configure_dns')).toBe(true);
    expect(shouldShowDnsInstructions('verifying')).toBe(true);
    expect(shouldShowDnsInstructions('attention')).toBe(true);
    expect(shouldShowDnsInstructions('securing')).toBe(true);
    expect(shouldShowDnsInstructions('https_failed')).toBe(true);
    expect(shouldShowDnsInstructions('blocked')).toBe(false);
    expect(shouldShowDnsInstructions('live')).toBe(false);
    expect(shouldShowDnsInstructions('connect')).toBe(false);
    // Live but the Atlas-managed certificate is pending: the validation records are still needed.
    expect(
      shouldShowDnsInstructions(
        'live',
        conn('connected', {
          sslStatus: 'pending',
          httpsReachable: true,
          live: true,
        })
      )
    ).toBe(true);
    expect(
      shouldShowDnsInstructions(
        'live',
        conn('connected', {
          sslStatus: 'active',
          httpsReachable: true,
          live: true,
        })
      )
    ).toBe(false);
  });

  it('the hostname can be changed freely before live, and only with confirmation once live', () => {
    for (const step of [
      'blocked',
      'configure_dns',
      'verifying',
      'securing',
      'https_failed',
      'attention',
    ] as const) {
      expect(canChangeDomainFreely(step)).toBe(true);
    }
    expect(canChangeDomainFreely('live')).toBe(false);
    expect(canChangeDomainFreely('connect')).toBe(false);
  });

  it('knows which steps the server can still move forward without a click (worth polling)', () => {
    for (const step of [
      'configure_dns',
      'verifying',
      'securing',
      'blocked',
      'https_failed',
      'attention',
    ] as const) {
      expect(isInProgressStep(step)).toBe(true);
    }
    expect(isInProgressStep('live')).toBe(false);
    expect(isInProgressStep('connect')).toBe(false);
  });
});
