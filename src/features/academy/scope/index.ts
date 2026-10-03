/**
 * The academy scope (W5) — URL-derived active academy, membership check,
 * switch lifecycle.
 */
export { AcademyScopeProvider } from './AcademyScopeProvider';
export type {
  AcademyScopeLocationState,
  AcademyScopeProviderProps,
} from './AcademyScopeProvider';
export { useAcademyScope, AcademyScopeContext } from './academy-scope.context';
export type {
  AcademyAccessLostState,
  AcademyScopeValue,
} from './academy-scope.context';
export {
  ACADEMY_SCOPE_PATTERN,
  academyIdFromPath,
  switchTargetPath,
} from './academy-scope-path';
export {
  readLastAcademy,
  writeLastAcademy,
  clearLastAcademy,
} from './last-academy';
export { useAcademySwitchPhase } from './useAcademySwitchPhase';
