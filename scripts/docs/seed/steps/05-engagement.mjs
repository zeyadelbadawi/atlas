// Announcements, an academy message, a support ticket and a custom domain
// waiting for verification (contact-form messages: step 06, once the site is published).
// Notifications are not seeded directly: the actions above and in the
// earlier steps (orders, proofs, reviews, submissions) generate them.
import { state, save, call, attempt, signIn, log, stableUuid, list } from '../lib.mjs';
import { OWNER, PASSWORD } from '../data.mjs';

export default async function run() {
  const A = state.academyId;
  let owner = await signIn(OWNER.email, PASSWORD);

  if (!state.announcementId) {
    const a = await attempt('academy announcement', 'POST', `/academies/${A}/announcements`, {
      token: owner.token,
      body: {
        title: 'Mid-term revision week starts Saturday',
        body: 'Revision videos and a practice quiz for every course will open on Saturday. Plan two hours a day for the week.',
      },
    });
    if (a.status < 300) {
      state.announcementId = a.json.id;
      await attempt('publish announcement', 'POST', `/academies/${A}/announcements/${a.json.id}/publish`, { token: owner.token });
    }
    const c = await attempt('course announcement', 'POST', `/courses/${state.courses.calculus.id}/announcements`, {
      token: owner.token,
      body: { title: 'New practice sheet added', body: 'A derivatives practice sheet is now in unit 2. Try it before the problem set.' },
    });
    if (c.status < 300) {
      state.courseAnnouncementId = c.json.id;
      await attempt('publish course announcement', 'POST', `/courses/${state.courses.calculus.id}/announcements/${c.json.id}/publish`, { token: owner.token });
    }
    // A draft stays a draft (for "edit before publishing" screenshots).
    const d = await attempt('draft announcement', 'POST', `/academies/${A}/announcements`, {
      token: owner.token,
      body: { title: 'Exam timetable', body: 'The final exam timetable will be shared here.' },
    });
    state.draftAnnouncementId = d.json?.id;
    save();
  }

  if (!state.messageId) {
    const audience = { type: 'courses', courseIds: [state.courses.calculus.id] };
    const channels = { email: false, inApp: true };
    const preview = await attempt('message preview', 'POST', `/academies/${A}/messages/preview`, { token: owner.token, body: { audience, channels } });
    const count = preview.json?.recipientCount ?? preview.json?.count ?? preview.json?.recipients ?? 0;
    const m = await attempt('academy message', 'POST', `/academies/${A}/messages`, {
      token: owner.token,
      body: {
        audience,
        channels,
        idempotencyKey: stableUuid('docs-message-1'),
        subject: 'Live Q&A on limits this Thursday',
        bodyHtml: '<p>Bring your questions on limits and continuity. The Q&amp;A link will be posted in the course on Thursday.</p>',
        contentLocale: 'en',
        expectedRecipientCount: count,
      },
    });
    state.messageId = m.json?.id ?? m.json?.campaign?.id;
    save();
  }
  if (!state.messageId) {
    const sent = list((await call('GET', `/academies/${A}/messages`, { token: owner.token, ok: false })).json);
    state.messageId = sent[0]?.id;
    save();
  }

  if (!state.supportCaseId) {
    const r = await attempt('support ticket', 'POST', `/organizations/${state.organizationId}/support-cases`, {
      token: owner.token,
      body: {
        subject: 'Question about adding a second wallet number',
        description: 'Hello, can we show two e-wallet numbers at checkout, one per instructor? Thanks, Nour.',
      },
    });
    state.supportCaseId = r.json?.id ?? r.json?.case?.id;
    save();
  }
  state.ticketId = state.supportCaseId;
  save();

  if (!state.customDomain) {
    owner = await signIn(OWNER.email, PASSWORD);
    for (const hostname of ['learn.al-nour.example.com', 'academy.example.com']) {
      const r = await attempt(`custom domain ${hostname}`, 'POST', `/academies/${A}/website/domain/custom-domain`, { token: owner.token, body: { hostname } });
      if (r.status < 300) {
        state.customDomain = hostname;
        break;
      }
    }
    const d = await call('GET', `/academies/${A}/website/domain`, { token: owner.token, ok: false });
    state.customDomainStatus = d.json?.customDomain?.status ?? d.json?.connection?.status ?? d.json?.status;
    save();
    log('domain', state.customDomain, state.customDomainStatus);
  }
}
