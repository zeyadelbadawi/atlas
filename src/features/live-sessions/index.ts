/**
 * Live Sessions add-on — public entry point.
 *
 * The Course Builder imports `LiveSessionCurriculumBlock` from here rather
 * than reaching into the feature's internals, matching the
 * `@features/<name>` barrel rule the rest of the codebase follows.
 */
export { LiveSessionCurriculumBlock } from './components/LiveSessionCurriculumBlock';
// The student's curriculum surface — imported by the learning feature's
// course page, which is why it belongs on the barrel rather than inside.
export { StudentLiveSessionList } from './components/StudentLiveSessionList';
export { LiveSessionFormDialog } from './components/LiveSessionFormDialog';
export {
  useLiveSessionsStatus,
  useCourseLiveSessions,
  useSessionAttendance,
  useCreateLiveSession,
  useUpdateLiveSession,
  usePublishLiveSession,
} from './hooks/useLiveSessions';
export {
  useStudentCourseLiveSessions,
  useLiveSessionEligibility,
} from './hooks/useStudentLiveSessions';
export { liveSessionService } from './services/LiveSessionService';
export { studentLiveSessionService } from './services/StudentLiveSessionService';
export * from './utils/liveSession.utils';
