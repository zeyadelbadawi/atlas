/**
 * The confirmation dialog returns keyboard focus to where it was when it
 * opened (it is opened by a call, not a trigger, so without this focus
 * fell to <body> — found by the J13 keyboard check).
 */
import { afterEach, describe, expect, it } from 'vitest';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { I18nextProvider } from 'react-i18next';
import { createI18nInstance } from '@/localization/i18n';
import { AtlasDialogProvider } from './DialogProvider';
import { useConfirmDialog } from './useConfirmDialog';

function Opener() {
  const { confirm } = useConfirmDialog();
  return (
    <button
      type="button"
      onClick={() =>
        void confirm({
          titleKey: 'learning:quiz.submitConfirm.title',
          descriptionKey: 'learning:quiz.submitConfirm.description',
          confirmLabelKey: 'learning:quiz.submitConfirm.confirmLabel',
          cancelLabelKey: 'learning:quiz.submitConfirm.cancelLabel',
        })
      }
    >
      Submit
    </button>
  );
}

afterEach(cleanup);

describe('confirm dialog focus', () => {
  it.each([
    ['Escape', async () => userEvent.keyboard('{Escape}')],
    [
      'Cancel',
      async () =>
        userEvent.click(screen.getByRole('button', { name: 'Keep answering' })),
    ],
  ])('closing with %s returns focus to the opener', async (_how, close) => {
    render(
      <I18nextProvider i18n={createI18nInstance('en')}>
        <AtlasDialogProvider>
          <Opener />
        </AtlasDialogProvider>
      </I18nextProvider>
    );
    const opener = screen.getByRole('button', { name: 'Submit' });
    opener.focus();
    await userEvent.keyboard('{Enter}');
    await screen.findByRole('alertdialog');
    await close();
    await waitFor(() => expect(screen.queryByRole('alertdialog')).toBeNull());
    expect(document.activeElement).toBe(opener);
  });
});
