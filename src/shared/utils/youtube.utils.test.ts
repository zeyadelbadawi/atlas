import { describe, expect, it } from 'vitest';
import { buildYouTubeEmbedUrl, parseYouTubeVideoId } from './youtube.utils';

describe('youtube.utils', () => {
  it('parses every real YouTube URL shape to the same id', () => {
    for (const url of [
      'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      'https://youtu.be/dQw4w9WgXcQ?t=10',
      'https://m.youtube.com/watch?v=dQw4w9WgXcQ&list=x',
      'https://www.youtube.com/embed/dQw4w9WgXcQ',
      'https://www.youtube.com/shorts/dQw4w9WgXcQ',
    ]) {
      expect(parseYouTubeVideoId(url), url).toBe('dQw4w9WgXcQ');
    }
  });

  it('rejects look-alike hosts and malformed ids', () => {
    expect(
      parseYouTubeVideoId(
        'https://youtube.com.evil.example/watch?v=dQw4w9WgXcQ'
      )
    ).toBeNull();
    expect(
      parseYouTubeVideoId('https://www.youtube.com/watch?v=short')
    ).toBeNull();
    expect(parseYouTubeVideoId('not a url')).toBeNull();
  });

  it('builds the privacy-enhanced embed URL and carries a start offset', () => {
    expect(buildYouTubeEmbedUrl('dQw4w9WgXcQ')).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1'
    );
    expect(buildYouTubeEmbedUrl('dQw4w9WgXcQ', { startSeconds: 90 })).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1&start=90'
    );
    expect(buildYouTubeEmbedUrl('dQw4w9WgXcQ', { startSeconds: 0 })).toBe(
      'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1'
    );
  });

  it('never builds a URL from anything but an 11-character YouTube id', () => {
    expect(buildYouTubeEmbedUrl('<script>')).toBeNull();
    expect(buildYouTubeEmbedUrl('dQw4w9WgXcQ/../evil')).toBeNull();
    expect(buildYouTubeEmbedUrl('')).toBeNull();
  });
});
