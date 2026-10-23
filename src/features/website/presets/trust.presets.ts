/**
 * Presets for the sections that build trust. Every testimonial here is a
 * SAMPLE (`sample: true`): labelled "Sample" in previews and never served
 * on the public site (the API strips it, the renderers filter it) until
 * the Owner replaces it or marks a real one — a starter testimonial is an
 * invented one.
 */
import type { SectionPreset } from './section-presets.types';
import { lt, newItemId } from './preset-content.utils';

export const TESTIMONIALS_PRESETS: readonly SectionPreset<'testimonials'>[] = [
  {
    type: 'testimonials',
    key: 'parents',
    build: () => ({
      config: {
        title: lt('What parents say', 'ماذا يقول أولياء الأمور'),
        items: [
          {
            id: newItemId(),
            sample: true,
            authorName: 'Mona H.',
            authorRole: lt(
              'Mother of a Grade 9 student',
              'والدة طالب في الصف الثالث الإعدادي'
            ),
            quote: lt(
              'My son finally asks questions in class, and his marks show it.',
              'أصبح ابني يسأل في الحصة أخيرًا، ودرجاته تشهد بذلك.'
            ),
          },
          {
            id: newItemId(),
            sample: true,
            authorName: 'Tarek S.',
            authorRole: lt(
              'Father of a secondary student',
              'والد طالبة في المرحلة الثانوية'
            ),
            quote: lt(
              'I always know how my daughter is doing before the exam, not after.',
              'أعرف مستوى ابنتي قبل الامتحان دائمًا، لا بعده.'
            ),
          },
          {
            id: newItemId(),
            sample: true,
            authorName: 'Heba A.',
            authorRole: lt('Mother of two students', 'والدة طالبين'),
            quote: lt(
              'Clear explanations and a calm place to learn.',
              'شرح واضح ومكان هادئ للتعلّم.'
            ),
          },
        ],
      },
      design: { background: 'soft', align: 'center' },
    }),
  },
  {
    type: 'testimonials',
    key: 'students',
    build: () => ({
      config: {
        title: lt('From our students', 'من طلابنا'),
        items: [
          {
            id: newItemId(),
            sample: true,
            authorName: 'Karim M.',
            authorRole: lt(
              'Third secondary student',
              'طالب في الصف الثالث الثانوي'
            ),
            quote: lt(
              'The revision sessions made the final exam feel familiar.',
              'جعلت حصص المراجعة الامتحان النهائي مألوفًا لي.'
            ),
            rating: 5,
          },
          {
            id: newItemId(),
            sample: true,
            authorName: 'Nour E.',
            authorRole: lt('Grade 9 student', 'طالبة في الصف الثالث الإعدادي'),
            quote: lt(
              'I can rewatch any lesson I did not understand the first time.',
              'أستطيع إعادة مشاهدة أي درس لم أفهمه من المرة الأولى.'
            ),
            rating: 5,
          },
          {
            id: newItemId(),
            sample: true,
            authorName: 'Youssef A.',
            authorRole: lt(
              'Second secondary student',
              'طالب في الصف الثاني الثانوي'
            ),
            quote: lt(
              'The weekly tests showed me exactly what to study.',
              'أوضحت لي الاختبارات الأسبوعية ما يجب أن أذاكره بالضبط.'
            ),
            rating: 4,
          },
        ],
      },
    }),
  },
];
