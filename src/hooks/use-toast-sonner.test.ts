/**
 * B2 (UX audit) — the legacy `toast()` renders through the app's one sonner
 * toaster (below the header), not a second toaster in the bottom corner.
 */
import { describe, expect, it, vi } from 'vitest';

const sonner = vi.hoisted(() => {
  const fn = vi.fn(() => 'id-1') as ReturnType<typeof vi.fn> & {
    error: ReturnType<typeof vi.fn>;
    dismiss: ReturnType<typeof vi.fn>;
  };
  fn.error = vi.fn(() => 'id-2');
  fn.dismiss = vi.fn();
  return fn;
});
vi.mock('sonner', () => ({ toast: sonner }));

const { toast } = await import('./use-toast');

describe('legacy toast()', () => {
  it('sends an error to sonner as an error, with its description', () => {
    toast({ title: 'Failed', description: 'Why', variant: 'destructive' });
    expect(sonner.error).toHaveBeenCalledWith(
      'Failed',
      expect.objectContaining({ description: 'Why' })
    );
  });

  it('sends anything else as a plain toast and can dismiss it', () => {
    const handle = toast({ title: 'Saved' });
    expect(sonner).toHaveBeenCalledWith(
      'Saved',
      expect.objectContaining({ id: handle.id })
    );
    handle.dismiss();
    expect(sonner.dismiss).toHaveBeenCalledWith(handle.id);
  });

  it('useToast().dismiss(id) dismisses the sonner toast too', async () => {
    const { useToast } = await import('./use-toast');
    const { renderHook } = await import('@testing-library/react');
    const handle = toast({ title: 'Saved' });
    const { result } = renderHook(() => useToast());
    result.current.dismiss(handle.id);
    expect(sonner.dismiss).toHaveBeenCalledWith(handle.id);
  });
});
