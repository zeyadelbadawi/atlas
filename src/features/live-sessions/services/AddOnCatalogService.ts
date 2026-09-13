/**
 * Add-on catalog + lifecycle client (organization-scoped).
 *
 * Separate from `LiveSessionService` because the two answer different
 * questions at different scopes: an add-on is bought and entitled at the
 * ORGANIZATION level, while sessions and the provider connection are
 * ACADEMY-level. Collapsing them would blur exactly the distinction the
 * add-on model exists to make.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type { AddOnAccessState, AddOnCatalogEntry } from '@types';

export class AddOnCatalogService extends BaseService {
  protected readonly resource = 'organizations';

  async getCatalog(
    organizationId: string,
    options?: ReadOptions,
  ): Promise<readonly AddOnCatalogEntry[]> {
    return this.client.get<readonly AddOnCatalogEntry[]>(
      this.path(organizationId, 'add-ons', 'catalog'),
      options,
    );
  }

  /**
   * One lifecycle transition.
   *
   * `confirm: true` is required by the backend contract — not a security
   * control, but it means no stray retry or prefetch can install or
   * uninstall a paid capability.
   */
  async transition(
    organizationId: string,
    addOnKey: string,
    action: 'install' | 'enable' | 'disable' | 'uninstall',
    options?: WriteOptions,
  ): Promise<AddOnAccessState> {
    return this.client.post<AddOnAccessState, { confirm: true }>(
      this.path(organizationId, 'add-ons', addOnKey, action),
      { confirm: true },
      options,
    );
  }
}

export const addOnCatalogService = new AddOnCatalogService();
