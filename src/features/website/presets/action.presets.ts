/**
 * Presets for the sections that ask the visitor to act: the closing band,
 * plans and prices, the deadline countdown, the interest form, the "Talk
 * to us" strip and Contact. Numbers only the Academy knows (WhatsApp, a
 * phone, a deadline, a price) start empty or bracketed: the public site
 * leaves an empty number's button and an empty deadline's countdown out
 * until the Owner fills them. See `section-presets.types.ts`.
 */
import type { SectionPreset } from './section-presets.types';
import {
  callButton,
  lt,
  newItemId,
  pageButton,
  ph,
  signUpButton,
  themePhoto,
  whatsappButton,
} from './preset-content.utils';

const REGISTER_NOW = lt('Register now', 'سجّل الآن');
const CHAT_ON_WHATSAPP = lt('Chat on WhatsApp', 'راسلنا على واتساب');

export const CTA_PRESETS: readonly SectionPreset<'cta'>[] = [
  {
    type: 'cta',
    key: 'register',
    build: (context) => ({
      config: {
        title: lt('Ready to start?', 'مستعد للبدء؟'),
        description: lt(
          'Create your account and choose your first course.',
          'أنشئ حسابك واختر دورتك الأولى.'
        ),
        cta: signUpButton(REGISTER_NOW),
        secondaryCta: pageButton(
          context,
          'courses',
          lt('Browse courses', 'تصفّح الدورات')
        ),
      },
    }),
  },
  {
    type: 'cta',
    key: 'whatsapp',
    build: () => ({
      config: {
        title: lt('Not sure which course fits?', 'لست متأكدًا أي دورة تناسبك؟'),
        description: lt(
          'Send us a message and tell us your grade. We will help you choose.',
          'أرسل إلينا رسالة واذكر صفّك الدراسي، وسنساعدك على الاختيار.'
        ),
        cta: whatsappButton(CHAT_ON_WHATSAPP),
        secondaryCta: callButton(lt('Call us', 'اتصل بنا')),
      },
    }),
  },
  {
    type: 'cta',
    key: 'photo',
    build: (context) => ({
      config: {
        title: lt('Your seat is waiting', 'مقعدك في انتظارك'),
        description: ph(
          'When the next groups start, and how to book',
          'موعد بدء المجموعات القادمة وطريقة الحجز'
        ),
        image: themePhoto(context, 'home-cta'),
        cta: signUpButton(lt('Book your seat', 'احجز مقعدك')),
      },
    }),
  },
];

