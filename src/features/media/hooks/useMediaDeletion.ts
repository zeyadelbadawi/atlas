/**
 * The whole delete flow in one place, shared by the Academy Media page and
 * the Media Library picker: confirm → request → outcome.
 *
 * The confirmation is the app's single destructive-confirm dialog
 * (`useConfirmDialog`) and distinguishes one file from many. Its copy
 * states what actually happens — the item leaves the library now, the
 * file is destroyed after 30 days, and media still in use is refused —
 * and never promises an immediate permanent deletion.
 *
 * Outcomes that need reading (a refusal, a partial bulk result) are kept
 * as state for an `aria-live` region; a clean single delete is a toast.
 */
import { useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { toast } from '@/hooks/use-toast';
import { useConfirmDialog } from '@app/providers';
import type { MediaAssetSummary, MediaUsage } from '@types';
import {
  useArchiveMediaAsset,
  useArchiveMediaAssets,
} from './useArchiveMediaAsset';
import { mediaDeleteErrorMessage } from '../utils/media-delete-copy';

/** The backend accepts at most this many ids per bulk request. */
export const MEDIA_BULK_DELETE_LIMIT = 50;

export interface RefusedMediaItem {
  readonly id: string;
  readonly fileName: string;
  readonly reason: 'inUse' | 'notFound';
  readonly usages: readonly MediaUsage[];
}

export type MediaDeletionOutcome =
  | {
      readonly kind: 'bulk';
      readonly deletedCount: number;
      readonly refused: readonly RefusedMediaItem[];
    }
  | { readonly kind: 'error'; readonly message: string };

export interface UseMediaDeletionResult {
  /** Confirms, then deletes one asset. Resolves true only when it was deleted. */
  readonly deleteOne: (asset: MediaAssetSummary) => Promise<boolean>;
  /** Confirms, then deletes many. Resolves the ids that were deleted. */
  readonly deleteMany: (
    assets: readonly MediaAssetSummary[]
  ) => Promise<readonly string[]>;
  readonly isDeleting: boolean;
  readonly outcome: MediaDeletionOutcome | null;
  readonly dismissOutcome: () => void;
}

export function useMediaDeletion(
  academyId: string | undefined
): UseMediaDeletionResult {
  const { t, i18n } = useTranslation();
  const { confirm } = useConfirmDialog();
  const archiveOne = useArchiveMediaAsset();
  const archiveMany = useArchiveMediaAssets();
  const [outcome, setOutcome] = useState<MediaDeletionOutcome | null>(null);

  const deleteOne = useCallback(
    async (asset: MediaAssetSummary): Promise<boolean> => {
      if (!academyId) return false;
      const confirmed = await confirm({
        titleKey: 'media:delete.confirmOne.title',
        descriptionKey: 'media:delete.confirmOne.description',
        confirmLabelKey: 'media:delete.confirmOne.confirmLabel',
        cancelLabelKey: 'media:delete.cancel',
        intent: 'destructive',
        values: { fileName: asset.fileName },
      });
      if (!confirmed) return false;

      setOutcome(null);
      try {
        await archiveOne.mutateAsync({ academyId, assetId: asset.id });
        toast({
          title: t('media:delete.successOne', { fileName: asset.fileName }),
        });
        return true;
      } catch (error) {
        setOutcome({
          kind: 'error',
          message: mediaDeleteErrorMessage(t, i18n, error, asset.fileName),
        });
        return false;
      }
    },
    [academyId, archiveOne, confirm, i18n, t]
  );

  const deleteMany = useCallback(
    async (
      assets: readonly MediaAssetSummary[]
    ): Promise<readonly string[]> => {
      if (!academyId || assets.length === 0) return [];
      const confirmed = await confirm({
        titleKey: 'media:delete.confirmMany.title',
        descriptionKey: 'media:delete.confirmMany.description',
        confirmLabelKey: 'media:delete.confirmMany.confirmLabel',
        cancelLabelKey: 'media:delete.cancel',
        intent: 'destructive',
        values: { count: assets.length },
      });
      if (!confirmed) return [];

      setOutcome(null);
      const names = new Map(assets.map((asset) => [asset.id, asset.fileName]));
      const ids = assets.map((asset) => asset.id);
      const archived: string[] = [];
      const refused: RefusedMediaItem[] = [];

      try {
        for (
          let start = 0;
          start < ids.length;
          start += MEDIA_BULK_DELETE_LIMIT
        ) {
          const result = await archiveMany.mutateAsync({
            academyId,
            assetIds: ids.slice(start, start + MEDIA_BULK_DELETE_LIMIT),
          });
          archived.push(...result.archived);
          refused.push(
            ...result.refused.map((item) => ({
              ...item,
              fileName: names.get(item.id) ?? item.id,
            }))
          );
        }
      } catch (error) {
        // A request-level failure (403, network) after an earlier chunk
        // succeeded still reports what was deleted.
        if (archived.length === 0) {
          setOutcome({
            kind: 'error',
            message: mediaDeleteErrorMessage(t, i18n, error, ''),
          });
          return [];
        }
      }

      setOutcome({ kind: 'bulk', deletedCount: archived.length, refused });
      return archived;
    },
    [academyId, archiveMany, confirm, i18n, t]
  );

  const dismissOutcome = useCallback(() => setOutcome(null), []);

  return {
    deleteOne,
    deleteMany,
    isDeleting: archiveOne.isPending || archiveMany.isPending,
    outcome,
    dismissOutcome,
  };
}
