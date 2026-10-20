// Spreads the rows created by steps 01–06 over the last ~2 months, so lists,
// "joined"/"paid" dates and charts look like an academy that has been running
// for a while. Direct SQL (the API has no way to create rows in the past):
// ONLY timestamps change, deterministically, on the local demo database.
import { state, psql } from '../lib.mjs';

const at = (daysAgo, hour = 10, minute = 0) =>
  `(date_trunc('day', now()) - interval '${daysAgo} days' + interval '${hour} hours' + interval '${minute} minutes')`;

export default async function run() {
  const A = state.academyId;
  const A2 = state.secondAcademyId;
  const org = state.organizationId;
  const sql = [];
  sql.push(`update organizations set created_at = ${at(62, 9)} where id = '${org}'`);
  sql.push(`update organization_memberships set joined_at = ${at(62, 9)} where organization_id = '${org}' and user_id = '${state.ownerId}'`);
  sql.push(`update organization_memberships set joined_at = ${at(50, 11)} where organization_id = '${org}' and user_id <> '${state.ownerId}'`);
  sql.push(`update users set created_at = ${at(62, 9)} where id = '${state.ownerId}'`);
  sql.push(`update academies set created_at = ${at(61, 10)} where id = '${A}'`);
  sql.push(`update academies set created_at = ${at(20, 15)} where id = '${A2}'`);
  sql.push(`update academy_members set joined_at = ${at(61, 10)} where academy_id in ('${A}', '${A2}') and role = 'owner'`);
  sql.push(`update academy_members set joined_at = ${at(50, 11)} where academy_id = '${A}' and role <> 'owner'`);
  sql.push(`update academy_members set joined_at = ${at(2, 16)} where user_id = '${state.invitedStaffId}'`);
  sql.push(`update users set created_at = ${at(50, 11)} where id in ('${state.managerId}', '${state.instructorId}')`);
  sql.push(`update users set created_at = ${at(2, 16)} where id = '${state.invitedStaffId}'`);
  sql.push(`update website_configurations set created_at = ${at(61, 10)}, published_at = ${at(58, 12)} where academy_id = '${A}'`);

  Object.values(state.courses).forEach((c, k) => {
    const d = 57 - k * 6;
    sql.push(`update courses set created_at = ${at(d, 12)}, published_at = case when published_at is null then null else ${at(d - 2, 18)} end where id = '${c.id}'`);
    sql.push(`update course_sections set created_at = ${at(d, 12)} where course_id = '${c.id}'`);
    sql.push(`update course_lessons set created_at = ${at(d, 13)} where section_id in (select id from course_sections where course_id = '${c.id}')`);
    if (c.quizId) sql.push(`update quizzes set created_at = ${at(d - 1, 14)} where id = '${c.quizId}'`);
    if (c.assignmentId) sql.push(`update assignments set created_at = ${at(d - 1, 15)} where id = '${c.assignmentId}'`);
  });

  // Learners: joined between 40 and 2 days ago; activity after that.
  const joined = { salma: 38, omar: 35, hana: 30, ziad: 21, youssef: 18, mariam: 6, ali: 3, laila: 1 };
  for (const [key, days] of Object.entries(joined)) {
    const u = state.learners[key]?.userId;
    if (!u) continue;
    const buy = Math.max(0, days - 1);
    sql.push(`update users set created_at = ${at(days, 19, 5)} where id = '${u}'`);
    sql.push(`update academy_students set joined_at = ${at(days, 19, 5)}, last_activity_at = ${at(Math.max(0, Math.floor(days / 4)), 20, 30)}, blocked_at = case when blocked_at is null then null else ${at(4, 13)} end where user_id = '${u}' and academy_id = '${A}'`);
    sql.push(`update course_orders set created_at = ${at(buy, 20)}, updated_at = ${at(buy, 21)}, paid_at = case when paid_at is null then null else ${at(Math.max(0, buy - 1), 10, 30)} end where student_id = '${u}'`);
    sql.push(`update payments set created_at = ${at(buy, 20)}, updated_at = ${at(Math.max(0, buy - 1), 10, 30)} where payer_user_id = '${u}'`);
    sql.push(`update enrollments set enrolled_at = ${at(Math.max(0, buy - 1), 10, 30)}, created_at = ${at(Math.max(0, buy - 1), 10, 30)} where student_id = '${u}'`);
    sql.push(`update lesson_progress lp set completed_at = least(now() - interval '2 hours', e.enrolled_at + (now() - e.enrolled_at) * 0.6), created_at = e.enrolled_at + interval '1 hour', last_activity_at = least(now() - interval '2 hours', e.enrolled_at + (now() - e.enrolled_at) * 0.6) from enrollments e where lp.enrollment_id = e.id and e.student_id = '${u}'`);
    sql.push(`update quiz_attempts set started_at = least(now() - interval '3 hours', ${at(Math.floor(days / 3), 18)}), submitted_at = least(now() - interval '3 hours', ${at(Math.floor(days / 3), 18, 14)}), created_at = least(now() - interval '3 hours', ${at(Math.floor(days / 3), 18)}) where student_id = '${u}'`);
  }
  sql.push(`update payment_proofs pp set uploaded_at = p.created_at + interval '20 minutes' from payments p where pp.payment_id = p.id and p.payee_academy_id = '${A}'`);
  sql.push(`update payment_reviews pr set reviewed_at = greatest(p.updated_at, p.created_at + interval '2 hours') from payments p where pr.payment_id = p.id and p.payee_academy_id = '${A}'`);
  sql.push(`update enrollments e set completed_at = sub.m from (select enrollment_id, max(completed_at) m from lesson_progress group by 1) sub where sub.enrollment_id = e.id and e.completed_at is not null and e.academy_id = '${A}'`);
  sql.push(`update certificates set issued_at = now() - interval '2 days' where academy_id = '${A}'`);
  // The owner has read everything but the five newest notifications.
  sql.push(`update notifications set is_read = true where user_id = '${state.ownerId}' and id not in (select id from notifications where user_id = '${state.ownerId}' order by created_at desc limit 5)`);
  for (const stmt of sql) {
    try {
      psql(stmt + ';');
    } catch (e) {
      console.log('   WARN backdate:', String(e.stderr ?? e).split('\n')[0], '←', stmt.slice(0, 90));
    }
  }
}