export const PRICING_PRESETS: readonly SectionPreset<'pricing'>[] = [
  {
    type: 'pricing',
    key: 'monthlyTerm',
    build: () => {
      const feature = (en: string, ar: string, included = true) => ({
        id: newItemId(),
        text: lt(en, ar),
        included,
      });
      return {
        config: {
          title: lt('Plans and prices', 'الباقات والأسعار'),
          description: lt(
            'Choose how you would like to pay.',
            'اختر طريقة الاشتراك التي تناسبك.'
          ),
          plans: [
            {
              id: newItemId(),
              name: lt('Monthly', 'الباقة الشهرية'),
              price: ph('Price', 'السعر'),
              period: lt('per month', 'شهريًا'),
              features: [
                feature('Every lesson of the month', 'كل دروس الشهر'),
                feature('Monthly test', 'اختبار شهري'),
                feature('Printed notes', 'مذكرات مطبوعة', false),
              ],
              cta: signUpButton(lt('Choose monthly', 'اختر الشهرية')),
            },
            {
              id: newItemId(),
              name: lt('Full term', 'باقة الترم'),
              price: ph('Price', 'السعر'),
              period: lt('per term', 'للترم'),
              features: [
                feature('Every lesson of the term', 'كل دروس الترم'),
                feature('Monthly test', 'اختبار شهري'),
                feature('Printed notes', 'مذكرات مطبوعة'),
              ],
              highlighted: true,
              cta: signUpButton(lt('Choose the term', 'اختر باقة الترم')),
            },
          ],
        },
        design: { align: 'center' },
      };
    },
  },
  {
    type: 'pricing',
    key: 'subjects',
    build: () => {
      const plan = (
        en: string,
        ar: string,
        detailEn: string,
        detailAr: string,
        highlighted = false
      ) => ({
        id: newItemId(),
        name: lt(en, ar),
        price: ph('Price', 'السعر'),
        period: lt('per month', 'شهريًا'),
        description: lt(detailEn, detailAr),
        features: [
          {
            id: newItemId(),
            text: ph('What the plan includes', 'ما تتضمّنه الباقة'),
            included: true,
          },
        ],
        ...(highlighted ? { highlighted: true } : {}),
        cta: signUpButton(REGISTER_NOW),
      });
      return {
        config: {
          title: lt('Choose your plan', 'اختر باقتك'),
          plans: [
            plan(
              'One subject',
              'مادة واحدة',
              'Study one subject of your choice.',
              'ادرس مادة واحدة تختارها.'
            ),
            plan(
              'Two subjects',
              'مادتان',
              'Combine two subjects.',
              'اجمع بين مادتين.',
              true
            ),
            plan(
              'Full grade',
              'الصف كاملًا',
              'Every subject of your grade.',
              'كل مواد صفّك الدراسي.'
            ),
          ],
        },
      };
    },
  },
  {
    type: 'pricing',
    key: 'single',
    build: () => ({
      config: {
        title: lt('Course fee', 'رسوم الدورة'),
        plans: [
          {
            id: newItemId(),
            name: ph('Course name', 'اسم الدورة'),
            price: ph('Price', 'السعر'),
            period: lt('for the whole course', 'للدورة كاملة'),
            description: ph('Who the course is for', 'لمن هذه الدورة'),
            features: [
              {
                id: newItemId(),
                text: ph('First thing included', 'أول ما تتضمّنه'),
                included: true,
              },
              {
                id: newItemId(),
                text: ph('Second thing included', 'ثاني ما تتضمّنه'),
                included: true,
              },
            ],
            cta: signUpButton(REGISTER_NOW),
          },
        ],
      },
      design: { align: 'center' },
    }),
  },
];

export const COUNTDOWN_PRESETS: readonly SectionPreset<'countdown'>[] = [
  {
    type: 'countdown',
    key: 'registration',
    build: () => ({
      config: {
        title: lt('Registration closes soon', 'التسجيل يُغلق قريبًا'),
        description: lt(
          'Book your seat before the deadline.',
          'احجز مقعدك قبل انتهاء الموعد.'
        ),
        deadline: '',
        endedMessage: lt(
          'Registration has closed. Message us to join the waiting list.',
          'أُغلق التسجيل. راسلنا للانضمام إلى قائمة الانتظار.'
        ),
        cta: signUpButton(lt('Book your seat', 'احجز مقعدك')),
      },
    }),
  },
  {
    type: 'countdown',
    key: 'offer',
    build: () => ({
      config: {
        title: ph('Your offer', 'العرض'),
        description: lt('The offer ends in:', 'ينتهي العرض خلال:'),
        deadline: '',
        endedMessage: lt(
          'This offer has ended. Ask us about the current prices.',
          'انتهى هذا العرض. اسألنا عن الأسعار الحالية.'
        ),
        cta: whatsappButton(lt('Ask about the offer', 'اسأل عن العرض')),
      },
      design: { spacing: 'compact' },
    }),
  },
];

