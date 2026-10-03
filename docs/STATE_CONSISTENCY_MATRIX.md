# State Consistency Matrix (Task 6, frontend)

Goal: after a successful mutation, every screen that shows the changed data
reflects it without a manual refresh. The backend has no push channel
(no WebSocket/SSE), so data changed by *other people* is kept fresh by
conservative polling on list/queue screens only.

## Building blocks

| Piece | File | What it does |
|---|---|---|
| Prefix normalization | `src/services/query/query-utils.ts` (`normalizeKeyPrefix`, `invalidateQueries`, `invalidateQueryPrefixes`) | Drops trailing `undefined` from an invalidation key, so `list(scope)` matches every `list(scope, query)` cache. TanStack's `partialMatchKey` compares the `undefined` against the cached query object and never matches. Also applied to `useApiMutation`'s `invalidateKeys`. |
| Explicit list prefixes | `src/services/query/query-keys.ts` | `websiteKeys.faqEntriesAll/testimonialEntriesAll`, `paymentKeys.lists`, `provisioningKeys.lists`, `courseKeys.lists/details`, `academyKeys.rosterAll/lists/membersAll`, `publicWebsiteKeys.coursesAll`, plus new factories `dashboardOverviewKeys`, `tenantSupportCaseKeys`, `publicPlanKeys`, `platformPlanKeys`. Existing key shapes are unchanged. |
| Domain helpers | `src/services/query/invalidation.ts` | `invalidateCourseCatalog`, `invalidateBranding`, `invalidateRoster`, `invalidatePlans`, `invalidateTenantPayments`, `invalidateProvisioning`, `invalidateFaqEntries`, `invalidateTestimonialEntries`, `invalidatePublicWebsiteSite`, `invalidateSupportCases`. `academyTreeMatcher` matches `academyKeys` entries by academy id whatever organization id they carry, so course and website hooks need no session read. |
| Live lists | `src/config/query.config.ts` (`LIVE_LIST_QUERY_OPTIONS`) | `refetchInterval: 45s`, `refetchOnWindowFocus: true`, `refetchIntervalInBackground: false` (polling pauses while the tab is in the background). Used only on list and queue hooks. |
| Placeholder policy | `src/services/query/placeholder.ts`, `src/shared/hooks/useApiQuery.ts`, `src/services/query/query-client.ts` | The global `placeholderData: prev => prev` is removed. `useApiQuery` applies `keepPreviousForSameResource(queryKey)` instead: previous data is kept only when the keys differ in parameter elements (query objects or numbers). A change in any string element (an id, scope or slug) shows the loading state. Hooks that set `placeholderData` themselves keep their own setting. |

## Matrix

Legend: **Fixed** = changed in this task. **OK** = verified, no change needed. **Owned** = not edited here (another agent owns the file); see recommendations.

