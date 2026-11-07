# Runtime dependencies (B0-SEC-12)

Every package in `dependencies` of `package.json`, why it is there, and where it is used. A package belongs in `dependencies` only if shipped code (the app bundle, the server-rendered pages, or the marketing/Help Center builds) imports it. Build and dev tools go in `devDependencies`.

**Rules**

- No version is pinned to `latest`.
- Adding a runtime package means adding a row here, in the same PR.
- The production server image installs only `dependencies` (`Dockerfile`, `pnpm install --prod`), so anything listed here ships to production.

Moved out on 7 Nov 2026:

- `@playwright/mcp`: nothing imported it.
- `@metagptx/vite-plugin-source-locator` and `@metagptx/web-sdk`: Vite plugins that run only in `vite serve`.

Also deleted then:

- The unreferenced `src/pages/AuthCallback.tsx` and `src/lib/api.ts`. They were the web SDK's only importers.
- Eleven UI-kit files that no screen imported: `AnimatedSection`, `calendar`, `carousel`, `context-menu`, `drawer`, `hover-card`, `menubar`, `navigation-menu`, `resizable`, `slider` and `sonner` under `src/components/ui/`.
- Nine packages that only those files used: `react-day-picker`, `vaul`, `react-resizable-panels`, `next-themes`, and `@radix-ui/react-context-menu`, `react-hover-card`, `react-menubar`, `react-navigation-menu`, `react-slider`.

| Package                                                    | Why                                                                                                                                 | Used in (example)                                            |
| ---------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| `react`, `react-dom`                                       | UI runtime                                                                                                                          | everywhere                                                   |
| `react-router-dom`                                         | Routing (dashboard, academy sites, SSR)                                                                                             | `src/App.tsx`                                                |
| `@tanstack/react-query`                                    | Server state and caching                                                                                                            | `src/App.tsx`                                                |
| `@tanstack/react-table`                                    | Data tables in the dashboards                                                                                                       | `src/features/academy/components/AcademyInvitesCard.tsx`     |
| `react-hook-form`, `@hookform/resolvers`, `zod`            | Forms and schema validation (Help Center content parsing too)                                                                       | `src/components/ui/form.tsx`, `src/docs/content/parse.ts`    |
| `i18next`, `react-i18next`                                 | English/Arabic localization                                                                                                         | `src/app/providers/localization/LocalizationProvider.tsx`    |
| `axios`                                                    | HTTP client for the Atlas API                                                                                                       | `src/services/api/http-client.ts`                            |
| `@radix-ui/react-*` (23 packages)                          | Accessible primitives behind `src/components/ui/*` (dialogs, menus, selects, tabs, tooltips, and so on); `react-direction` sets RTL | `src/components/ui/`                                         |
| `class-variance-authority`, `clsx`, `tailwind-merge`       | Class composition for the UI kit                                                                                                    | `src/lib/utils.ts`, `src/components/ui/alert.tsx`            |
| `tailwindcss-animate`                                      | Tailwind animation utilities (config plugin; the styles ship)                                                                       | `tailwind.config.ts`                                         |
| `lucide-react`                                             | Icons                                                                                                                               | everywhere                                                   |
| `sonner`                                                   | Toasts                                                                                                                              | `src/app/providers/toast/ToastProvider.tsx`                  |
| `cmdk`                                                     | Command palette / searchable pickers                                                                                                | `src/components/ui/command.tsx`                              |
| `input-otp`                                                | One-time-code inputs (sign-in, 2FA)                                                                                                 | `src/components/ui/input-otp.tsx`                            |
| `date-fns`                                                 | Date formatting                                                                                                                     | `src/shared/utils/date.utils.ts`                             |
| `libphonenumber-js`, `country-flag-icons`                  | Phone number input, validation, flags                                                                                               | `src/shared/components/phone/`                               |
| `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities` | Drag-and-drop curriculum ordering                                                                                                   | `src/features/course/components/UnitCurriculumSortable.tsx`  |
| `recharts`                                                 | Charts (analytics, observability, growth)                                                                                           | `src/components/ui/chart.tsx`                                |
| `embla-carousel-react`                                     | Carousels in the Modern Education academy theme                                                                                     | `src/features/website/modern-education/t1-live-sections.tsx` |
| `framer-motion`                                            | Motion presets of the design system. No screen uses them yet; remove the package if that stays true                                 | `src/design-system/motion/motion.presets.ts`                 |
| `hls.js`                                                   | Adaptive video playback for lessons                                                                                                 | `src/features/learner/hooks/useVideoSource.ts`               |
| `@zoom/meetingsdk`                                         | Embedded Zoom meetings (Live Sessions add-on, behind its launch flag)                                                               | `src/features/live-sessions/components/ZoomMeetingEmbed.tsx` |
| `markdown-to-jsx`                                          | Help Center article rendering                                                                                                       | `src/docs/render/markdown.tsx`                               |
| `yaml`                                                     | Help Center screenshot specs, read at build                                                                                         | `scripts/docs/lib/specs.mjs`                                 |
| `web-vitals`                                               | Real-user performance monitoring                                                                                                    | `src/lib/rum/rum.ts`                                         |
