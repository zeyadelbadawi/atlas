/**
 * Academy-wide announcements — the authoring page for an Organization
 * Owner or Manager.
 *
 * WHAT WAS MISSING. The backend has had `academies/:academyId/
 * announcements` since Phase 6, authorised against the caller's own
 * `academy_members` row (`owner`/`administrator`/`manager`), and the
 * organization permission set has carried `announcement.manage` for owners
 * and managers for just as long. The frontend implemented only the
 * COURSE-scoped tree, so both roles held a real permission against a real
 * endpoint with no way to reach it: the announcements screen was a
 * read-only feed with no create control anywhere. That is the missing
 * button — not a hidden one, an unbuilt one.
 *
 * Instructors deliberately do NOT get this. They hold `announcement.view`
 * and not `announcement.manage`, and the backend's academy routes reject
 * their membership role. Course announcements remain theirs, on the course
 * page, which is the scope their role actually covers.
 */
import { useState } from 'react';
import { useParams } from 'react-router-dom';
import { PageContainer, PageHeader } from '@components/layout';
import { usePermissions } from '@hooks';
import {
  AnnouncementManagerPanel,
  AnnouncementCreateButton,
} from '../components/AnnouncementManagerPanel';
import {
  useAcademyAnnouncements,
  useCreateAcademyAnnouncement,
  useUpdateAcademyAnnouncement,
  usePublishAcademyAnnouncement,
  useArchiveAcademyAnnouncement,
} from '../hooks/useAcademyAnnouncements';

export default function AcademyAnnouncementsPage(): JSX.Element {
  const { academyId } = useParams<{ academyId: string }>();
  const { hasPermission } = usePermissions();

  // Gates the CONTROLS only. Every route below is independently authorised
  // server-side against the caller's real `academy_members` row.
  const canManage = hasPermission('announcement.manage');

  const [isCreateOpen, setCreateOpen] = useState(false);

  const { data, isLoading, error, refetch } = useAcademyAnnouncements(
    academyId ?? ''
  );

  const {
    mutateAsync: createAnnouncement,
    isPending: isCreating,
    error: createError,
  } = useCreateAcademyAnnouncement(academyId ?? '');
  const {
    mutateAsync: updateAnnouncement,
    isPending: isUpdating,
    error: updateError,
  } = useUpdateAcademyAnnouncement(academyId ?? '');
  const { mutateAsync: publishAnnouncement } = usePublishAcademyAnnouncement(
    academyId ?? ''
  );
  const { mutateAsync: archiveAnnouncement } = useArchiveAcademyAnnouncement(
    academyId ?? ''
  );

  return (
    <PageContainer>
      <PageHeader
        titleKey="announcements:academy.title"
        descriptionKey="announcements:academy.subtitle"
        actions={
          canManage ? (
            <AnnouncementCreateButton onClick={() => setCreateOpen(true)} />
          ) : undefined
        }
      />

      <AnnouncementManagerPanel
        announcements={data?.items ?? []}
        isLoading={isLoading}
        error={error}
        onRetry={() => refetch()}
        canManage={canManage}
        emptyTitleKey={
          canManage
            ? 'announcements:academy.empty'
            : 'announcements:academy.emptyReadOnly'
        }
        emptyDescriptionKey={
          canManage
            ? 'announcements:academy.emptyDescription'
            : 'announcements:academy.emptyReadOnlyDescription'
        }
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
