---
doc_id: DOC-IAM-006
b0_record: B0-IAM-02
status: "Draft – not published; pending Arabic review (RV-14) where AR copy exists"
verified_against: "atlas-backend cef2920, atlas 6d2940d (main, 14 Oct 2026)"
title_en: "Set up an authenticator app"
url_en: /docs/account/authenticator-app
url_ar: /ar/docs/account/authenticator-app
audience: All
feature_ids: [IAM-4.3]
security_review: pending (SR; QR code and recovery codes blurred in every capture)
screenshots: pending (SS-092)
publication_blockers:
  - "Owner approval of the no-password workaround (B0-IAM-02 acceptance)"
---

# Set up an authenticator app

Under **Profile → Security → Two-Factor Authentication**, select **Enable**,
scan the QR code with an authenticator app, enter the 6-digit code it shows
and your password, then save the recovery codes Atlas shows you once. From
then on, signing in asks for a code from the app.

## Before you start

- An authenticator app on your phone.
- Your Atlas password. Atlas asks for it to turn the app on or off, because a
  signed-in session alone should not be able to change your account's
  security. If your account has no password yet, see "If your account
  doesn't have a password yet" below first.

## Turn it on

1. Open your profile and select **Security**. On an academy website, open
   **Security** in My Learning.
2. Under **Two-Factor Authentication**, select **Enable**. **Set up
   two-factor authentication** opens.
3. Scan the QR code with your app, or use **Can't scan? Enter this key
   instead**.
4. Enter the **6-digit code from your app** and your password, then select
   **Verify and enable**.
5. **Save your recovery codes.** Each code works once, and Atlas cannot show
   them again. Tick "I've saved these codes somewhere safe." and select
   **Done**.

## Signing in with the app

After your password, Atlas asks: "Enter the 6-digit code from your
authenticator app." If you don't have your phone, choose **Use a recovery
code instead**.

## Get new recovery codes

Select **New recovery codes**. Your old codes stop working immediately.

## Turn it off

Select **Turn off** and enter your password. Your other signed-in sessions
end, and you get an email telling you two-factor authentication was turned
off.

## If your account doesn't have a password yet

Some accounts have never had a password, for example one you only ever
signed in to with another sign-in method. Turning the app on needs your
password, so Atlas stops at **Verify and enable** with this message:

> Your account doesn't have a password yet, and two-factor authentication
> needs one. Sign out, choose "Forgot password?" on the sign-in page to set a
> password, then turn on two-factor authentication.

To fix it:

1. Sign out.
2. On the sign-in page, choose **Forgot password?** and enter your account's
   email address.
3. Open the email and set a password.
4. Sign in again, then turn on the app as described above, using your new
   password.

Setting a password does not remove the way you signed in before; you can
keep using it.

## Good to know

- An organization cannot require its team to use an authenticator app.
  Each person chooses for their own account.

## Related pages

- Sign-in codes by email and remembered browsers (DOC-IAM-005)
- Reset or change your password (DOC-IAM-003)
- See and end your active sessions (DOC-IAM-007)
- I can't sign in (DOC-TRB-002)

---

## Arabic (for native review, RV-14)

- Title direction: «فعّل تطبيق المصادقة»
- UI labels to quote on the AR page: «الأمان» (`profile:tabs.security`),
  «المصادقة الثنائية» (`profile:sections.security.twoFactor`), «تفعيل»
  (`profile:actions.enable`), «تحقّق وفعّل» (`profile:twoFactor.verifyAndEnable`),
  «احفظ رموز الاسترداد» (`profile:twoFactor.recoveryTitle`), «رموز استرداد
  جديدة» (`profile:twoFactor.regenerateCodes`), «إيقاف»
  (`profile:twoFactor.disable`), «استخدم رمز استرداد بدلًا من ذلك»
  (`auth:twoFactor.useRecoveryCode`), «نسيت كلمة المرور؟»
  (`auth:signIn.forgotPassword`).
- The no-password message is already shipped in AR
  (`errors:auth.setPasswordBeforeTwoFactor`): «لا توجد كلمة مرور لحسابك
  بعد، والمصادقة الثنائية تتطلب واحدة. سجّل الخروج، واختر «نسيت كلمة
  المرور؟» في صفحة تسجيل الدخول لتعيين كلمة مرور، ثم فعّل المصادقة
  الثنائية.» Quote it as is.

## Reviewer notes (not for publication)

Verified behaviour (file:line):

- Password is required to confirm enrolment, turn the app off and get new
  recovery codes: `atlas-backend/src/identity/services/two-factor.service.ts`
  L212–L221 (`confirmSetup`), L440–L445 (`disable`), L573–L577
  (`regenerateRecoveryCodes`). An account with no password is refused with
  `errors.auth.setPasswordBeforeTwoFactor`, L601–L611. Starting setup (the
  QR code) does not need the password, so the refusal appears at **Verify
  and enable**.
- Turning it off ends other sessions and notifies: same file L458–L468.
- Workaround pinned end to end: `atlas-backend/test/two-factor-operator-reset.e2e-spec.ts`
  L176–L276 (Google-only account refused at confirm → password reset email
  → first password set → Google identity kept → enrolment succeeds).
- The profile card shows the server's message instead of "That code didn't
  work" / "That password isn't correct": `atlas/src/features/profile/components/TwoFactorCard.tsx`
  L52; test `atlas/src/features/profile/components/two-factor-no-password.test.tsx`.
- Learners: the academy website has its own **Forgot password?** page
  (`atlas/src/features/public-website/components/PublicWebsiteForgotPasswordPage.tsx`).
- Where an account shows that it has no password: the **Sign-in methods**
  card, "Password: Not set — you sign in with Google"
  (`auth:google.settings.passwordNotSet`), shown only where Google sign-in
  is enabled or connected (`atlas/src/features/profile/components/SignInMethodsCard.tsx`
  L83–L84).

Notes for the owner:

1. **Workaround, not a password-less step-up.** B0-IAM-02's acceptance is
   met only when the owner approves this documented workaround; the
   alternative (an emailed code or a fresh Google sign-in as the step-up)
   is not built.
2. **Google wording.** The brief keeps Google out of public pages while
   CF-12 (Google sign-in) is open, so the public text says "another sign-in
   method". When Google sign-in is documented (DOC-IAM-011), this section
   can name Google, matching the UI's own "you sign in with Google".
3. Disabling the app on an account with no password is refused the same
   way. That should not arise in practice: enrolment already needs a
   password, and the product removes a password only from an invited or a
   never-verified account (`atlas-backend/src/identity/google/google-auth.service.ts`
   L904–L921, `src/identity/services/unproven-account.service.ts` L62–L72).
   Not covered by a test.
4. This page does not cover Platform Owner accounts (operator runbooks only).
