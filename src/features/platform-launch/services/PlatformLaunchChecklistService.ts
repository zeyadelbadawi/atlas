/**
 * B3 — the launch checklist (`platform-launch-checklist`). Toggling `done`
 * on the server stamps who and when; reorder sends the full id order.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  ChecklistItemWritePayload,
  LaunchChecklist,
  LaunchChecklistItem,
} from '../types';

export class PlatformLaunchChecklistService extends BaseService {
  protected readonly resource = 'platform-launch-checklist';

  async get(options?: ReadOptions): Promise<LaunchChecklist> {
    return this.client.get<LaunchChecklist>(this.path(), options);
  }

  async create(
    payload: ChecklistItemWritePayload,
    options?: WriteOptions
  ): Promise<LaunchChecklistItem> {
    return this.createOne<LaunchChecklistItem, ChecklistItemWritePayload>(
      payload,
      options
    );
  }

  async update(
    id: string,
    payload: ChecklistItemWritePayload & { readonly version: number },
    options?: WriteOptions
  ): Promise<LaunchChecklistItem> {
    return this.updateOne<
      LaunchChecklistItem,
      ChecklistItemWritePayload & { readonly version: number }
    >(id, payload, options);
  }

  async remove(id: string, options?: WriteOptions): Promise<void> {
    await this.deleteOne(id, options);
  }

  async reorder(
    ids: readonly string[],
    options?: WriteOptions
  ): Promise<LaunchChecklist> {
    return this.client.post<LaunchChecklist>(
      this.path('reorder'),
      { ids },
      options
    );
  }
}

export const platformLaunchChecklistService =
  new PlatformLaunchChecklistService();
