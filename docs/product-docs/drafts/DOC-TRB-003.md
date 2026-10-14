---
doc_id: DOC-TRB-003
b0_record: B0-MED-10
status: "Draft – not published; pending Arabic review (RV-14) where AR copy exists"
verified_against: "atlas-backend cef2920, atlas 6d2940d (main, 14 Oct 2026)"
title_en: "You have reached your device limit"
url_en: /docs/troubleshooting/device-limit
url_ar: /ar/docs/troubleshooting/device-limit
audience: Learner, Owner
feature_ids: [MED-6.2, MED-6.3, MED-6.4]
security_review: n/a
screenshots: pending (SS-107, desktop and mobile)
---

# You have reached your device limit

Your academy lets you learn on a limited number of browsers. When a new
browser goes over that number, lessons will not open on it. You can still
sign in there: open **Devices** in My Learning, remove a browser you no longer
use, and reopen the lesson. It takes under a minute, and nothing you have
done is lost.

## Remove a device

1. In the message, choose **Manage your devices**, or open **Devices** in My
   Learning.
2. Under **Registered devices**, find one you no longer use. Each entry shows
   the browser and when it was last used. The page also shows how many of
   your device slots are in use ("2 of 2 devices", for example).
3. Select **Remove** and confirm **Remove this device?**.
4. Go back to the lesson and open it again. This browser takes the free
   slot.

If you remove the device you are using right now, your current learning
session ends, and this browser registers again the next time you open a
lesson.

## Why a "new device" appeared

Atlas recognises a browser by a small cookie it stores there when you sign
in to your academy. It does not identify your phone or computer in any
other way. So each of these counts as a new device and takes a slot:

- **Another browser**, even on the same phone or computer (for example
  Chrome and then Samsung Internet).
- **Clearing your browser's cookies or site data.** The browser loses the
  cookie, so the next time you sign in it is registered as a new device. The
  old entry stays in your list until you remove it.
- **A private or incognito window.** It starts without the cookie, and the
  cookie is thrown away when you close the window, so every private session
  can use a new slot.

Signing out and back in on the same browser, or opening several tabs, does
**not** use another slot.

Old devices are not removed automatically. If you have changed phones or
cleared your browser, remove the old entries yourself.

Devices are counted per academy: a browser registered at one academy does
not use a slot at another.

## "You are already learning on another device"

Lessons play on one device at a time. If you open a lesson while another
device is in a learning session, Atlas asks whether to move it:

- **Continue here** ends the session on the other device and continues on
  this one. The other device pauses and shows "Paused — you started learning
  on another device". Nothing is lost.
- **Keep learning there** leaves the other device playing.

This is separate from the device limit: it does not add or remove devices.

## For academy owners

- You set the number of devices per learner in **Academy Settings → Content
  protection → Learner devices**. You can choose up to the maximum the
  platform allows, which is shown on that page.
- If you lower the limit, it also applies to devices learners have already
  registered: a learner over the new limit is refused on their most recently
  added devices until they remove one.
- **You cannot remove or reset a learner's devices.** Only the learner can,
  from their **Devices** page. Send them this page.

## Still stuck?

If **Remove** fails, check your connection and try again ("The device could
not be removed."). For anything else, contact your academy.

## Related pages

- Device limits and one screen at a time (DOC-MED-003)
- Content protection settings (DOC-MED-004)
- Manage your devices (DOC-MED-010)

---

## Arabic (for native review, RV-14)

- Title: «وصلت إلى الحد الأقصى لأجهزتك» (`learning:player.deviceLimit.title`)
- UI labels to quote on the AR page: «إدارة أجهزتك»
  (`learning:player.failure.deviceLimit.action`), «الأجهزة»
  (`learning:learnerDashboard.nav.devices`), «الأجهزة المسجّلة»
  (`learning:learnerDashboard.devices.registeredTitle`), «إزالة»
  (`learning:learnerDashboard.devices.remove`), «إزالة هذا الجهاز؟»
  (`learning:learnerDashboard.devices.confirmRemove.title`), «تابع من هنا» /
  «أكمل هناك» (`learning:player.takeover.confirm` / `.cancel`).
- AR meta (from the brief): title «وصلت إلى الحد الأقصى لأجهزتك: الحل»;
  description «تظهر لك رسالة «وصلت إلى الحد الأقصى لأجهزتك»؟ أزل جهازًا لم
  تعد تستخدمه من صفحة الأجهزة في تعلّمي وتابع التعلّم فورًا.»
- Draft paragraph for "Why a new device appeared" (needs native review):
  «يتعرّف أطلس على المتصفّح من خلال ملف تعريف ارتباط صغير يحفظه فيه عند
  تسجيل الدخول إلى أكاديميتك. لذلك يُحسب جهازًا جديدًا ويشغل مقعدًا: متصفّح
  آخر، أو مسح ملفات تعريف الارتباط وبيانات المواقع، أو نافذة التصفّح
  الخاص.»

## Reviewer notes (not for publication)

Verified behaviour (file:line):

- A device is a server-issued cookie, stored hashed; no fingerprinting:
  `atlas-backend/src/tenancy/services/student-device.service.ts` L1–L31;
  cookie `atlas_device`, about one year, L37–L40.
- At the cap, sign-in still works and only content is refused: same file
  L19–L25; at-cap check L194.
- Tests, `atlas-backend/test/device-identity-lifecycle.e2e-spec.ts`:
  DV-01 L222 (sign-out and sign-in on the same browser = same device),
  DV-02 L247 (tabs = one device), DV-03 L261 (another browser = another
  device), DV-04 L282 (cleared storage = a new device, counted toward the
  cap), DV-05 L296 (at the limit: sign-in works, content refused),
  DV-06 L315 (terminate from the dialog frees the slot; the waiting
  browser becomes one new device), DV-10 L448 (another academy does not
  count). Record B0-MED-10's requested e2e ("a grant without the device
  cookie registers a new device and counts toward the cap") is DV-04.
- Private windows: not tested separately; it follows from DV-04 (a browser
  with no cookie registers a new device) and how browsers handle cookies in
  private windows.
- No automatic removal of old devices: the service only marks devices
  removed on the learner's request (L349–L380); no prune job exists.
- Limit source and ceiling: `atlas-backend/src/tenancy/services/access-policy.service.ts`
  L1–L80 (academy, then plan, then platform; never above the platform row;
  fallback 2 devices / 1 session). The draft does not print a number
  (brief rule: no hard-coded maximum).
- No staff route removes a learner's device; the learner's own route is
  `atlas-backend/src/learning/controllers/learner-session.controller.ts`
  L46 (`DELETE devices/:deviceId`).
- Copy (`atlas`): `learning:player.deviceLimit.*`,
  `learning:player.failure.deviceLimit.*`, `learning:learnerDashboard.devices.*`,
  `learning:player.takeover.*`, `learning:player.leaseLost.title`,
  `academy:protection.devices.confirm.description`.

Open: device test on a phone (AT-1, RC-PV mobile) and screenshots.
