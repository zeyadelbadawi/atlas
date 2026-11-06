/**
 * Saving an assignment from its authoring dialog — shared by the course's
 * assignments page and the course wizard's Assessments step, so both
 * create the same payload and place a new assignment in its unit the same
 * way (`usePlaceAfterCreate`: create, then attach; see `useUnitPlacement`).
 *
 * Errors are rethrown for the caller: a failed create/update is shown
 * inside the dialog (on its field, or one alert with the real reason).
 * A failed placement is NOT an error here — the assignment exists and is
 * kept; the toast says where to add it.
 */
import { useTranslation } from 'react-i18next';
import { toast } from '@/hooks/use-toast';
import {
  useCreateAssignment,
  useUpdateAssignment,
  type AssignmentAuthoringFormData,
} from '@features/learning';
import type {
  Assignment,
  CourseSection,
  CreateAssignmentPayload,
} from '@types';
import { usePlaceAfterCreate } from './useUnitPlacement';

export function toAssignmentPayload(
  data: AssignmentAuthoringFormData
): CreateAssignmentPayload {
  return {
    title: data.title,
    description: data.description || undefined,
    instructions: data.instructions || undefined,
    status: data.status,
    dueAt: data.dueAt ? new Date(data.dueAt).toISOString() : undefined,
    allowResubmission: data.allowResubmission,
    latePolicy: data.latePolicy,
    requiredForCompletion: data.requiredForCompletion,
  };
}

export function useSaveAssignment(academyId: string, courseId: string) {
  const { t } = useTranslation();
  const createAssignment = useCreateAssignment(courseId);
  const updateAssignment = useUpdateAssignment(courseId);
  const placement = usePlaceAfterCreate(academyId, courseId);

  /** Creates the assignment, then places it in `unit` (when one is chosen). */
  const create = async (
    data: AssignmentAuthoringFormData,
    unit: CourseSection | null
  ): Promise<Assignment> => {
    const created = await createAssignment.mutateAsync(
      toAssignmentPayload(data)
    );
    // One message per outcome: "added to Unit 2", "saved but not added
    // to Unit 2 — add it from Curriculum", or plain "created".
    const placed = await placement.place('assignment', created.id, unit);
    if (placed === 'not-placed') {
      toast({ title: t('course:assignmentAuthoring.created') });
    }
    return created;
  };

  const update = async (
    assignmentId: string,
    data: AssignmentAuthoringFormData
  ): Promise<Assignment> => {
    const updated = await updateAssignment.mutateAsync({
      assignmentId,
      payload: toAssignmentPayload(data),
    });
    toast({ title: t('course:assignmentAuthoring.updated') });
    return updated;
  };

  return {
    create,
    update,
    isPending:
      createAssignment.isPending ||
      updateAssignment.isPending ||
      placement.isPending,
    createError: createAssignment.error,
    updateError: updateAssignment.error,
  };
}
