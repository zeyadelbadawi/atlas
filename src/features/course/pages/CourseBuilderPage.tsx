/**
 * Course Builder Page.
 *
 * Visualizes and manages a course's curriculum. The editor itself —
 * sections (units), the unified ordered unit curriculum, reordering by
 * drag-and-drop or move buttons, create/edit/delete — is
 * `CourseCurriculumEditor` (W6), shared with the course wizard's
 * Curriculum step. This page adds the route chrome: breadcrumbs, the page
 * header carrying "Add section", and the course editor tabs. Only content
 * authoring is implemented here — student consumption of a course's
 * content is a separate module.
 */
import { useParams } from 'react-router-dom';
import { PageContainer, PageHeader } from '@components/layout';
import { SectionTabs } from '@components/navigation';
import { DASHBOARD_ROUTES, buildPath } from '@app/routes/route-paths';
import type { BreadcrumbItem } from '@types';
import { useCourse } from '../hooks';
import { CourseCurriculumEditor } from '../components/CourseCurriculumEditor';
import { getCourseEditorTabs } from '../utils/course-navigation.utils';

export default function CourseBuilderPage(): JSX.Element {
  const { academyId, courseId } = useParams<{
    academyId: string;
    courseId: string;
  }>();

  const { data: course } = useCourse(academyId ?? '', courseId ?? '');

  // The middle crumb (the course's own name) only joins the trail once the
  // course has loaded — before that, "Courses -> Course Builder" is still
  // a complete, honest trail rather than a placeholder label.
  const breadcrumbs: readonly BreadcrumbItem[] = [
    {
      labelKey: 'course:list.title',
      path: buildPath(DASHBOARD_ROUTES.academyCourses, {
        academyId: academyId ?? '',
      }),
    },
    ...(course
      ? [
          {
            labelKey: 'course:builder.title',
            label: course.title,
            path: buildPath(DASHBOARD_ROUTES.academyCourseDetail, {
              academyId: academyId ?? '',
              courseId: courseId ?? '',
            }),
          } satisfies BreadcrumbItem,
        ]
      : []),
    { labelKey: 'course:builder.title' },
  ];

  return (
    <PageContainer>
      <CourseCurriculumEditor
        academyId={academyId ?? ''}
        courseId={courseId ?? ''}
        renderHeader={({ addSectionButton }) =>
          addSectionButton ? (
            <>
              <PageHeader
                title={course?.title}
                titleKey="course:builder.title"
                descriptionKey="course:builder.subtitle"
                breadcrumbs={breadcrumbs}
                actions={addSectionButton}
              />
              {academyId && courseId ? (
                <SectionTabs items={getCourseEditorTabs(academyId, courseId)} />
              ) : null}
            </>
          ) : (
            <PageHeader
              titleKey="course:builder.title"
              descriptionKey="course:builder.subtitle"
              breadcrumbs={breadcrumbs}
            />
          )
        }
      />
    </PageContainer>
  );
}
