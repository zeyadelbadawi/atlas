/**
 * Course Instructors Card.
 *
 * Phase 3 (Instructor <-> Course Assignment) — the UI for the one write
 * path the Teaching Dashboard, "My Courses", and quiz/assignment grading
 * were already built to consume. Lives on the Course Edit page.
 *
 * CORE RULE this card exists to make visible, not just enforce: Academy
 * instructor-roster membership (`AcademyMember` role `instructor`,
 * granted via "Add Instructor" on the Academy Members page) is NOT the
 * same thing as course access. The roster below lists every eligible
 * instructor in this academy; checking a name grants THIS course
 * specifically, and an academy instructor who is never checked here never
 * gains access to it — no matter how many other courses in the academy
 * they can already teach.
 */
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from '@/hooks/use-toast';
import { useAcademyMembers } from '@/features/academy/hooks';
import {
  useAssignCourseInstructor,
  useRemoveCourseInstructor,
} from '../hooks';
import type { Course } from '@types';

export interface CourseInstructorsCardProps {
  readonly academyId: string;
  readonly course: Course;
}

export function CourseInstructorsCard({
  academyId,
  course,
}: CourseInstructorsCardProps): JSX.Element {
  const { t } = useTranslation();
  const [pendingUserId, setPendingUserId] = useState<string | null>(null);

  const { data: membersData, isLoading } = useAcademyMembers(academyId, {
    query: { pagination: { page: 1, pageSize: 100 } },
  });
  const roster = (membersData?.items ?? []).filter(
    (member) => member.role === 'instructor' && member.status === 'active'
  );

  const assignedIds = new Set(course.instructors.map((instructor) => instructor.id));

  const { mutateAsync: assignInstructor } = useAssignCourseInstructor(academyId);
  const { mutateAsync: removeInstructor } = useRemoveCourseInstructor(academyId);

  const handleToggle = async (userId: string, checked: boolean) => {
    setPendingUserId(userId);
    try {
      if (checked) {
        await assignInstructor({ courseId: course.id, payload: { userId } });
        toast({ title: t('course:instructors.assignSuccess') });
      } else {
        await removeInstructor({ courseId: course.id, userId });
        toast({ title: t('course:instructors.removeSuccess') });
      }
    } catch (error) {
      const apiError = error as { kind?: string; code?: string };
      const key =
        apiError.code === 'ENTITLEMENT_LIMIT_REACHED'
          ? 'course:instructors.errors.generic'
          : apiError.kind === 'conflict'
            ? 'course:instructors.errors.alreadyAssigned'
            : apiError.kind === 'notFound'
              ? 'course:instructors.errors.notEligible'
              : apiError.kind === 'forbidden'
                ? 'course:instructors.errors.insufficientRole'
                : 'course:instructors.errors.generic';
      toast({
        title: t(key),
        description: t('errors:generic'),
        variant: 'destructive',
      });
    } finally {
      setPendingUserId(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="size-4" strokeWidth={2} aria-hidden />
          {t('course:instructors.title')}
        </CardTitle>
        <CardDescription>{t('course:instructors.description')}</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-8 w-full" />
            <Skeleton className="h-8 w-full" />
          </div>
        ) : roster.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            {t('course:instructors.rosterEmpty')}
          </p>
        ) : (
          <ul className="space-y-3">
            {roster.map((member) => {
              const checked = assignedIds.has(member.userId);
              const isPending = pendingUserId === member.userId;
              return (
                <li key={member.userId} className="flex items-center gap-3">
                  <Checkbox
                    id={`course-instructor-${member.userId}`}
                    checked={checked}
                    disabled={isPending}
                    onCheckedChange={(value) =>
                      handleToggle(member.userId, value === true)
                    }
                  />
                  <Label
                    htmlFor={`course-instructor-${member.userId}`}
                    className="flex flex-1 flex-col cursor-pointer"
                  >
                    <span className="text-sm font-medium text-foreground">
                      {member.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {member.email}
                    </span>
                  </Label>
                  {isPending ? (
                    <Loader2 className="size-4 shrink-0 animate-spin text-muted-foreground" aria-hidden />
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
