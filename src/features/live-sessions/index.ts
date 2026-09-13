/**
 * Live Sessions add-on — public entry point.
 *
 * The Course Builder imports `LiveSessionCurriculumBlock` from here rather
 * than reaching into the feature's internals, matching the
 * `@features/<name>` barrel rule the rest of the codebase follows.
 */
export { LiveSessionCurriculumBlock } from './components/LiveSessionCurriculumBlock';
export { LiveSessionFormDialog } from './components/LiveSessionFormDialog';
export {
  useLiveSessionsStatus,
  useCourseLiveSessions,
  useSessionAttendance,
  useCreateLiveSession,
  useUpdateLiveSession,
} from './hooks/useLiveSessions';
export { liveSessionService } from './services/LiveSessionService';
export * from './utils/liveSession.utils';
