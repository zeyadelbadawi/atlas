/**
 * Announcements hooks — public entry point.
 */
export { useAnnouncementFeed } from './useAnnouncementFeed';
export type { UseAnnouncementFeedOptions } from './useAnnouncementFeed';
export { useAnnouncement } from './useAnnouncement';
export type { UseAnnouncementOptions } from './useAnnouncement';
export { useCourseAnnouncements } from './useCourseAnnouncements';
export type { UseCourseAnnouncementsOptions } from './useCourseAnnouncements';
export { useCreateAnnouncement } from './useCreateAnnouncement';
export { useUpdateAnnouncement } from './useUpdateAnnouncement';
export type { UpdateAnnouncementVariables } from './useUpdateAnnouncement';
export { usePublishAnnouncement } from './usePublishAnnouncement';
export { useArchiveAnnouncement } from './useArchiveAnnouncement';

/** Academy-wide authoring — the course hooks' twins. See that module's doc comment. */
export {
  useAcademyAnnouncements,
  useCreateAcademyAnnouncement,
  useUpdateAcademyAnnouncement,
  usePublishAcademyAnnouncement,
  useArchiveAcademyAnnouncement,
} from './useAcademyAnnouncements';
