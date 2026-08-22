/**
 * Blog Service.
 *
 * A flat `blog-posts` resource. Ownership (platform vs. academy) and
 * visibility (draft vs. published) are resolved server-side from the
 * authenticated session and the post's own `academyId` — the frontend
 * never asks for "another academy's drafts" because it never has a way to
 * address them.
 */
import { BaseService } from '@services';
import type { ReadOptions, WriteOptions } from '@services';
import type {
  BlogPost,
  CollectionQuery,
  CreateBlogPostPayload,
  PaginatedResult,
  UpdateBlogPostPayload,
} from '@types';

export class BlogService extends BaseService {
  protected readonly resource = 'blog-posts';

  /** Retrieves the blog posts visible to the current user (published, plus their own drafts). */
  async getPosts(
    query?: CollectionQuery,
    options?: ReadOptions
  ): Promise<PaginatedResult<BlogPost>> {
    return this.fetchCollection<BlogPost>(query, options);
  }

  /** Retrieves a single post, if visible to the current user. */
  async getPost(id: string, options?: ReadOptions): Promise<BlogPost> {
    return this.fetchOne<BlogPost>(id, options);
  }

  /** Creates a post (starts as a draft), scoped to the author's own context. */
  async createPost(
    payload: CreateBlogPostPayload,
    options?: WriteOptions
  ): Promise<BlogPost> {
    return this.createOne<BlogPost, CreateBlogPostPayload>(payload, options);
  }

  /** Updates a post the current user owns. */
  async updatePost(
    id: string,
    payload: UpdateBlogPostPayload,
    options?: WriteOptions
  ): Promise<BlogPost> {
    return this.updateOne<BlogPost, UpdateBlogPostPayload>(id, payload, options);
  }

  /** Publishes a post the current user owns. */
  async publishPost(id: string, options?: WriteOptions): Promise<BlogPost> {
    return this.client.post<BlogPost, undefined>(
      this.path(id, 'publish'),
      undefined,
      options
    );
  }

  /** Archives a post the current user owns. */
  async archivePost(id: string, options?: WriteOptions): Promise<BlogPost> {
    return this.client.post<BlogPost, undefined>(
      this.path(id, 'archive'),
      undefined,
      options
    );
  }

  /** Deletes a post the current user owns. */
  async deletePost(id: string, options?: WriteOptions): Promise<void> {
    return this.deleteOne(id, options);
  }
}

/** Singleton instance following the Atlas service pattern. */
export const blogService = new BlogService();
