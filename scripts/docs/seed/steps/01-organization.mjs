// Organization owner (public sign-up API, Enterprise trial so a second
// academy is allowed), the demo academy and a second academy through the
// product's own provisioning flow, branding and academy details.
import { state, save, call, attempt, signIn, dataUrl, fileSize, sleep, clearLimits, verifyMailbox, log, list } from '../lib.mjs';
import { OWNER, PASSWORD, ORG_NAME, ACADEMY, SECOND_ACADEMY } from '../data.mjs';

const BRAND = { palette: { seeds: { primary: '224 68% 33%', secondary: '224 64% 18%', accent: '39 90% 60%' }, status: 'confirmed', source: 'manual' } };

async function provision(owner, academy, idempotencyKey) {
  const created = await call('POST', `/organizations/${state.organizationId}/provisioning-requests`, {
    token: owner.token,
    body: {
      academyName: academy.name.en,
      requestedSubdomain: academy.slug,
      selectedThemeKey: 'modern-education',
      websiteSetupMode: 'complete',
      brand: BRAND,
      idempotencyKey,
    },
  });
  const requestId = created.json.id;
  for (let i = 0; i < 160; i++) {
    const s = (await call('GET', `/organizations/${state.organizationId}/provisioning-requests/${requestId}`, { token: owner.token })).json;
    if (s.status === 'ready' || s.status === 'completed') break;
    if (s.status === 'failed' || s.status === 'cancelled') throw new Error('provisioning ' + JSON.stringify(s).slice(0, 800));
    await sleep(1000);
  }
  const academies = list((await call('GET', `/academies?pageSize=50&organizationId=${state.organizationId}`, { token: owner.token })).json);
  const found = academies.find((a) => a.subdomain === academy.slug || a.slug === academy.slug || a.name === academy.name.en);
  if (!found) throw new Error(`academy ${academy.slug} not found after provisioning: ${JSON.stringify(academies).slice(0, 400)}`);
  return found.id;
}

export default async function run() {
  clearLimits();
  if (!state.ownerId) {
    const plans = (await call('GET', '/public/plans')).json;
    const plan = plans.find((p) => p.key === 'enterprise') ?? plans[plans.length - 1];
    const r = await call('POST', '/auth/register', {
      ok: false,
      body: {
        name: OWNER.name.en,
        email: OWNER.email,
        password: PASSWORD,
        organizationName: ORG_NAME,
        planId: plan.id,
        phoneNumber: OWNER.phone,
        phoneCountry: 'EG',
      },
    });
    if (r.status !== 201 && r.status !== 409) throw new Error(`owner register ${r.status}: ${JSON.stringify(r.json).slice(0, 400)}`);
    // Stub email provider: no inbox to click the verification link in.
    verifyMailbox(OWNER.email);
    const owner = await signIn(OWNER.email, PASSWORD);
    const me = (await call('GET', '/users/me', { token: owner.token })).json;
    state.ownerId = me.id;
    state.organizationId = (me.organizationMemberships ?? []).find((m) => m.role === 'owner')?.organizationId;
    state.planKey = plan.key;
    save();
  }
  log('organization', state.organizationId);
  let owner = await signIn(OWNER.email, PASSWORD);

  if (!state.academyId) {
    state.academyId = await provision(owner, ACADEMY, 'docs-provision-al-nour');
    save();
  }
  if (!state.secondAcademyId) {
    owner = await signIn(OWNER.email, PASSWORD);
    state.secondAcademyId = await provision(owner, SECOND_ACADEMY, 'docs-provision-al-nour-kids');
    save();
  }
  state.academySlug = ACADEMY.slug;
  state.secondAcademySlug = SECOND_ACADEMY.slug;
  log('academies', state.academyId, state.secondAcademyId);
  owner = await signIn(OWNER.email, PASSWORD);

  // Logo + favicon in the academy's media library, applied as its visual identity.
  const A = state.academyId;
  const upload = async (academyId, file, mime, altText) =>
    (
      await call('POST', `/academies/${academyId}/media`, {
        token: owner.token,
        body: { fileName: file, mimeType: mime, sizeBytes: fileSize(file), dataUrl: dataUrl(file, mime), altText },
      })
    ).json;
  if (!state.logoUrl) {
    state.logoUrl = (await upload(A, 'logo.png', 'image/png', 'Al-Nour Academy logo')).url;
    state.faviconUrl = (await upload(A, 'favicon.png', 'image/png', 'Al-Nour Academy icon')).url;
    state.secondLogoUrl = (await upload(state.secondAcademyId, 'logo-kids.png', 'image/png', 'Al-Nour Kids logo')).url;
    save();
  }
  await attempt('visual identity', 'PUT', `/academies/${A}/visual-identity`, {
    token: owner.token,
    body: { name: ACADEMY.name.en, logo: state.logoUrl, favicon: state.faviconUrl, brand: BRAND },
  });
  await attempt('visual identity (kids)', 'PUT', `/academies/${state.secondAcademyId}/visual-identity`, {
    token: owner.token,
    body: { name: SECOND_ACADEMY.name.en, logo: state.secondLogoUrl },
  });
  await attempt('academy details', 'PATCH', `/academies/${A}`, {
    token: owner.token,
    body: { description: ACADEMY.description.en, contactEmail: ACADEMY.contactEmail, contactPhone: ACADEMY.contactPhone },
  });
}
