# B0 — Foundation (6 Nov 2026)

## Findings

| # | Finding | Severity | Rule |
|---|---|---|---|
| F1 | A failed action raised **two toasts**: `useApiMutation`'s generic "That action could not be completed. Please try again." and the app-wide reporter's real reason (e.g. "This item was changed elsewhere — reload"). The two contradicted each other. | High | V5 |
| F2 | When only the hook's toast showed (validation failures — the reporter skips them), it never said what was wrong: a rejected form whose violation had no matching field showed only "try again". | High | V2, V5 |
| F3 | After an action, a 404 or 403 reused page copy ("The page you are looking for does not exist or has been moved") after pressing Save. | Medium | V5 |
| F4 | No error summary existed for long forms: after a failed submit, focus jumped to the first field and other problems further down were easy to miss; a server violation on a field the form does not render was invisible. | High | V3 |
| F5 | 33 of the 97 dashboard forms validate by hand rather than with the shared React Hook Form + zod stack, and 52 do not map server violations onto their fields. Each is handled in its batch. | Info | V2, V5 |

Seen while verifying, handed to their batches:

| # | Finding | Batch |
|---|---|---|
| F6 | Toasts open at the top corner over the dashboard header (language switcher, notifications, account menu) for their whole duration. | B1 (dashboard chrome) |
| F7 | On the notifications page a failed "Mark all as read" replaces the whole list with an error card, as if the notifications were lost. | B7 |

## Fixes

- **F1–F3** `useApiMutation` now shows ONE toast built by `mutationErrorToast`, and marks
  the mutation `inlineErrors` so the app-wide reporter stays quiet:
  - the backend's specific reason when it is translated (never a raw key);
  - a validation failure names the first invalid field and what is wrong with it;
  - action copy for 404/403 (`errors:mutation.notFound`, `errors:mutation.forbidden`);
  - the offline copy when the device has no connection;
  - nothing for a cancelled request.
  Callers that opt out (`showErrorToast: false`) keep the reporter's toast or their own
  inline rendering, as before.
- **F4** `FormErrorSummary` (`@shared/forms`): after a failed submit with two or more
  problems, or any problem that cannot sit beside a field, it lists every problem with
  its field label, takes focus, and each item moves focus to its field. English and
  Arabic plural forms. Adopted form by form in B1–B8.
- **F5** [inventory.md](inventory.md): every dashboard form by batch, how it validates and
  whether it maps server violations.

## Tests

- `mutation-error-toast.test.ts` — the toast rules (8 cases).
- `api-mutation-single-toast.test.tsx` — exactly one toast, reporter quiet; fails on the
  previous hook.
- `form-error-summary.test.tsx` — hidden until a failed submit, focus, links, form-level
  errors, Arabic, nested paths.
