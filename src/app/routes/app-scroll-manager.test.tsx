/**
 * Where the page lands after a navigation (Task 5): top on a new page,
 * untouched on a query-only change, the saved offset on Back/Forward, the
 * target on a hash — and a form swapped for its success card resets too.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, render } from '@testing-library/react';
import { createMemoryRouter, Outlet, RouterProvider } from 'react-router-dom';
import { useRef } from 'react';
import { AppScrollManager } from './AppScrollManager';
import { useResetScrollOnReveal } from '@hooks';

type MemoryRouter = ReturnType<typeof createMemoryRouter>;

let scrollY = 0;
let scrollHeight = 5000;
const scrollTo = vi.fn((options: ScrollToOptions | number) => {
  scrollY = typeof options === 'number' ? options : (options.top ?? 0);
});

beforeEach(() => {
  scrollY = 0;
  scrollHeight = 5000;
  scrollTo.mockClear();
  window.sessionStorage.clear();
  vi.stubGlobal('scrollTo', scrollTo);
  Object.defineProperty(window, 'scrollY', {
    configurable: true,
    get: () => scrollY,
  });
  Object.defineProperty(document.documentElement, 'scrollHeight', {
    configurable: true,
    get: () => scrollHeight,
  });
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation((cb) => {
    cb(performance.now());
    return 0;
  });
});

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function userScrollsTo(y: number) {
  scrollY = y;
  window.dispatchEvent(new Event('scroll'));
}

function renderAt(initial: string): MemoryRouter {
  const router = createMemoryRouter(
    [
      {
        path: '*',
        element: (
          <>
            <AppScrollManager />
            <Outlet />
          </>
        ),
        children: [
          { path: '*', element: <section id="reviews" tabIndex={-1} /> },
        ],
      },
    ],
    { initialEntries: [initial] }
  );
  render(<RouterProvider router={router} />);
  return router;
}

const lastTopOf = (call: ScrollToOptions | number | undefined) =>
  typeof call === 'number' ? call : call?.top;
const lastTop = () => lastTopOf(scrollTo.mock.calls.at(-1)?.[0]);

describe('AppScrollManager', () => {
  it('a new page opens at the top', async () => {
    const router = renderAt('/courses/new');
    userScrollsTo(937);
    await act(() => router.navigate('/courses/c1/builder'));
    expect(lastTop()).toBe(0);
  });

  it('a query-only change (tab, filter) keeps the scroll where it is', async () => {
    const router = renderAt('/members');
    userScrollsTo(400);
    scrollTo.mockClear();
    await act(() =>
      router.navigate('/members?tab=students', { replace: true })
    );
    expect(scrollTo).not.toHaveBeenCalled();
  });

  it('Back restores the previous page offset — not the reset to top', async () => {
    const router = renderAt('/courses');
    userScrollsTo(1200);
    await act(() => router.navigate('/courses/c1'));
    expect(lastTop()).toBe(0);
    userScrollsTo(80);
    await act(() => router.navigate(-1));
    expect(lastTop()).toBe(1200);
  });

  it('Back waits until the page is tall enough before restoring', async () => {
    const router = renderAt('/courses');
    userScrollsTo(3000);
    await act(() => router.navigate('/courses/c1'));
    // The previous page is still a few skeletons tall.
    scrollHeight = 900;
    let frames = 0;
    vi.mocked(window.requestAnimationFrame).mockImplementation((cb) => {
      frames += 1;
      if (frames === 3) scrollHeight = 5000; // content arrived
      cb(performance.now());
      return 0;
    });
    scrollTo.mockClear();
    await act(() => router.navigate(-1));
    expect(scrollTo).toHaveBeenCalledTimes(1);
    expect(lastTop()).toBe(3000);
  });

  it('a hash goes to its target and focuses it without a second scroll', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const router = renderAt('/courses/c1');
    await act(() => router.navigate('/courses/c1#reviews'));
    expect(scrollIntoView).toHaveBeenCalled();
    expect(document.activeElement?.id).toBe('reviews');
  });

  it('a fresh load never restores an offset saved under the shared "default" key', () => {
    // Every load without history state is POP with key 'default': an
    // offset saved by one such page (old or new format) must not land
    // another one — e.g. an OAuth return — mid-page.
    window.sessionStorage.setItem(
      'atlas:scroll-positions',
      JSON.stringify({ default: 1500, 'default:/settings': 1500 })
    );
    renderAt('/settings');
    expect(
      scrollTo.mock.calls.some(([options]) => lastTopOf(options) === 1500)
    ).toBe(false);
  });

  it('the first entry is remembered per URL, not under the shared "default" key', async () => {
    const router = renderAt('/courses');
    userScrollsTo(700);
    window.dispatchEvent(new Event('pagehide'));
    const stored = JSON.parse(
      window.sessionStorage.getItem('atlas:scroll-positions') ?? '{}'
    ) as Record<string, number>;
    expect(stored['default:/courses']).toBe(700);
    expect(stored).not.toHaveProperty('default');

    // …and Back to that entry still restores it.
    await act(() => router.navigate('/courses/c1'));
    await act(() => router.navigate(-1));
    expect(lastTop()).toBe(700);
  });

  it('a hash link to another page resets to the top even if the target never mounts', async () => {
    const router = renderAt('/courses');
    userScrollsTo(900);
    // The target is missing for the whole wait: frames never complete.
    vi.mocked(window.requestAnimationFrame).mockImplementation(() => 1);
    await act(() => router.navigate('/guide#missing'));
    expect(lastTop()).toBe(0);
  });

  it('Back to an entry with a hash restores its saved offset rather than jumping to the target', async () => {
    const scrollIntoView = vi.fn();
    Element.prototype.scrollIntoView = scrollIntoView;
    const router = renderAt('/courses');
    await act(() => router.navigate('/guide#reviews'));
    userScrollsTo(600);
    await act(() => router.navigate('/courses/c1'));
    scrollIntoView.mockClear();
    await act(() => router.navigate(-1));
    expect(lastTop()).toBe(600);
    expect(scrollIntoView).not.toHaveBeenCalled();
  });
});

describe('useResetScrollOnReveal', () => {
  function Swap({ done }: { done: boolean }) {
    const heading = useRef<HTMLHeadingElement>(null);
    useResetScrollOnReveal(done, heading);
    return done ? (
      <h3 ref={heading} tabIndex={-1}>
        Course created
      </h3>
    ) : (
      <form />
    );
  }

  it('the success view replacing a long form starts at the top, focused', () => {
    scrollY = 937;
    const { rerender, getByText } = render(<Swap done={false} />);
    expect(scrollTo).not.toHaveBeenCalled();
    rerender(<Swap done />);
    expect(lastTop()).toBe(0);
    expect(document.activeElement).toBe(getByText('Course created'));
  });
});