export const INTEREST_FORM_PRESETS: readonly SectionPreset<'interestForm'>[] = [
  {
    type: 'interestForm',
    key: 'grades',
    build: () => ({
      config: {
        title: lt('Register your interest', 'سجّل اهتمامك'),
        description: lt(
          'Leave your name and number and we will call you about the new term.',
          'اترك اسمك ورقمك وسنتصل بك بخصوص الترم الجديد.'
        ),
        emailField: 'hidden',
        choiceField: 'required',
        choiceLabel: lt('Grade', 'الصف الدراسي'),
        options: [
          ['Grade 7', 'الصف الأول الإعدادي'],
          ['Grade 8', 'الصف الثاني الإعدادي'],
          ['Grade 9', 'الصف الثالث الإعدادي'],
          ['First secondary', 'الصف الأول الثانوي'],
          ['Second secondary', 'الصف الثاني الثانوي'],
          ['Third secondary', 'الصف الثالث الثانوي'],
        ].map(([en, ar]) => ({ id: newItemId(), label: lt(en, ar) })),
        messageField: 'hidden',
        submitLabel: lt('Send', 'أرسل'),
        successMessage: lt(
          'Thank you! We will call you soon.',
          'شكرًا لك! سنتصل بك قريبًا.'
        ),
      },
    }),
  },
  {
    type: 'interestForm',
    key: 'courses',
    build: () => ({
      config: {
        title: lt('Reserve a place', 'احجز مكانك'),
        description: lt(
          'Choose a course and we will contact you with the details.',
          'اختر دورة وسنتواصل معك بالتفاصيل.'
        ),
        emailField: 'optional',
        choiceField: 'required',
        choiceLabel: lt('Course', 'الدورة'),
        options: [1, 2, 3].map((n) => ({
          id: newItemId(),
          label: ph(`Course ${n}`, `الدورة ${n}`),
        })),
        messageField: 'optional',
        submitLabel: lt('Reserve', 'احجز'),
      },
      design: { width: 'wide' },
    }),
  },
  {
    type: 'interestForm',
    key: 'callback',
    build: () => ({
      config: {
        title: lt('Request a call back', 'اطلب أن نتصل بك'),
        description: lt(
          'Leave your number and tell us what you would like to ask.',
          'اترك رقمك وأخبرنا بما تودّ السؤال عنه.'
        ),
        emailField: 'hidden',
        choiceField: 'hidden',
        options: [],
        messageField: 'optional',
        submitLabel: lt('Call me', 'اتصلوا بي'),
      },
    }),
  },
];

export const WHATSAPP_BAR_PRESETS: readonly SectionPreset<'whatsappBar'>[] = [
  {
    type: 'whatsappBar',
    key: 'chat',
    build: () => ({
      config: {
        title: lt('Questions? Talk to us', 'لديك سؤال؟ تحدّث إلينا'),
        description: lt(
          'Ask us about courses, schedules and prices.',
          'اسألنا عن الدورات والمواعيد والأسعار.'
        ),
        cta: whatsappButton(CHAT_ON_WHATSAPP),
        secondaryCta: callButton(lt('Call us', 'اتصل بنا')),
      },
    }),
  },
  {
    type: 'whatsappBar',
    key: 'register',
    build: () => ({
      config: {
        title: lt('Ready to join?', 'مستعد للانضمام؟'),
        description: lt(
          'Register online, or message us first if you have a question.',
          'سجّل عبر الإنترنت، أو راسلنا أولًا إن كان لديك سؤال.'
        ),
        cta: signUpButton(REGISTER_NOW),
        secondaryCta: whatsappButton(CHAT_ON_WHATSAPP),
      },
      design: { align: 'center' },
    }),
  },
];

export const CONTACT_PRESETS: readonly SectionPreset<'contact'>[] = [
  {
    type: 'contact',
    key: 'form',
    // Email, phone and address stay empty: the section then shows the
    // Academy's own contact details, never typed ones.
    build: () => ({
      config: {
        title: lt('Contact us', 'تواصل معنا'),
        description: lt(
          'Send us a message and we will reply as soon as we can.',
          'أرسل إلينا رسالة وسنردّ عليك في أقرب وقت ممكن.'
        ),
        showForm: true,
      },
    }),
  },
  {
    type: 'contact',
    key: 'details',
    build: () => ({
      config: {
        title: lt('Where to find us', 'أين تجدنا'),
        description: lt(
          'Call us, email us or visit us.',
          'اتصل بنا أو راسلنا أو زُرنا.'
        ),
        showForm: false,
      },
      design: { background: 'soft' },
    }),
  },
];
