/**
 * Instructor Course Announcements Page.
 *
 * Lets an authorized instructor author, publish and archive announcements
 * scoped to one course. Every write goes through the course-scoped
 * `AnnouncementService` methods — an instructor can never create a
 * platform- or academy-wide announcement from here, because this page
 * hands the shared authoring panel only the course-bound mutations.
 *
 * The editor itself now lives in `AnnouncementManagerPanel`, shared with
 * the academy-wide page. See that component for why.
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageContainer, PageHeader } from '@components/layout';
import {
  AnnouncementManagerPanel,
  AnnouncementCreateButton,
} from '../components/AnnouncementManagerPanel';
import {
  useCourseAnnouncements,
  useCreateAnnouncement,
  useUpdateAnnouncement,
  usePublishAnnouncement,
  useArchiveAnnouncement,
} from '../hooks';

export default function InstructorAnnouncementsPage(): JSX.Element {
  const { courseId } = useParams<{ courseId: string }>();
  const [isCreateOpen, setCreateOpen] = useState(false);

  const { data, isLoading, error, refetch } = useCourseAnnouncements(
    courseId ?? '',
    { enabled: !!courseId }
  );

  const {
    mutateAsync: createAnnouncement,
    isPending: isCreating,
    error: createError,
  } = useCreateAnnouncement(courseId ?? '');
  const {
    mutateAsync: updateAnnouncement,
    isPending: isUpdating,
    error: updateError,
  } = useUpdateAnnouncement(courseId ?? '');
  const { mutateAsync: publishAnnouncement } = usePublishAnnouncement(
    courseId ?? ''
  );
  const { mutateAsync: archiveAnnouncement } = useArchiveAnnouncement(
    courseId ?? ''
  );

  return (
    <PageContainer>
      <PageHeader
        titleKey="announcements:manage.title"
        descriptionKey="announcements:manage.subtitle"
        actions={<AnnouncementCreateButton onClick={() => setCreateOpen(true)} />}
      />

      <AnnouncementManagerPanel
        announcements={data?.items ?? []}
        isLoading={isLoading}
        error={error}
        onRetry={() => refetch()}
        canManage
        emptyTitleKey="announcements:manage.empty"
        emptyDescriptionKey="announcements:manage.emptyDescription"
        onCreate={(payload) => createAnnouncement(payload)}
        onUpdate={(announcementId, payload) =>
          updateAnnouncement({ announcementId, payload })
        }
        onPublish={(announcementId) => publishAnnouncement(announcementId)}
        onArchive={(announcementId) => archiveAnnouncement(announcementId)}
        isSaving={isCreating || isUpdating}
        saveError={createError ?? updateError}
        isCreateOpen={isCreateOpen}
        onCreateOpenChange={setCreateOpen}
      />
    </PageContainer>
  );
}
