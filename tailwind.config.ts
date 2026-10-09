import type { Config } from 'tailwindcss';
import tailwindcssAnimate from 'tailwindcss-animate';
import tailwindcssAspectRatio from '@tailwindcss/aspect-ratio';
import tailwindcssTypography from '@tailwindcss/typography';

/**
 * Atlas Tailwind configuration.
 *
 * Every value below resolves to a CSS custom property declared in
 * `src/index.css`. Utilities therefore stay theme-aware (Light / Dark) and
 * direction-aware (LTR / RTL) without any component-level branching.
 */
export default {
  darkMode: ['class'],
  content: [
    './pages/**/*.{ts,tsx}',
    './components/**/*.{ts,tsx}',
    './app/**/*.{ts,tsx}',
    './src/**/*.{ts,tsx}',
  ],
  prefix: '',
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: '1rem',
        sm: '1.5rem',
        lg: '2rem',
      },
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      screens: {
        xs: '480px',
        '3xl': '1800px',
      },
      fontFamily: {
        sans: ['var(--font-sans)'],
        display: ['var(--font-display)'],
        mono: ['var(--font-mono)'],
      },
      colors: {
        border: 'hsl(var(--border))',
        'border-strong': 'hsl(var(--border-strong))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        brand: {
          50: 'hsl(var(--brand-50))',
          100: 'hsl(var(--brand-100))',
          200: 'hsl(var(--brand-200))',
          300: 'hsl(var(--brand-300))',
          400: 'hsl(var(--brand-400))',
          500: 'hsl(var(--brand-500))',
          600: 'hsl(var(--brand-600))',
          700: 'hsl(var(--brand-700))',
          800: 'hsl(var(--brand-800))',
          900: 'hsl(var(--brand-900))',
        },
        surface: {
          DEFAULT: 'hsl(var(--surface))',
          foreground: 'hsl(var(--surface-foreground))',
          raised: 'hsl(var(--surface-raised))',
          overlay: 'hsl(var(--surface-overlay))',
        },
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
          hover: 'hsl(var(--primary-hover))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
          surface: 'hsl(var(--destructive-surface))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
          surface: 'hsl(var(--success-surface))',
        },
        warning: {
          DEFAULT: 'hsl(var(--warning))',
          foreground: 'hsl(var(--warning-foreground))',
          surface: 'hsl(var(--warning-surface))',
        },
        info: {
          DEFAULT: 'hsl(var(--info))',
          foreground: 'hsl(var(--info-foreground))',
          surface: 'hsl(var(--info-surface))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        chart: {
          1: 'hsl(var(--chart-1))',
          2: 'hsl(var(--chart-2))',
          3: 'hsl(var(--chart-3))',
          4: 'hsl(var(--chart-4))',
          5: 'hsl(var(--chart-5))',
          6: 'hsl(var(--chart-6))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar-background))',
          foreground: 'hsl(var(--sidebar-foreground))',
          primary: 'hsl(var(--sidebar-primary))',
          'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
          accent: 'hsl(var(--sidebar-accent))',
          'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
          border: 'hsl(var(--sidebar-border))',
          ring: 'hsl(var(--sidebar-ring))',
        },
      },
      borderRadius: {
        xs: 'var(--radius-xs)',
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        '2xl': 'var(--radius-2xl)',
        pill: 'var(--radius-pill)',
      },
      boxShadow: {
        xs: 'var(--shadow-xs)',
        sm: 'var(--shadow-sm)',
        DEFAULT: 'var(--shadow-sm)',
        md: 'var(--shadow-md)',
        lg: 'var(--shadow-lg)',
        overlay: 'var(--shadow-overlay)',
      },
      spacing: {
        'layout-header': 'var(--layout-header-height)',
        'layout-sidebar': 'var(--layout-sidebar-width)',
        'layout-sidebar-collapsed': 'var(--layout-sidebar-collapsed-width)',
      },
      maxWidth: {
        content: 'var(--layout-content-max-width)',
        marketing: 'var(--layout-marketing-max-width)',
      },
      transitionDuration: {
        instant: 'var(--duration-instant)',
        fast: 'var(--duration-fast)',
        normal: 'var(--duration-normal)',
        slow: 'var(--duration-slow)',
        deliberate: 'var(--duration-deliberate)',
      },
      transitionTimingFunction: {
        standard: 'var(--ease-standard)',
        entrance: 'var(--ease-entrance)',
        exit: 'var(--ease-exit)',
      },
      keyframes: {
        /*
          A stripe that travels across the track, for the stage of an upload
          that genuinely cannot be measured (the server validating and
          storing the file). It says "working" without claiming a position,
          which a bar creeping toward 99% would.

          Written in logical terms so it travels the reading direction in
          both LTR and RTL rather than always left-to-right.
        */
        'progress-indeterminate': {
          from: { insetInlineStart: '-40%' },
          to: { insetInlineStart: '100%' },
        },
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'rise-in': {
          from: { opacity: '0', transform: 'translateY(0.5rem)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        /*
          The per-viewer watermark's slow drift between anchor positions
          (P64 Phase 2 §E.3). A mark fixed in one corner is cropped out in
          seconds; a mark that visits four regions of the frame means a
          crop that removes it also removes part of the picture for part
          of the time.

          Deliberately slow and deliberately subtle — it is a deterrent
          aimed at casual re-sharing, not an obstruction of the lesson the
          learner paid for. `WatermarkOverlay` stands it down entirely
          under `prefers-reduced-motion`.

          Positioned rather than translated, and in LOGICAL properties:
          the percentages resolve against the overlay box (which is
          `inset-0` of the video frame, so they scale with the player at
          any size), and `inset-inline-start` puts the mark on the
          reading-side edge in Arabic exactly as it does in English. A
          `translate` in `vw`/`vh` would have been measured against the
          viewport instead of the player, and would have drifted the mark
          clean out of a small embedded frame.
        */
        'watermark-drift': {
          '0%, 100%': { top: '12%', insetInlineStart: '8%' },
          '25%': { top: '14%', insetInlineStart: '62%' },
          '50%': { top: '76%', insetInlineStart: '58%' },
          '75%': { top: '72%', insetInlineStart: '6%' },
        },
        /*
          The forensic watermark's full-frame tile (`ForensicWatermarkFrame`)
          drifting by exactly one tile, so the loop is seamless. Ninety
          seconds a lap: movement a recording cannot freeze-frame away,
          too slow to notice while learning. Stood down under
          `prefers-reduced-motion` by the component.
        */
        'watermark-pattern-drift': {
          from: { backgroundPosition: '0 0' },
          to: { backgroundPosition: '280px 160px' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down var(--duration-normal) var(--ease-standard)',
        'accordion-up': 'accordion-up var(--duration-normal) var(--ease-standard)',
        'fade-in': 'fade-in var(--duration-normal) var(--ease-entrance)',
        'rise-in': 'rise-in var(--duration-slow) var(--ease-entrance)',
        shimmer: 'shimmer 1.6s infinite',
        'progress-indeterminate':
          'progress-indeterminate 1.4s var(--ease-standard) infinite',
        // Slow on purpose — see the keyframes' own comment.
        'watermark-drift': 'watermark-drift 40s linear infinite',
        'watermark-pattern-drift': 'watermark-pattern-drift 90s linear infinite',
      },
    },
  },
  plugins: [tailwindcssAnimate, tailwindcssAspectRatio, tailwindcssTypography],
} satisfies Config;