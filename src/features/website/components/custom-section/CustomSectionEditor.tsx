/**
 * The custom section's layout and elements (CMS phase 3c, field kind
 * `customLayout`): choose one, two or three columns (and, for two, which
 * is wider), where shorter columns sit, then build each column from
 * elements. Named choices only — no pixels, no canvas, no dragging.
 *
 * - A layout change never loses an element: going to fewer columns moves
 *   the extra columns' elements to the end of the last one kept, and a
 *   polite status says so.
 * - One element is open at a time, across the columns.
 * - A problem shows under its field once the author has left that field
 *   (or after a refused Apply); a row says "Needs a fix" on the same rule,
 *   and after a refused Apply the first element with a problem opens so the
 *   field to fix is on screen. The form's summary lists every problem.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type {
  CustomColumn,
  CustomElement,
  CustomElementKind,
  CustomSectionLayout,
  CustomSectionRatio,
  CustomSectionVerticalAlign,
  WebsitePage,
} from '@types';
import {
  CUSTOM_SECTION_LAYOUTS,
  CUSTOM_SECTION_RATIOS,
  MAX_CUSTOM_ELEMENTS_PER_COLUMN,
} from '@/features/website/constants/website.constants';
import type { FieldErrorLookup } from '../SectionButtonsEditor';
import { ColumnsPicture, CustomChoiceGroup } from './CustomChoiceGroup';
import { CustomColumnEditor } from './CustomColumnEditor';
import {
  columnsForLayout,
  createCustomElement,
  customElementIssuePaths,
  duplicateCustomElement,
} from './custom-elements';

const LAYOUT_PICTURES: Record<CustomSectionLayout, readonly number[]> = {
  one: [1],
  two: [1, 1],
  three: [1, 1, 1],
};
const RATIO_PICTURES: Record<CustomSectionRatio, readonly number[]> = {
  equal: [1, 1],
  wideNarrow: [2, 1],
  narrowWide: [1, 2],
};

export function CustomSectionEditor({
  draft,
  onPatch,
  errorFor,
  revealErrors = false,
  pages,
  academyId,
}: {
  /** The section's config as typed. */
  readonly draft: Readonly<Record<string, unknown>>;
  readonly onPatch: (patch: Record<string, unknown>) => void;
  readonly errorFor: FieldErrorLookup;
  /** After a refused Apply: every problem shows, touched or not. */
  readonly revealErrors?: boolean;
  readonly pages: readonly WebsitePage[];
  readonly academyId: string;
}): JSX.Element {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'ar' ? 'ar' : 'en';
  const layout = (draft.layout as CustomSectionLayout | undefined) ?? 'one';
  const ratio = (draft.ratio as CustomSectionRatio | undefined) ?? 'equal';
  const verticalAlign =
    (draft.verticalAlign as CustomSectionVerticalAlign | undefined) ?? 'top';
  const columns = useMemo(
    () => (draft.columns as readonly CustomColumn[] | undefined) ?? [],
    [draft.columns]
  );
  const [openId, setOpenId] = useState<string | null>(null);
  const [status, setStatus] = useState('');
  // The fields the author has left (`data-field-path`), whose problems may show.
  const [touched, setTouched] = useState<ReadonlySet<string>>(new Set());

  const isTouched = (path: string) => {
    for (const field of touched) {
      if (path === field || path.startsWith(`${field}.`)) return true;
    }
    return false;
  };
  const gatedErrorFor: FieldErrorLookup = (path, labelKey, max) =>
    revealErrors || isTouched(path) ? errorFor(path, labelKey, max) : undefined;
  const hasIssue = (path: string) => !!errorFor(path, 'website:fields.title');
  const showIssues = (elementBase: string) =>
    revealErrors ||
    [...touched].some(
      (field) => field === elementBase || field.startsWith(`${elementBase}.`)
    );

  // After a refused Apply, open the first element with a problem.
  const firstIssueId = useMemo(() => {
    if (!revealErrors) return null;
    for (const [columnIndex, column] of columns.entries()) {
      for (const [index, element] of column.elements.entries()) {
        const base = `columns.${columnIndex}.elements.${index}`;
        if (customElementIssuePaths(element, base).some(hasIssue)) {
          return element.id;
        }
      }
    }
    return null;
    // `hasIssue` reads `errorFor`, which changes with every issue list.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [revealErrors, columns, errorFor]);
  // Once per refused Apply: as the author fixes the open element, the first
  // problem moves on, and following it would close what they are editing.
  const openedForReveal = useRef(false);
  useEffect(() => {
    if (!revealErrors) {
      openedForReveal.current = false;
      return;
    }
    if (openedForReveal.current || !firstIssueId) return;
    openedForReveal.current = true;
    setOpenId(firstIssueId);
  }, [revealErrors, firstIssueId]);

  const writeColumns = (next: CustomColumn[]) => onPatch({ columns: next });
  const writeColumn = (columnIndex: number, elements: CustomElement[]) =>
    writeColumns(
      columns.map((column, index) =>
        index === columnIndex ? { ...column, elements } : column
      )
    );

  const changeLayout = (next: CustomSectionLayout) => {
    const { columns: nextColumns, moved } = columnsForLayout(columns, next);
    const patch: Record<string, unknown> = {
      layout: next,
      columns: nextColumns,
    };
    // A ratio belongs to two columns.
    if (next !== 'two') patch.ratio = undefined;
    onPatch(patch);
    setStatus(
      moved > 0
        ? t('website:sectionEditors.custom.movedOnLayout', {
            count: moved,
            number: nextColumns.length,
          })
        : ''
    );
  };

  const add = (columnIndex: number, kind: CustomElementKind): string => {
    const element = createCustomElement(kind);
    writeColumn(columnIndex, [...columns[columnIndex]!.elements, element]);
    setOpenId(element.id);
    return element.id;
  };

  const duplicate = (columnIndex: number, index: number): string => {
    const elements = [...columns[columnIndex]!.elements];
    const copy = duplicateCustomElement(elements[index]!);
    elements.splice(index + 1, 0, copy);
    writeColumn(columnIndex, elements);
    setOpenId(copy.id);
    return copy.id;
  };

  const moveToColumn = (columnIndex: number, index: number, target: number) => {
    const element = columns[columnIndex]!.elements[index]!;
    writeColumns(
      columns.map((column, position) => {
        if (position === columnIndex) {
          return {
            ...column,
            elements: column.elements.filter((_, i) => i !== index),
          };
        }
        if (position === target) {
          return { ...column, elements: [...column.elements, element] };
        }
        return column;
      })
    );
    setStatus(
      t('website:sectionEditors.custom.movedToColumn', { number: target + 1 })
    );
  };

  return (
    <div
      className="space-y-5"
      data-testid="custom-section-editor"
      onBlur={(event) => {
        const field = (event.target as HTMLElement)
          .closest<HTMLElement>('[data-field-path]')
          ?.getAttribute('data-field-path');
        // Leaving a control inside the same field (English → Arabic) is
        // still leaving it: the field's problem may show from now on.
        if (field && !touched.has(field)) {
          setTouched((previous) => new Set(previous).add(field));
        }
      }}
    >
      <CustomChoiceGroup
        legendKey="website:sectionEditors.custom.layout"
        hintKey="website:sectionEditors.custom.layoutHint"
        value={layout}
        testId="custom-layout"
        choices={CUSTOM_SECTION_LAYOUTS.map((value) => ({
          value,
          labelKey: `website:sectionEditors.custom.layouts.${value}`,
          picture: <ColumnsPicture parts={LAYOUT_PICTURES[value]} />,
        }))}
        onChange={changeLayout}
      />
      {gatedErrorFor('columns', 'website:sectionEditors.custom.layout') ? (
        <p className="text-xs text-destructive" role="alert">
          {gatedErrorFor('columns', 'website:sectionEditors.custom.layout')}
        </p>
      ) : null}
      {layout === 'two' ? (
        <CustomChoiceGroup
          legendKey="website:sectionEditors.custom.ratio"
          hintKey="website:sectionEditors.custom.ratioHint"
          value={ratio}
          testId="custom-ratio"
          choices={CUSTOM_SECTION_RATIOS.map((value) => ({
            value,
            labelKey: `website:sectionEditors.custom.ratios.${value}`,
            picture: <ColumnsPicture parts={RATIO_PICTURES[value]} />,
          }))}
          onChange={(next) =>
            onPatch({ ratio: next === 'equal' ? undefined : next })
          }
        />
      ) : null}
      {layout !== 'one' ? (
        <CustomChoiceGroup
          legendKey="website:sectionEditors.custom.verticalAlign"
          hintKey="website:sectionEditors.custom.verticalAlignHint"
          value={verticalAlign}
          columns={2}
          choices={[
            {
              value: 'top',
              labelKey: 'website:sectionEditors.custom.verticalAligns.top',
            },
            {
              value: 'center',
              labelKey: 'website:sectionEditors.custom.verticalAligns.center',
            },
          ]}
          onChange={(next) =>
            onPatch({ verticalAlign: next === 'top' ? undefined : next })
          }
        />
      ) : null}

      <p
        role="status"
        className={status ? 'text-xs text-muted-foreground' : 'sr-only'}
      >
        {status}
      </p>

      <div className="space-y-4">
        {columns.map((column, columnIndex) => (
          <CustomColumnEditor
            key={column.id}
            column={column}
            columnIndex={columnIndex}
            columnCount={columns.length}
            openId={openId}
            onOpen={setOpenId}
            onChange={(elements) => writeColumn(columnIndex, elements)}
            onAdd={(kind) => add(columnIndex, kind)}
            onDuplicate={(index) => duplicate(columnIndex, index)}
            onMoveToColumn={(index, target) =>
              moveToColumn(columnIndex, index, target)
            }
            canReceive={(target) =>
              (columns[target]?.elements.length ?? 0) <
              MAX_CUSTOM_ELEMENTS_PER_COLUMN
            }
            errorFor={gatedErrorFor}
            hasIssue={hasIssue}
            showIssues={showIssues}
            pages={pages}
            academyId={academyId}
            locale={locale}
          />
        ))}
      </div>
    </div>
  );
}
