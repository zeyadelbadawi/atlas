/**
 * Unsaved-changes protection — public entry point.
 */
export {
  UnsavedChangesProvider,
  useUnsavedChangesRegistry,
} from './UnsavedChangesProvider';
export type { DirtyFormHandlers } from './UnsavedChangesProvider';
export { NavigationBlockDialog } from './NavigationBlockDialog';
export { useDirtyGuard } from './useDirtyGuard';
