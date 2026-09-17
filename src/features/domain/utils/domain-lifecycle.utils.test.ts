import { describe, expect, it } from 'vitest';
import {
  CUSTOM_DOMAIN_STEPS,
  canChangeDomainFreely,
  deriveCustomDomainStep,
  shouldShowDnsInstructions,
  stepIndex,
} from './domain-lifecycle.utils';

const conn = (
  status: Parameters<typeof deriveCustomDomainStep>[0] extends infer T
    ? T extends { status: infer S }
      ? S
      : never
    : never,
  registered = true
) =>
  ({ hostname: 'a.example', status, providerRegistered: registered }) as never;
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

describe('domain-lifecycle.utils (P63/P63c)', () => {
  it('no custom domain means the first step', () => {
    expect(deriveCustomDomainStep(undefined)).toBe('connect');
    expect(
      deriveCustomDomainStep({
        status: 'not_configured',
        providerRegistered: false,
      } as never)
    ).toBe('connect');
  });

  it('maps every backend status to exactly one customer step when DNS setup is possible', () => {
    expect(
      deriveCustomDomainStep(conn('verification_required'), dnsReady)
    ).toBe('configure_dns');
    expect(deriveCustomDomainStep(conn('pending'), dnsReady)).toBe('verifying');
    expect(deriveCustomDomainStep(conn('verifying'), dnsReady)).toBe(
      'verifying'
    );
    expect(deriveCustomDomainStep(conn('connected'), dnsReady)).toBe('live');
    expect(deriveCustomDomainStep(conn('failed'), dnsReady)).toBe('attention');
    expect(deriveCustomDomainStep(conn('disconnected'), dnsReady)).toBe(
      'attention'
    );
  });

  it('is "blocked", never "configure DNS", when the provider has not registered the hostname or there is no routing target', () => {
    expect(
      deriveCustomDomainStep(
        conn('verification_required', false),
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
        conn('connected'),
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

  it('orders steps and positions attention/blocked where they happen', () => {
    expect(CUSTOM_DOMAIN_STEPS).toEqual([
      'connect',
      'configure_dns',
      'verifying',
      'live',
    ]);
    expect(stepIndex('live')).toBe(3);
    expect(stepIndex('attention')).toBe(2);
    expect(stepIndex('blocked')).toBe(1);
  });

  it('keeps DNS instructions visible until the domain is live, and never in the blocked state', () => {
    expect(shouldShowDnsInstructions('configure_dns')).toBe(true);
    expect(shouldShowDnsInstructions('verifying')).toBe(true);
    expect(shouldShowDnsInstructions('attention')).toBe(true);
    expect(shouldShowDnsInstructions('blocked')).toBe(false);
    expect(shouldShowDnsInstructions('live')).toBe(false);
    expect(shouldShowDnsInstructions('connect')).toBe(false);
  });

  it('the hostname can be changed freely before live, and only with confirmation once live', () => {
    for (const step of [
      'blocked',
      'configure_dns',
      'verifying',
      'attention',
    ] as const) {
      expect(canChangeDomainFreely(step)).toBe(true);
    }
    expect(canChangeDomainFreely('live')).toBe(false);
    expect(canChangeDomainFreely('connect')).toBe(false);
  });
});
