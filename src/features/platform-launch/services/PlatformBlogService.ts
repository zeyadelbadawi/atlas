/**
 * B3 — the Platform Owner's blog API (`platform-blog-posts`,
 * `platform-blog-images`), PlatformOwnerGuard + RLS on the server. Every
 * write that changes a post sends the `version` it read; a stale one is a
 * 409 (`errors.blog.stale`) the editor explains instead of overwriting.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type { PaginatedResult } from '@types';
import type {
  BlogLocale,
  BlogPost,
  BlogPostListQuery,
  BlogPostWritePayload,
  PublicBlogPost,
  UpdateBlogPostPayload,
  UploadedImage,
} from '../types';

export class PlatformBlogService extends BaseService {
  protected readonly resource = 'platform-blog-posts';

  async list(
    query: BlogPostListQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<BlogPost>> {
    return this.fetchCollection<BlogPost>(
      {
        pagination: { page: query.page, pageSize: query.pageSize },
        ...(query.search ? { search: query.search } : {}),
        ...(query.sort
          ? {
              sort: {
                field: query.sort,
                direction: query.sort === 'title' ? 'asc' : 'desc',
              },
            }
          : {}),
        filters: {
          ...(query.status ? { status: query.status } : {}),
          ...(query.topic ? { topic: query.topic } : {}),
          ...(query.kind ? { kind: query.kind } : {}),
        },
      },
      options
    );
  }

  async get(id: string, options?: ReadOptions): Promise<BlogPost> {
    return this.fetchOne<BlogPost>(id, options);
  }

  async create(
    payload: BlogPostWritePayload,
    options?: WriteOptions
  ): Promise<BlogPost> {
    return this.createOne<BlogPost, BlogPostWritePayload>(payload, options);
  }

  async update(
    id: string,
    payload: UpdateBlogPostPayload,
    options?: WriteOptions
  ): Promise<BlogPost> {
    return this.updateOne<BlogPost, UpdateBlogPostPayload>(
      id,
      payload,
      options
    );
  }

  /** Absent or past `publishAt` publishes now; a future one schedules. */
  async publish(
    id: string,
    version: number,
    publishAt?: string,
    options?: WriteOptions
  ): Promise<BlogPost> {
    return this.client.post<BlogPost>(
      this.path(id, 'publish'),
      { version, ...(publishAt ? { publishAt } : {}) },
      options
    );
  }

  async unpublish(
    id: string,
    version: number,
    options?: WriteOptions
  ): Promise<BlogPost> {
    return this.client.post<BlogPost>(
      this.path(id, 'unpublish'),
      { version },
      options
    );
  }

  async archive(
    id: string,
    version: number,
    options?: WriteOptions
  ): Promise<BlogPost> {
    return this.client.post<BlogPost>(
      this.path(id, 'archive'),
      { version },
      options
    );
  }

  /** Only draft and archived posts can be deleted. */
  async remove(id: string, options?: WriteOptions): Promise<void> {
    await this.deleteOne(id, options);
  }

  /** The public detail shape for one locale, ignoring status (the dashboard preview). */
  async preview(
    id: string,
    locale: BlogLocale,
    options?: ReadOptions
  ): Promise<PublicBlogPost> {
    return this.client.get<PublicBlogPost>(this.path(id, 'preview'), {
      ...options,
      params: { locale },
    });
  }

  /** png/jpeg/webp ≤ 5 MB; stored as WebP, returned as a public URL. */
  async uploadImage(
    file: File,
    options?: WriteOptions
  ): Promise<UploadedImage> {
    const form = new FormData();
    form.append('file', file);
    return this.client.upload<UploadedImage>(
      'platform-blog-images',
      form,
      options
    );
  }
}

export const platformBlogService = new PlatformBlogService();