| Workflow | Mutation hook | Invalidates (after) | Screen queries | Root cause | Fix | Test |
|---|---|---|---|---|---|---|
| FAQ library create/edit/publish/archive | `useCreate/Update/Publish/ArchiveWebsiteFaqEntry` | `websiteKeys.faqEntriesAll(academy)` + `faqEntry(academy, id)` via `invalidateFaqEntries` | `useWebsiteFaqEntries` (`faqEntries(academy, {pagination})`) | Invalidated `faqEntries(academy)`, which ends in `undefined` and never matched the cached key | Domain helper with an explicit prefix, plus normalization in the helper | `invalidation.test.ts` (bug repro + fix), `mutation-invalidation.test.tsx` |
| Testimonial library create/edit/publish/archive | `useCreate/Update/Publish/ArchiveWebsiteTestimonialEntry` | `testimonialEntriesAll` + `testimonialEntry` via `invalidateTestimonialEntries` | `useWebsiteTestimonialEntries` | Same trailing-`undefined` bug | Same | `invalidation.test.ts` |
| FAQ/testimonial reorder (up/down) | `useSwapWebsiteFaqEntryOrder`, `useSwapWebsiteTestimonialEntryOrder` (new) | Library lists, on settle (success **and** failure) | Same lists | Two separate `update` mutations ran in parallel, pending state was ignored, and a fast second click raced the first | One mutation runs both writes in sequence. All move buttons are disabled while it is pending, the moving button shows a spinner, an `aria-live` status message is announced, and the lists are refetched once on settle | `website-content-reorder.test.tsx` (4 tests) |
| Tenant payment create/cancel/proof | `useCreatePayment`, `useCancelPayment`, `useSubmitPaymentProof` | `paymentKeys.lists(org)` + `detail` via `invalidateTenantPayments` | `usePaymentHistory` (`list(org, query)`), `usePaymentDetails` | Trailing-`undefined` bug | Domain helper | `invalidation.test.ts`, `mutation-invalidation.test.tsx` |
| Provisioning create/cancel/retry | `useCreateProvisioningRequest`, `useCancelProvisioning`, `useRetryProvisioning` | `provisioningKeys.lists(org)` + `detail` | `useProvisioningRequests`, `useProvisioningRequest` | Create: trailing `undefined`. Cancel/retry: refreshed only the detail, so the list status stayed stale | `invalidateProvisioning` | `invalidation.test.ts`, `mutation-invalidation.test.tsx` |
| Provisioning reaches `ready` (poll) | `useProvisioningRequest` effect | + `dashboardOverviewKeys.overviews()`, `provisioningKeys.lists(org)` | Dashboard academy count, request list | Only academies and usage were refreshed | Added the dashboard and the list | (covered by helper tests) |
| Course create/edit/delete/publish/unpublish | `useCreateCourse`, `useUpdateCourse`, `useDeleteCourse`, `usePublishCourse`, `useUnpublishCourse` | `invalidateCourseCatalog`: course lists/detail/categories of the academy, `dashboardOverviewKeys.overviews()`, academy stats, instructor `courses`/`course`/`dashboard`, `courseDiscoveryKeys.all`, public `courses`/`course`/`course-curriculum`/`statistics`/`categories` | Course list, detail, dashboard, academy overview, instructor courses, student catalog, public site | Single root (`courseKeys.all`) missed the cross-domain views | `useCourseCatalogInvalidation` + domain helper. Curriculum keys are intentionally untouched | `invalidation.test.ts`, `mutation-invalidation.test.tsx` |
| Course instructor assign/remove | `useAssignCourseInstructor`, `useRemoveCourseInstructor` | `invalidateCourseCatalog(courseId)` | Course detail, instructor course list | `courseKeys.all` only, so the instructor's own view stayed stale | Same helper | (helper tests) |
| Branding (academy settings) | `useUpdateAcademyBranding` | `invalidateBranding`: academy lists/detail/activity, `publicWebsiteKeys.identity/configuration`, `websiteKeys.configuration` | Switcher, sidebar, LMS/public logo (`useAcademyIdentity`, 5 min staleTime) | Missed the identity read, so the logo stayed stale for up to 5 min | Domain helper (narrowed from `academyKeys.all`) | `invalidation.test.ts`, `mutation-invalidation.test.tsx` |
| Visual identity (website) | `useSaveVisualIdentity` | Same as branding (+ `setQueryData` of the configuration) | Same | Same | Same | `invalidation.test.ts` |
| Academy rename/settings | `useUpdateAcademy` | `academyKeys.all` + `publicWebsiteKeys.identity(id)` | LMS shell name | Name came from the identity read | Added identity | — |
| Academy delete | `useDeleteAcademy` | + `dashboardOverviewKeys.overviews()` | Dashboard academy count | Missed the dashboard | Added | — |
| Create student account | `useCreateAcademyStudent` | `invalidateRoster` (roster pages, stats, dashboard) | Roster, academy stats, dashboard | Invalidated nothing | Domain helper | `mutation-invalidation.test.tsx` |
| Roster block/unblock/approve/reject/enroll/revoke/expiry | `useAcademyStudentMutations` | `invalidateRoster` (+ the learner's detail) | Roster, drawer, stats, dashboard | Missed `academyKeys.stats` and the dashboard | Domain helper | `invalidation.test.ts` |
| Add manager/instructor | `useAddAcademyManager`, `useAddAcademyInstructor` | `academyKeys.all` + `dashboardOverviewKeys.overviews()` | Members, dashboard instructor count | Missed the dashboard | Added | — |
| Invites create/revoke | `useCreateAcademyInvite`, `useRevokeAcademyInvite` | `academyKeys.invites` | Invites list | OK (own mutations). Acceptance happens in the learner's browser | `useAcademyInvites` is now a live list | — |
| Plans create/edit/archive | `useCreatePlan`, `useUpdatePlan`, `useArchivePlan` | `invalidatePlans`: `planKeys.list`, `planKeys.detail(key)`, `platformPlanKeys.historyAll(key)`, `publicPlanKeys.all` | Plan catalog, plan history, public pricing (`usePublicPlans`) | Missed the detail and the inline `['public-plans','list']` | Moved both keys into the factory (same shape) and used the helper | `invalidation.test.ts`, `mutation-invalidation.test.tsx` |
| Trial policy | `useUpdateTrialPolicy` | `planKeys.trialPolicy()` | Trial policy | OK | — | — |
| Website publish/unpublish | `usePublishWebsite`, `useUnpublishWebsite` | + `invalidatePublicWebsiteSite` (public config/pages/page) | Live site preview in the same browser | Live-site reads were not refreshed | Added | `invalidation.test.ts` |
| Website page delete | `useDeleteWebsitePage` | + `websiteKeys.configuration` | Publish bar (pages with unpublished changes) | The count could include the deleted page | Added | — |
| Website page create/update/publish, reorder sections | `useCreate/Update/PublishWebsitePage`, `useReorderPageSections` | `allPages`, `page`, `configuration` | Pages, editor | OK (already used prefix keys) | — | — |
| Contact messages status | `useUpdateContactSubmissionStatus` | `allContactSubmissions` + summary | Messages list and counts | OK. New messages come from visitors | `useContactSubmissions`, `useContactSubmissionSummary` are now live lists | — |
| Support ticket (tenant) create/reply | `useCreateSupportCase`, `useReplyToMySupportCase`, `useSubmitSupportCase` (dashboard) | `invalidateSupportCases` (`supportKeys.all` + `tenantSupportCaseKeys.all`) | Support page list, dashboard ticket tracker | The two "my tickets" lists had separate roots and each mutation refreshed only one | Domain helper. Lists are live | `invalidation.test.ts` |
| Support (operator) reply/status | `usePostSupportCaseReply`, `useUpdateSupportCaseStatus` | `supportKeys.all` | Operator queue and detail | OK. Tenants open tickets | `useSupportCases` is now a live list | — |
| Enroll (free) | `useEnroll` | `enrollmentKeys.all` + `learnerKeys` `overview` branch | `/my` dashboard | `/my` overview was missed | Added (never the lesson-grant key) | — |
| Certificates revoke/regenerate/issue/template | `useCertificates.ts` hooks | `certificateKeys.all`, `completionKeys.all` / `template` | Certificates | OK | — | — |
| Reviews (learner/staff) | `useSubmitMyReview`, `useDeleteMyReview`, `useModerateReview`, `useRemoveReview` | `courseReviewKeys.all`, `publicWebsiteKeys.all` | Reviews, public rating | OK (broad but correct) | — | — |
| Notifications | `useMarkNotificationRead`, `useMarkAllNotificationsRead`, preferences | `notificationKeys.all` | Bell, list | OK. Already polls | — | — |
| Profile / preferences | `useUpdateProfile`, `useUpdatePreferences` | `refreshSession()` | Session user | OK | — | — |
| Communications settings | `useUpdateAcademyCommunicationSettings`, `usePlatformCommunicationSettings` | Optimistic update + exact key | Settings | OK | — | — |
| Live sessions | `useCreate/Update/PublishLiveSession`, Zoom actions | `forCourse`, `status` / `liveSessionKeys.all` | Sessions | OK | — | — |
| Media library | `useUploadMediaAsset`, `useUpdateMediaAsset`, `useArchiveMediaAsset(s)` | `mediaKeys.all` / `lists(academy)` | Media | OK | — | — |
| Tenant subscription | `useStartTrial`, `useCancelTrial`, `useCancelSubscription` | subscription, usage, lifecycle | Shell, subscription pages | OK | — | — |
| Dashboard overview / academy stats (others' activity) | n/a | n/a | `useDashboardOverview`, `useAcademyStats` | No push channel | Live lists (45 s, focus) | — |
| Roster (others register/accept invites) | n/a | n/a | `useAcademyStudents` | No push channel | Live list | — |
| Detail pages when the id changes | n/a | n/a | Every `useApiQuery` | The global `placeholderData: prev => prev` rendered the previous entity | Key-aware placeholder in `useApiQuery`. Global search keeps previous results for the same user only | `placeholder.test.tsx` (7 tests) |
| Course builder: sections/lessons/reorder/unit curriculum | `useCreate/Update/DeleteCourseLesson*`, `useReorder*`, `useUnitCurriculum*`, `useCourseSections*`, section hooks | (unchanged here) | Builder | **Owned by course-builder agent** | See recommendations | — |
| Course builder: quizzes/assignments | `useCreate/Update/DeleteQuiz`, `useCreate/Update/DeleteAssignment` | (unchanged here) | Builder | **Owned by course-builder agent** | See recommendations | — |
| Platform subscription payment review | `useApprovePayment`, `useRejectPayment`, `usePlatformPayments*` | (unchanged here) | Platform payment queue | **Owned by orders agent** | See recommendations | — |
| Platform course-order payments, payouts, commission | `src/features/platform-commerce/**` | (unchanged here) | Platform commerce queues | **Owned by orders agent** | See recommendations | — |

## Recommendations for other owners (not applied here)

**Orders agent**
- `usePlatformPayments` (subscription review queue) and the course-order payment list query in `platform-commerce/hooks/useCourseOrderPayments.ts`: spread `LIVE_LIST_QUERY_OPTIONS` from `@config`. Tenants submit proofs from their own browsers, and neither queue refreshes on its own.
- After approve/reject, consider also invalidating `platformMetricsKeys.commerce` prefix (`[...platformMetricsKeys.all, 'commerce']`) if the command center shows pending-approval counts.
- Any list invalidation of the form `X.list()` with an omitted trailing query now matches through `invalidateQueries`. A direct `queryClient.invalidateQueries({ queryKey: X.list() })` call still needs an explicit prefix.

**Course-builder agent**
- Curriculum mutations (lesson/section create/update/delete/reorder, quiz/assignment create/update/delete) should also invalidate `publicWebsiteKeys.courseCurriculum(academyId, courseId)` (the public course page's curriculum preview) and, for learner-visible changes, `[...learnerKeys.all, 'sequence']` and `[...courseContentKeys.all, 'sections']` for the course.
- If a curriculum change can alter course status or counts shown on the course list, call `invalidateCourseCatalog(queryClient, { academyId, courseId })` from `@services/query`.

## Residual risks

- Polling adds at most one request every 45 s per mounted live list while the tab is visible (dashboard, stats, roster, invites, messages, message summary, support lists).
- `academyTreeMatcher` matches academy-tree keys by academy id under any organization id. This is safe because an academy belongs to exactly one organization. Branding refreshes `['academy','list']` for every organization cached in the session, which in practice is only the active one.
- Queries whose key changes in a string element no longer keep previous data, so their loading state now shows. Free-text search keys that need the old behaviour must opt in, as `useGlobalSearch` does.
- Cross-browser freshness for screens not listed as live lists still depends on `staleTime` (60 s) plus remount or reconnect.
