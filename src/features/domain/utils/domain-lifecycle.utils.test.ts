import { describe, expect, it } from 'vitest';
import {
  CUSTOM_DOMAIN_STEPS,
  deriveCustomDomainStep,
  shouldShowDnsInstructions,
  stepIndex,
} from './domain-lifecycle.utils';

describe('domain-lifecycle.utils (P63)', () => {
  it('no custom domain means the first step', () => {
    expect(deriveCustomDomainStep(undefined)).toBe('connect');
    expect(deriveCustomDomainStep({ status: 'not_configured' })).toBe('connect');
  });

  it('maps every backend status to exactly one customer step', () => {
    expect(deriveCustomDomainStep({ hostname: 'a.example', status: 'verification_required' })).toBe('configure_dns');
    expect(deriveCustomDomainStep({ hostname: 'a.example', status: 'pending' })).toBe('verifying');
    expect(deriveCustomDomainStep({ hostname: 'a.example', status: 'verifying' })).toBe('verifying');
    expect(deriveCustomDomainStep({ hostname: 'a.example', status: 'connected' })).toBe('live');
    expect(deriveCustomDomainStep({ hostname: 'a.example', status: 'failed' })).toBe('attention');
    expect(deriveCustomDomainStep({ hostname: 'a.example', status: 'disconnected' })).toBe('attention');
  });

  it('orders steps and positions attention where the failure happened', () => {
    expect(CUSTOM_DOMAIN_STEPS).toEqual(['connect', 'configure_dns', 'verifying', 'live']);
    expect(stepIndex('live')).toBe(3);
    expect(stepIndex('attention')).toBe(2);
  });

  it('keeps DNS instructions visible until the domain is live', () => {
    expect(shouldShowDnsInstructions('configure_dns')).toBe(true);
    expect(shouldShowDnsInstructions('verifying')).toBe(true);
    expect(shouldShowDnsInstructions('attention')).toBe(true);
    expect(shouldShowDnsInstructions('live')).toBe(false);
    expect(shouldShowDnsInstructions('connect')).toBe(false);
  });
});
