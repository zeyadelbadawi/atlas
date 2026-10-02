/**
 * The payment-method lists read every page (2 Oct 2026). Both read only
 * the first 100 methods; on a bigger catalog a method on a later page was
 * never offered at checkout and invisible in the Platform Owner console.
 */
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiClient } from '@/services/api/api-client';
import { paymentService } from './PaymentService';
import { platformPaymentMethodService } from './PlatformPaymentMethodService';

function servePages(total: number) {
  const pages = Math.ceil(total / 100);
  const calls: number[] = [];
  vi.spyOn(apiClient, 'get').mockImplementation(((
    _path: string,
    options?: { params?: Record<string, unknown> }
  ) => {
    const page = Number(options?.params?.page ?? 1);
    calls.push(page);
    const start = (page - 1) * 100;
    const items = Array.from(
      { length: Math.min(100, total - start) },
      (_, i) => ({
        id: `m${start + i}`,
        key: `m${start + i}`,
      })
    );
    return Promise.resolve({
      items,
      pagination: { page, pageSize: 100, totalItems: total, totalPages: pages },
    });
  }) as typeof apiClient.get);
  return calls;
}

afterEach(() => vi.restoreAllMocks());

describe('payment-method lists', () => {
  it('checkout offers methods from every page', async () => {
    const calls = servePages(250);
    const methods = await paymentService.getPaymentMethods();
    expect(methods).toHaveLength(250);
    expect(methods.at(-1)?.key).toBe('m249');
    expect(calls).toEqual([1, 2, 3]);
  });

  it('the Platform Owner console lists every method', async () => {
    const calls = servePages(230);
    const result = await platformPaymentMethodService.getAllPaymentMethods();
    expect(result.items).toHaveLength(230);
    expect(result.pagination.totalItems).toBe(230);
    expect(calls).toEqual([1, 2, 3]);
  });

  it('a one-page catalog is one request', async () => {
    const calls = servePages(4);
    expect(await paymentService.getPaymentMethods()).toHaveLength(4);
    expect(calls).toEqual([1]);
  });
});
