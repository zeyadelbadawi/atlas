// Learners of al-nour: registration on the academy, course orders paid with
// the academy's manual methods (proof → staff review), free enrollment,
// progress, a quiz attempt with an essay awaiting grading, an assignment
// submission, a completed course with a certificate, a blocked learner, a
// learner pending approval, a manual enrollment with an expiry, a refund
// request and an invite link.
import { state, save, call, attempt, signIn, dataUrl, clearLimits, verifyMailbox, log, list, psql, sqlText } from '../lib.mjs';
import { OWNER, PASSWORD, LEARNERS, learnerEmail, COURSES } from '../data.mjs';

const owner = () => signIn(OWNER.email, PASSWORD);

export default async function run() {
  const A = state.academyId;
  state.learners ??= {};
  const L = (key) => state.learners[key];
  const session = (key) => signIn(L(key).email, PASSWORD, { surface: 'academy', academyId: A });

  async function register(l) {
    const st = (state.learners[l.key] ??= { email: learnerEmail(l), name: l.name.en });
    if (st.userId) return st;
    clearLimits();
    const r = await call('POST', '/auth/register', { ok: false, body: { name: l.name.en, email: st.email, password: PASSWORD, academyId: A } });
    if (r.status !== 201 && r.status !== 409) throw new Error(`register ${l.key}: ${r.status} ${JSON.stringify(r.json).slice(0, 300)}`);
    // Stub email provider: no inbox to click the verification link in.
    verifyMailbox(st.email);
    st.userId =
      r.json?.user?.id ??
      psql(`select id from users where lower(email) = lower(${sqlText(st.email)})`);
    save();
    return st;
  }

  async function order(key, courseKey, { methodKey, proof, reference, review }) {
    const st = L(key);
    st.orders ??= {};
    if (st.orders[courseKey]) return st.orders[courseKey];
    const s = await session(key);
    const courseId = state.courses[courseKey].id;
    const o = (await call('POST', `/courses/${courseId}/course-orders`, { token: s.token, body: { idempotencyKey: `docs-${key}-${courseKey}` } })).json;
    const methods = list((await call('GET', `/course-orders/${o.id}/payment-methods`, { token: s.token })).json).map((m) => m.key ?? m.methodKey);
    const mk = methods.find((k) => k.includes(methodKey)) ?? methods[0];
    const payment = (await call('POST', `/course-orders/${o.id}/payments`, { token: s.token, body: { methodKey: mk } })).json;
    await call('PATCH', `/course-orders/${o.id}/payments/${payment.id}/proof`, {
      token: s.token,
      body: { fileName: proof, fileData: dataUrl(proof, 'image/png'), payerReference: reference },
    });
    const ow = await owner();
    if (review === 'approve') await call('POST', `/academies/${A}/course-payments/${payment.id}/approve`, { token: ow.token, body: {} });
    if (review === 'reject')
      await call('POST', `/academies/${A}/course-payments/${payment.id}/reject`, {
        token: ow.token,
        body: { reason: 'The amount on the receipt does not match the course price. Please upload the correct receipt.' },
      });
    st.orders[courseKey] = { orderId: o.id, paymentId: payment.id, methodKey: mk, review: review ?? 'pending' };
    save();
    return st.orders[courseKey];
  }

  async function complete(key, courseKey, upTo) {
    const s = await session(key);
    const c = state.courses[courseKey];
    const lessons = c.sections.flatMap((x) => x.lessons).slice(0, upTo);
    for (const lessonId of lessons) {
      await attempt(`complete lesson ${key}`, 'POST', `/courses/${c.id}/progress/complete-lesson`, { token: s.token, body: { lessonId } });
    }
  }

  async function takeQuiz(key, { essay }) {
    const st = L(key);
    if (st.quizSubmitted) return;
    const s = await session(key);
    const c = state.courses.calculus;
    const def = COURSES.find((x) => x.key === 'calculus').quiz;
    const start = await attempt(`quiz start ${key}`, 'POST', `/courses/${c.id}/quizzes/${c.quizId}/attempts`, { token: s.token });
    if (start.status >= 300) return;
    const attemptId = start.json.id;
    const sess = (await call('GET', `/courses/${c.id}/quizzes/${c.quizId}/attempts/${attemptId}`, { token: s.token })).json;
    const questions = sess.questions ?? sess.quiz?.questions ?? [];
    const answers = questions.map((q) => {
      const d = def.questions.find((x) => x.prompt.en === q.prompt) ?? {};
      if (q.type === 'essay') return { questionId: q.id, text: essay };
      if (q.type === 'short_answer') return { questionId: q.id, text: '7' };
      const correct = (d.options ?? []).filter(([, ok]) => ok).map(([l]) => l.en);
      return { questionId: q.id, selectedOptionIds: (q.options ?? []).filter((o) => correct.includes(o.label)).map((o) => o.id) };
    });
    const sub = await attempt(`quiz submit ${key}`, 'POST', `/courses/${c.id}/quizzes/${c.quizId}/attempts/${attemptId}/submit`, {
      token: s.token,
      body: { answers, revision: (sess.revision ?? sess.answersRevision ?? 0) + 1 },
    });
    st.quizAttemptId = attemptId;
    st.quizSubmitted = sub.status < 300;
    st.quizAttemptStatus = sub.json?.status;
    save();
  }

  // Staff grades an essay (instructor review endpoint), so a later lesson unlocks.
  async function gradeEssay(key, points) {
    const st = L(key);
    if (st.quizGraded || !st.quizAttemptId) return;
    const ow = await owner();
    const c = state.courses.calculus;
    const detail = (await call('GET', `/instructor/courses/${c.id}/quizzes/${c.quizId}/attempts/${st.quizAttemptId}`, { token: ow.token })).json;
    const qs = detail.questions ?? detail.answers ?? detail.attempt?.questions ?? [];
    const essay = qs.find((q) => (q.type ?? q.question?.type) === 'essay');
    const questionId = essay?.questionId ?? essay?.id ?? essay?.question?.id;
    const r = await attempt(`grade essay ${key}`, 'POST', `/instructor/courses/${c.id}/quizzes/${c.quizId}/attempts/${st.quizAttemptId}/grade`, {
      token: ow.token,
      body: { grades: [{ questionId, points }] },
    });
    st.quizGraded = r.status < 300;
    save();
  }

  for (const l of LEARNERS.filter((x) => x.key !== 'laila')) await register(l);

  // Laila registers while the academy requires approval → stays "pending approval".
  if (!L('laila')?.userId) {
    let ow = await owner();
    await call('PATCH', `/academies/${A}/registration-policy`, { token: ow.token, body: { registrationPolicy: 'approval' } });
    await register(LEARNERS.find((x) => x.key === 'laila'));
    ow = await owner();
    await call('PATCH', `/academies/${A}/registration-policy`, { token: ow.token, body: { registrationPolicy: 'open' } });
  }

  // Salma: calculus via InstaPay, section 1 done, quiz with an essay (awaiting grading), assignment.
  await order('salma', 'calculus', { methodKey: 'instapay', proof: 'receipt-instapay.png', reference: 'DEMO-IPN-0001', review: 'approve' });
  await complete('salma', 'calculus', 3);
  await takeQuiz('salma', {
    essay:
      'Substituting x = 2 gives 0/0, which is undefined. Factorise the top: (x − 2)(x + 2). Cancel (x − 2), then substitute x = 2 into x + 2 to get 4.',
  });
  // The quiz is waiting for its essay to be graded; the next unit is open meanwhile.
  await complete('salma', 'calculus', 6);
  if (!L('salma').submissionId) {
    const s = await session('salma');
    const c = state.courses.calculus;
    const r = await attempt('assignment submission', 'POST', `/courses/${c.id}/assignments/${c.assignmentId}/submission`, {
      token: s.token,
      body: {
        response: '1) 6x + 2\n2) 12x³ − 4x\n3) 2(3x + 1)·3 = 18x + 6\n4) cos x − sin x\n5) 24x(3x² + 1)³\nMy full working is in the photo link below.',
        attachmentUrl: 'https://files.example.com/al-nour/demo-homework-photo.jpg',
        idempotencyKey: 'docs-salma-assignment',
      },
    });
    L('salma').submissionId = r.json?.id ?? r.json?.submission?.id;
    save();
  }

  // Salma also bought the English course (InstaPay, approved) and has done one
  // lesson of two: the lesson-player shot needs a course she has not finished
  // (calculus is all done, so every activity there is her last one and shows
  // Finish course). Not the free course: free-course-enroll needs her not
  // enrolled there.
  await order('salma', 'english', { methodKey: 'instapay', proof: 'receipt-instapay.png', reference: 'DEMO-IPN-0007', review: 'approve' });
  await complete('salma', 'english', 1);

  // Omar: calculus via bank transfer, every lesson done → completed (certificate below).
  await order('omar', 'calculus', { methodKey: 'bank', proof: 'receipt-bank.png', reference: 'DEMO-TRX-0002', review: 'approve' });
  await complete('omar', 'calculus', 3);
  await takeQuiz('omar', { essay: 'Direct substitution gives 0/0. Factor and cancel (x − 2); the limit is 4.' });
  await gradeEssay('omar', 4);
  await complete('omar', 'calculus', 99);
  if (!L('omar').assignmentGraded) {
    const s = await session('omar');
    const c = state.courses.calculus;
    const sub = await attempt('assignment submission omar', 'POST', `/courses/${c.id}/assignments/${c.assignmentId}/submission`, {
      token: s.token,
      body: { response: 'All five answers with full working are in the linked photo.', attachmentUrl: 'https://files.example.com/al-nour/demo-omar-homework.jpg', idempotencyKey: 'docs-omar-assignment' },
    });
    const submissionId = sub.json?.id ?? sub.json?.submission?.id;
    // The assigned instructor grades it.
    const mona = await signIn(state.staff.instructor.email, PASSWORD);
    const g = await attempt('grade assignment omar', 'POST', `/instructor/courses/${c.id}/assignments/${c.assignmentId}/submissions/${submissionId}/grade`, {
      token: mona.token,
      body: { score: 95, feedback: 'Excellent, every step is clear.' },
    });
    L('omar').assignmentGraded = g.status < 300;
    save();
  }

  // Hana: free course in progress; English via wallet (approved) and then a refund request.
  if (!L('hana').freeEnrolled) {
    const s = await session('hana');
    await attempt('free enrollment hana', 'POST', '/enrollments', { token: s.token, body: { courseId: state.courses.study.id } });
    L('hana').freeEnrolled = true;
    save();
  }
  await complete('hana', 'study', 2);
  const hanaOrder = await order('hana', 'english', { methodKey: 'wallet', proof: 'receipt-wallet.png', reference: '01000000104', review: 'approve' });
  if (!L('hana').refund) {
    const s = await session('hana');
    // Atlas answers errors.courseOrder.refundContactAcademy for manual payments (the academy refunds
    // outside Atlas); recorded in the state either way.
    const r = await call('POST', `/course-orders/${hanaOrder.orderId}/refund`, {
      ok: false,
      token: s.token,
      body: { idempotencyKey: 'docs-hana-refund', reason: 'I enrolled in the wrong level by mistake.' },
    });
    L('hana').refund = r.status < 300 ? (r.json?.status ?? 'requested') : `refused: ${r.json?.error?.messageKey ?? r.status}`;
    save();
  }

  // Ali: calculus order pending review (wallet proof). Mariam: English order rejected.
  await order('ali', 'calculus', { methodKey: 'wallet', proof: 'receipt-wallet.png', reference: '01000000105' });
  await order('mariam', 'english', { methodKey: 'bank', proof: 'receipt-bank.png', reference: 'DEMO-TRX-0006', review: 'reject' });

  // Youssef: free course, then blocked by staff.
  if (!L('youssef').blocked) {
    const s = await session('youssef');
    await attempt('free enrollment youssef', 'POST', '/enrollments', { token: s.token, body: { courseId: state.courses.study.id } });
    await complete('youssef', 'study', 1);
    const ow = await owner();
    await attempt('block youssef', 'POST', `/academies/${A}/students/${L('youssef').userId}/block`, {
      token: ow.token,
      body: { reason: 'Shared his account with other people.' },
    });
    L('youssef').blocked = true;
    save();
  }

  // Ziad: calculus granted by staff with an expiry 60 days out.
  if (!L('ziad').granted) {
    const ow = await owner();
    const expiresAt = new Date(Date.now() + 60 * 86400_000).toISOString();
    const r = await attempt('manual enrollment ziad', 'POST', `/academies/${A}/students/${L('ziad').userId}/enrollments`, {
      token: ow.token,
      body: { courseId: state.courses.calculus.id, expiresAt },
    });
    L('ziad').granted = r.status < 300;
    L('ziad').enrollmentId = r.json?.id ?? r.json?.enrollment?.id;
    save();
    await complete('ziad', 'calculus', 2);
  }

  // Omar's certificate: issued automatically on completion when certificates are on; otherwise by staff.
  if (!state.certificateId) {
    const ow = await owner();
    let certs = list((await call('GET', `/academies/${A}/certificates`, { token: ow.token })).json);
    if (!certs.length) {
      const detail = (await call('GET', `/academies/${A}/students/${L('omar').userId}`, { token: ow.token })).json;
      const enr = (detail.enrollments ?? []).find((e) => (e.courseId ?? e.course?.id) === state.courses.calculus.id);
      if (enr) {
        await attempt('issue certificate', 'POST', `/academies/${A}/enrollments/${enr.id ?? enr.enrollmentId}/certificate`, {
          token: ow.token,
          body: { reason: 'Completed every lesson.' },
        });
      } else log('WARN no calculus enrollment for omar', JSON.stringify(detail).slice(0, 300));
      certs = list((await call('GET', `/academies/${A}/certificates`, { token: ow.token })).json);
    }
    state.certificateId = certs[0]?.id;
    state.certificateCode = certs[0]?.verificationCode ?? certs[0]?.code ?? certs[0]?.serial;
    save();
  }

  // A shareable invite link (the raw token is shown only at creation).
  if (!state.inviteId) {
    const ow = await owner();
    const r = await attempt('invite link', 'POST', `/academies/${A}/invites`, { token: ow.token, body: { maxUses: 30, expiresInDays: 14 } });
    state.inviteId = r.json?.id ?? r.json?.invite?.id;
    state.inviteToken = r.json?.token ?? r.json?.rawToken;
    save();
  }

  // Captures' placeholders.
  Object.assign(state, {
    learnerId: L('salma').userId,
    learnerEmail: L('salma').email,
    blockedLearnerId: L('youssef').userId,
    pendingLearnerId: L('laila').userId,
    orderId: L('ali').orders.calculus.orderId,
    paymentId: L('ali').orders.calculus.paymentId,
    approvedOrderId: L('salma').orders.calculus.orderId,
    rejectedOrderId: L('mariam').orders.english.orderId,
    quizAttemptId: L('salma').quizAttemptId,
    submissionId: L('salma').submissionId,
    expiringEnrollmentId: L('ziad').enrollmentId,
    completedLearnerId: L('omar').userId,
    inProgressLessonId: state.courses.english.sections[0].lessons[0],
  });
  save();
}
