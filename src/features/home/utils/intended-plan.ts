/**
 * The visitor's intended plan key. Read — and cleared — by the one-page
 * sign-up (`RegistrationForm`), which pre-selects that plan's trial when
 * it is eligible; `?plan=` on the sign-up URL carries the same intent and
 * wins when both are present.
 *
 * The retired marketing site's plan cards wrote it (`useStartPlanFlow`,
 * removed with them under owner decision D6). Nothing writes it now; the
 * key stays so a value already in a visitor's session is still consumed
 * and cleared, never left behind.
 */
export const INTENDED_PLAN_STORAGE_KEY = 'atlas:intendedPlanKey';
