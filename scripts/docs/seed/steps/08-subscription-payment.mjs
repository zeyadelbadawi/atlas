// The organization's own Atlas subscription payment, so Billing → Payment
// history and Billing → Needs attention have a row: the owner checks out
// the plan the organization is trialling (monthly), pays with Atlas's
// InstaPay method and uploads the transfer screenshot. The payment is left
// AWAITING REVIEW on purpose: approving it (a Platform Owner action) would
// end the trial and start the paid plan, claim the gifted setup days and
// change every trial shot (billing/subscription-status, trial-banner,
// checkout-gift, cancel-*). The capture never opens the payment's proof.
//
// Self-contained after 07-backdate (run it alone on an already seeded
// database: `pnpm docs:seed -- --only 08`).
import { state, save, call, signIn, dataUrl, psql, sqlText, log, list } from '../lib.mjs';
import { OWNER, PASSWORD, PLATFORM_INSTAPAY } from '../data.mjs';

const PROOF = 'receipt-instapay.png';
const NON_TERMINAL = ['created', 'pending', 'processing', 'requires_action', 'requires_confirmation'];
// Fixed by the server for every manual method (MANUAL_TRANSFER_CAPABILITIES).
const MANUAL_CAPABILITIES = {
  supportsManualReview: true,
  supportsProof: true,
  supportsRedirect: false,
  supportsEmbeddedCheckout: false,
  supportsAdditionalAuthentication: false,
  supportsWebhooks: false,
  supportsRefunds: false,
  supportsRecurring: false,
  supportsCancellation: true,
};

/**
 * Atlas's payment-method catalog belongs to the Platform Owner
 * (`PATCH /platform-payment-methods/:id`, PlatformOwnerGuard), and the demo's
 * only platform owner is the system account 00-platform inserts, which is
 * never signed in to. Direct SQL, local demo database only: the same change
 * that PATCH makes (new InstaPay details, so no `placeholder` flag, and
 * `enabled: true`), minus its audit-log row. The backend migration
 * 20261102000400 inserts the `instapay` row as a disabled placeholder; it is
 * inserted here only if a future migration stops doing that.
 */
function enablePlatformInstapay() {
  const instructions = sqlText(JSON.stringify(PLATFORM_INSTAPAY.instructions));
  psql(`insert into payment_methods (id, key, type, display_name, description, enabled, provider, capabilities, manual_instructions, display_order, created_at, updated_at)
        values (gen_random_uuid()::text, ${sqlText(PLATFORM_INSTAPAY.key)}, 'manual_instapay', 'InstaPay', null, true, 'atlas_manual',
                ${sqlText(JSON.stringify(MANUAL_CAPABILITIES))}::jsonb, ${instructions}::jsonb, 30, now(), now())
        on conflict (key) do update set manual_instructions = excluded.manual_instructions, enabled = true, updated_at = now()
        where payment_methods.type = 'manual_instapay'`);
}

export default async function run() {
  const org = state.organizationId;
  enablePlatformInstapay();
  const sp = (state.subscriptionPayment ??= {});
  let owner = await signIn(OWNER.email, PASSWORD);

  // The catalog the checkout page reads (enabled methods only).
  const methods = list((await call('GET', '/payment-methods?pageSize=100', { token: owner.token })).json);
  const method = methods.find((m) => m.key === PLATFORM_INSTAPAY.key);
  if (!method) throw new Error(`Atlas InstaPay method not offered after enabling it: ${JSON.stringify(methods).slice(0, 300)}`);

  if (!sp.paymentId) {
    // A lost state.json must not create a second open payment.
    const existing = list((await call('GET', `/organizations/${org}/payments?pageSize=50`, { token: owner.token })).json).find(
      (p) => p.methodKey === method.key && NON_TERMINAL.includes(p.status)
    );
    if (existing) {
      Object.assign(sp, { checkoutId: existing.checkoutId, paymentId: existing.id });
    } else {
      // A checkout is payable for 30 minutes, so each new attempt gets its own key.
      const checkout = (
        await call('POST', `/organizations/${org}/checkouts`, {
          token: owner.token,
          body: {
            target: { type: 'plan_subscription', planKey: state.planKey ?? 'enterprise' },
            billingCycle: 'monthly',
            idempotencyKey: `docs-subscription-${Date.now()}`,
          },
        })
      ).json;
      const payment = (
        await call('POST', `/organizations/${org}/payments`, {
          token: owner.token,
          body: { checkoutId: checkout.id, methodKey: method.key },
        })
      ).json;
      Object.assign(sp, { checkoutId: checkout.id, paymentId: payment.id });
    }
    save();
  }

  if (!sp.proofSubmitted) {
    owner = await signIn(OWNER.email, PASSWORD);
    const current = (await call('GET', `/organizations/${org}/payments/${sp.paymentId}`, { token: owner.token })).json;
    if (current.reviewStatus !== 'pending') {
      await call('PATCH', `/organizations/${org}/payments/${sp.paymentId}/proof`, {
        token: owner.token,
        body: { fileName: PROOF, mimeType: 'image/png', fileData: dataUrl(PROOF, 'image/png') },
      });
    }
    sp.proofSubmitted = true;
    save();
  }

  if (!sp.timed) {
    // Timestamps only (as in 07-backdate): the payment sits just before the
    // owner's five newest notifications, and its "proof received"
    // confirmation is read, so the bell and the top of the notification
    // list stay what 07-backdate left (five unread, newest first).
    const P = sqlText(sp.paymentId);
    // Stored timestamps are UTC without a zone (Prisma).
    const anchor = `(select coalesce(min(created_at) - interval '1 minute', (now() at time zone 'utc') - interval '1 hour')
                     from notifications where user_id = ${sqlText(state.ownerId)} and not is_read
                     and coalesce(dedupe_key, '') not like 'lifecycle_subscription_payment_submitted:%')`;
    psql(`do $$ declare t timestamp := ${anchor}; begin
      update checkouts set created_at = t - interval '20 minutes', updated_at = t - interval '18 minutes', expires_at = t + interval '10 minutes' where id = ${sqlText(sp.checkoutId)};
      update payments set created_at = t - interval '18 minutes', updated_at = t where id = ${P};
      update payment_attempts set created_at = t - interval '18 minutes', updated_at = t - interval '18 minutes' where payment_id = ${P};
      update payment_proofs set uploaded_at = t where payment_id = ${P};
      update notifications set created_at = t, updated_at = t, is_read = true
        where user_id = ${sqlText(state.ownerId)} and dedupe_key like ${sqlText(`lifecycle_subscription_payment_submitted:${sp.paymentId}:%`)};
    end $$;`);
    sp.timed = true;
    save();
  }

  state.subscriptionPaymentId = sp.paymentId;
  state.subscriptionCheckoutId = sp.checkoutId;
  save();
  log('subscription payment (InstaPay, awaiting review)', sp.paymentId);
}
