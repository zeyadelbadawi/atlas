/**
 * Payment Provider Registry.
 *
 * Maps a `provider` key (`PaymentMethod.provider` / `Payment.provider`) to
 * its concrete `PaymentProviderAdapter`. Today this registers exactly one
 * adapter — `ManualTransferProvider`, keyed `'atlas_manual'`. Connecting a
 * real gateway later is registering a second entry here
 * (`registry.set('stripe', stripeAdapter)`), configured server-side per
 * `Reports/ARCHITECTURE.md`'s "Provider Configuration" section — it is NOT
 * a change to the Checkout/Payment UI, which only ever asks this registry
 * "give me the adapter for this payment method's provider key" and reads
 * `capabilities` from whatever comes back.
 *
 * DO NOT register a fake/placeholder gateway adapter here. An unregistered
 * provider key means "not available yet" — the UI must handle that
 * explicitly (every call site checks the return value), never assume every
 * catalog `CheckoutPaymentMethod` resolves to a working adapter.
 */
import type { PaymentProviderAdapter } from './PaymentProviderAdapter';
import { manualTransferProvider } from './ManualTransferProvider';

const registry = new Map<string, PaymentProviderAdapter>([
  [manualTransferProvider.providerKey, manualTransferProvider],
]);

/** Resolves the adapter for a provider key, or `undefined` if none is registered yet. */
export function getPaymentProvider(providerKey: string): PaymentProviderAdapter | undefined {
  return registry.get(providerKey);
}
