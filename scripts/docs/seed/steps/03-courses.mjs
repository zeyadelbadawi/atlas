// Courses with sections, YouTube and link lessons, a quiz (every question
// type, including an essay), an assignment, the academy certificate
// template, an instructor assignment, and publishing (one course stays a draft).
import { state, save, call, attempt, signIn, dataUrl, fileSize, log } from '../lib.mjs';
import { OWNER, PASSWORD, COURSES, ACADEMY } from '../data.mjs';

const lang = 'en'; // created in English; `locale.mjs ar` switches the authored text

/** Puts a quiz/assignment after the section's lessons (a new item is created at position 0). */
async function placeLast(token, base, sectionId, itemId) {
  const items = (await call('GET', `${base}/sections/${sectionId}/items`, { token })).json;
  const lessons = items.filter((i) => i.id !== itemId).sort((a, b) => a.order - b.order);
  const orderedIds = [...lessons.map((i) => i.id), itemId];
  if (items.map((i) => i.id).join() === orderedIds.join()) return;
  await attempt('reorder items', 'PATCH', `${base}/sections/${sectionId}/items/order`, { token, body: { orderedIds } });
}

export default async function run() {
  const A = state.academyId;
  let owner = await signIn(OWNER.email, PASSWORD);
  state.courses ??= {};

  for (const c of COURSES) {
    owner = await signIn(OWNER.email, PASSWORD);
    const st = (state.courses[c.key] ??= {});
    if (!st.coverUrl) {
      st.coverUrl = (
        await call('POST', `/academies/${A}/media`, {
          token: owner.token,
          body: { fileName: c.cover, mimeType: 'image/jpeg', sizeBytes: fileSize(c.cover), dataUrl: dataUrl(c.cover, 'image/jpeg'), altText: c.title.en },
        })
      ).json.url;
      save();
    }
    if (!st.id) {
      const r = await call('POST', `/academies/${A}/courses`, {
        token: owner.token,
        body: {
          title: c.title[lang],
          slug: c.slug,
          shortDescription: c.short[lang],
          description: c.short[lang],
          thumbnail: st.coverUrl,
          pricing: c.pricing,
          visibility: 'public',
          level: c.level,
          outcomes: c.outcomes[lang],
          requirements: c.requirements[lang],
          idempotencyKey: `docs-course-${c.key}`,
        },
      });
      st.id = r.json.id;
      st.slug = c.slug;
      save();
    }
    const base = `/academies/${A}/courses/${st.id}`;
    st.sections ??= [];
    for (const [si, sec] of c.sections.entries()) {
      const ss = (st.sections[si] ??= { lessons: [] });
      if (!ss.id) {
        ss.id = (await call('POST', `${base}/sections`, { token: owner.token, body: { title: sec.title[lang] } })).json.id;
        save();
      }
      for (const [li, les] of sec.lessons.entries()) {
        if (ss.lessons[li]) continue;
        const lr = await call('POST', `${base}/sections/${ss.id}/lessons`, {
          token: owner.token,
          body: {
            title: les.title[lang],
            contentType: les.kind,
            contentUrl: les.url,
            status: 'published',
            completionRule: 'manual',
            ...(les.preview ? { isPreview: true } : {}),
          },
        });
        ss.lessons[li] = lr.json.id;
        save();
      }
    }

    if (c.quiz && !st.quizId) {
      const q = c.quiz;
      const r = await call('POST', `/courses/${st.id}/quizzes`, {
        token: owner.token,
        body: {
          title: q.title[lang],
          description: q.description[lang],
          status: 'published',
          passingScore: 60,
          maxAttempts: 3,
          // Required: a learner whose essay is not graded yet has not completed the course.
          requiredForCompletion: true,
          sectionId: st.sections[q.afterSection].id,
          questions: q.questions.map((qq) => ({
            prompt: qq.prompt[lang],
            type: qq.type,
            points: qq.points ?? 1,
            ...(qq.options ? { options: qq.options.map(([label, isCorrect]) => ({ label: label[lang], isCorrect })) } : {}),
            ...(qq.acceptedAnswers ? { acceptedAnswers: qq.acceptedAnswers } : {}),
          })),
        },
      });
      st.quizId = r.json.id;
      save();
      const items = (await call('GET', `${base}/sections/${st.sections[q.afterSection].id}/items`, { token: owner.token })).json;
      if (!JSON.stringify(items).includes(st.quizId)) {
        await attempt('attach quiz', 'POST', `${base}/sections/${st.sections[q.afterSection].id}/items/attach`, {
          token: owner.token,
          body: { type: 'quiz', itemId: st.quizId },
        });
      }
    }

    if (c.assignment && !st.assignmentId) {
      const a = c.assignment;
      const r = await call('POST', `/courses/${st.id}/assignments`, {
        token: owner.token,
        body: {
          title: a.title[lang],
          description: a.description[lang],
          instructions: a.instructions[lang],
          sectionId: st.sections[a.section].id,
          status: 'published',
          allowResubmission: true,
        },
      });
      st.assignmentId = r.json.id;
      save();
      const items = (await call('GET', `${base}/sections/${st.sections[a.section].id}/items`, { token: owner.token })).json;
      if (!JSON.stringify(items).includes(st.assignmentId)) {
        await attempt('attach assignment', 'POST', `${base}/sections/${st.sections[a.section].id}/items/attach`, {
          token: owner.token,
          body: { type: 'assignment', itemId: st.assignmentId },
        });
      }
    }

    if (c.quiz) await placeLast(owner.token, base, st.sections[c.quiz.afterSection].id, st.quizId);
    if (c.assignment) await placeLast(owner.token, base, st.sections[c.assignment.section].id, st.assignmentId);

    if (c.publish && !st.published) {
      const pr = await attempt(`publish ${c.key}`, 'POST', `${base}/publish`, { token: owner.token });
      st.published = pr.status < 300;
      save();
    }
    if (c.instructor && state.instructorId && !st.instructorAssigned) {
      const ar = await attempt(`assign instructor ${c.key}`, 'POST', `${base}/instructors`, { token: owner.token, body: { userId: state.instructorId } });
      st.instructorAssigned = ar.status < 300;
      save();
    }
  }

  // The academy's certificate template, then certificates on for the calculus course.
  owner = await signIn(OWNER.email, PASSWORD);
  if (!state.signatureUrl) {
    state.signatureUrl = (
      await call('POST', `/academies/${A}/media`, {
        token: owner.token,
        body: { fileName: 'signature.png', mimeType: 'image/png', sizeBytes: fileSize('signature.png'), dataUrl: dataUrl('signature.png', 'image/png'), altText: 'Signature' },
      })
    ).json.url;
    save();
  }
  const tpl = await attempt('certificate template', 'PUT', `/academies/${A}/certificate-template`, {
    token: owner.token,
    body: {
      name: 'Al-Nour certificate',
      logoUrl: state.logoUrl,
      signatureUrl: state.signatureUrl,
      signatoryName: 'Nour Hassan',
      signatoryTitle: 'Academy director',
      primaryColor: '#1B3A8C',
      accentColor: '#F5B83D',
      wording: {
        en: { title: 'Certificate of completion', body: `has successfully completed this course at ${ACADEMY.name.en}.` },
        ar: { title: 'شهادة إتمام', body: `أتمّ هذا الكورس بنجاح في ${ACADEMY.name.ar}.` },
      },
    },
  });
  state.certificateTemplateId =
    tpl.json?.id ?? (await call('GET', `/academies/${A}/certificate-template`, { token: owner.token, ok: false })).json?.id;
  for (const c of COURSES.filter((x) => x.certificate)) {
    const r = await attempt(`certificates on (${c.key})`, 'PUT', `/academies/${A}/courses/${state.courses[c.key].id}/completion-rule`, {
      token: owner.token,
      body: { certificatesEnabled: true },
    });
    state.courses[c.key].certificatesEnabled = r.status < 300;
  }
  save();

  // Placeholders the captures use.
  const cal = state.courses.calculus;
  Object.assign(state, {
    courseId: cal.id,
    courseSlug: cal.slug,
    sectionId: cal.sections[0].id,
    lessonId: cal.sections[0].lessons[0],
    linkLessonId: cal.sections[0].lessons[1],
    quizId: cal.quizId,
    assignmentId: cal.assignmentId,
    freeCourseId: state.courses.study.id,
    draftCourseId: state.courses.physics.id,
    englishCourseId: state.courses.english.id,
  });
  save();
  log('courses', Object.entries(state.courses).map(([k, v]) => `${k}:${v.published ? 'published' : 'draft'}`).join(' '));
}
