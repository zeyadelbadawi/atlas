/**
 * B1 (UX audit, V1) — a required field's label ends in a red asterisk, the
 * way `FormField` draws it. The auth forms keep their own inputs (their ids
 * are what e2e journeys and password managers rely on), so the mark is a
 * CSS `::after` whose alternative text is empty (`content: '*' / ''`): seen,
 * not read out as "star". The input itself carries `aria-required`, which
 * is what assistive technology announces.
 */
export const REQUIRED_LABEL_CLASS =
  "after:ms-0.5 after:text-destructive after:content-['*'_/_'']";

/**
 * The same mark on `PhoneField`'s label (the shared component takes a plain
 * string label), put on its wrapper. A literal, so Tailwind generates it.
 */
export const REQUIRED_PHONE_LABEL_CLASS =
  "[&_label[for=phoneNumber]]:after:ms-0.5 [&_label[for=phoneNumber]]:after:text-destructive [&_label[for=phoneNumber]]:after:content-['*'_/_'']";
