// Switches the demo academy's AUTHORED content between its English and
// Arabic editions, so English screenshots show English data and Arabic
// screenshots Arabic data (the UI language itself is the browser's choice).
//
//   node scripts/docs/seed/locale.mjs en|ar
//
// Academy names, courses, sections, lessons, quiz and assignment titles and
// announcements go through the API. Quiz question texts and options, people's
// display names and order snapshots are updated in place with SQL (the API
// cannot rename them without breaking attempt/answer ids or signing in as
// every person). capture.mjs calls this before each language pass.
import { pathToFileURL } from 'node:url';
import { state, save, call, attempt, signIn, psql, sqlText as q } from './lib.mjs';
import { OWNER, PASSWORD, ACADEMY, SECOND_ACADEMY, COURSES, LEARNERS, MANAGER, INSTRUCTOR, INVITED } from './data.mjs';

const ANNOUNCEMENTS = {
  announcementId: [
    ['Mid-term revision week starts Saturday', 'أسبوع مراجعة نص الترم يبدأ السبت'],
    [
      'Revision videos and a practice quiz for every course will open on Saturday. Plan two hours a day for the week.',
      'فيديوهات المراجعة واختبار تدريبي لكل كورس هيفتحوا يوم السبت. خصّص ساعتين كل يوم طول الأسبوع.',
    ],
  ],
  draftAnnouncementId: [
    ['Exam timetable', 'جدول الامتحانات'],
    ['The final exam timetable will be shared here.', 'جدول الامتحانات النهائية هيتنشر هنا.'],
  ],
};

export async function switchLocale(lang) {
  if (!['en', 'ar'].includes(lang)) throw new Error('usage: locale.mjs en|ar');
  if (state.locale === lang) return;
  const A = state.academyId;
  let o = await signIn(OWNER.email, PASSWORD);
  await call('PUT', `/academies/${A}/visual-identity`, { token: o.token, body: { name: ACADEMY.name[lang] } });
  await attempt('second academy name', 'PUT', `/academies/${state.secondAcademyId}/visual-identity`, { token: o.token, body: { name: SECOND_ACADEMY.name[lang] } });
  await attempt('academy details', 'PATCH', `/academies/${A}`, { token: o.token, body: { description: ACADEMY.description[lang] } });

  const sql = [];
  for (const c of COURSES) {
    o = await signIn(OWNER.email, PASSWORD);
    const st = state.courses[c.key];
    const base = `/academies/${A}/courses/${st.id}`;
    await call('PATCH', base, {
      token: o.token,
      body: { title: c.title[lang], shortDescription: c.short[lang], description: c.short[lang], outcomes: c.outcomes[lang], requirements: c.requirements[lang] },
    });
    for (const [si, sec] of c.sections.entries()) {
      const sid = st.sections[si].id;
      await call('PATCH', `${base}/sections/${sid}`, { token: o.token, body: { title: sec.title[lang] } });
      for (const [li, les] of sec.lessons.entries()) {
        await call('PATCH', `${base}/sections/${sid}/lessons/${st.sections[si].lessons[li]}`, { token: o.token, body: { title: les.title[lang] } });
      }
    }
    if (c.quiz) {
      await call('PATCH', `/courses/${st.id}/quizzes/${st.quizId}`, { token: o.token, body: { title: c.quiz.title[lang], description: c.quiz.description[lang] } });
      for (const qq of c.quiz.questions) {
        sql.push(`update quiz_questions set prompt = ${q(qq.prompt[lang])} where quiz_id = '${st.quizId}' and prompt in (${q(qq.prompt.en)}, ${q(qq.prompt.ar)})`);
        for (const [label] of qq.options ?? []) {
          sql.push(
            `update quiz_question_options set label = ${q(label[lang])} where label in (${q(label.en)}, ${q(label.ar)}) and question_id in (select id from quiz_questions where quiz_id = '${st.quizId}' and prompt = ${q(qq.prompt[lang])})`
          );
        }
      }
    }
    if (c.assignment) {
      await attempt('assignment', 'PATCH', `/courses/${st.id}/assignments/${st.assignmentId}`, {
        token: o.token,
        body: { title: c.assignment.title[lang], description: c.assignment.description[lang], instructions: c.assignment.instructions[lang] },
      });
    }
    // Orders keep the title they were bought under; the demo's orders follow the edition.
    sql.push(`update course_orders set snapshot = jsonb_set(snapshot, '{course,title}', to_jsonb(${q(c.title[lang])}::text)) where course_id = '${st.id}' and snapshot ? 'course'`);
  }
  const i = lang === 'en' ? 0 : 1;
  for (const [key, [title, body]] of Object.entries(ANNOUNCEMENTS)) {
    if (state[key]) await attempt('announcement', 'PATCH', `/academies/${A}/announcements/${state[key]}`, { token: o.token, body: { title: title[i], body: body[i] } });
  }
  // Display names: the same people, spelled in the edition's language.
  const people = [OWNER, MANAGER, INSTRUCTOR, INVITED].map((p) => [p.email, p.name[lang]]);
  for (const l of LEARNERS) if (state.learners?.[l.key]) people.push([state.learners[l.key].email, l.name[lang]]);
  sql.push(...people.map(([email, name]) => `update users set name = ${q(name)} where lower(email) = lower(${q(email)})`));
  psql(sql.join(';\n') + ';');

  o = await signIn(OWNER.email, PASSWORD);
  await attempt('website publish', 'POST', `/academies/${A}/website/publish`, { token: o.token });
  state.locale = lang;
  save();
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  await switchLocale(process.argv[2]);
  console.log('demo content edition:', process.argv[2]);
}
