import { describe, expect, it, vi } from 'vitest';

import { PublicMcpError } from '../src/errors.js';
import {
  assertMediaMatchesCategory,
  downloadChatGptMediaFile,
  type ChatGptFileReference,
  type FileFetchLike,
} from '../src/file-handoff.js';

const reference: ChatGptFileReference = {
  file_id: 'file-safe-1',
  download_url: 'https://files.oaiusercontent.com/file-safe-1?signature=temporary',
  name: 'waterpark.png',
  mime_type: 'image/png',
  size: 4,
};

describe('ChatGPT file handoff', () => {
  it('downloads a bounded file from the approved OpenAI file host without redirects', async () => {
    const fetchMock = vi.fn(async (_input: RequestInfo | URL, _init?: RequestInit) =>
      new Response(new Uint8Array([137, 80, 78, 71]), {
        status: 200,
        headers: { 'content-type': 'image/png', 'content-length': '4' },
      }),
    );

    const result = await downloadChatGptMediaFile(reference, fetchMock as FileFetchLike);

    expect(result).toMatchObject({ filename: 'waterpark.png', contentType: 'image/png', size: 4 });
    expect(fetchMock.mock.calls[0]?.[1]).toMatchObject({ redirect: 'error' });
  });

  it('rejects arbitrary download hosts before making a request', async () => {
    const fetchMock = vi.fn();

    await expect(
      downloadChatGptMediaFile(
        { ...reference, download_url: 'https://127.0.0.1/private-file' },
        fetchMock as FileFetchLike,
      ),
    ).rejects.toEqual(
      expect.objectContaining<Partial<PublicMcpError>>({ code: 'untrusted_media_source', status: 422 }),
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects oversized, redirected, and MIME-mismatched handoffs', async () => {
    await expect(
      downloadChatGptMediaFile({ ...reference, size: 60 * 1024 * 1024 }, vi.fn() as FileFetchLike),
    ).rejects.toEqual(expect.objectContaining<Partial<PublicMcpError>>({ code: 'media_file_too_large' }));

    const redirectMock = vi.fn(async () => new Response(null, { status: 302, headers: { location: 'https://example.com' } }));
    await expect(downloadChatGptMediaFile(reference, redirectMock as FileFetchLike)).rejects.toEqual(
      expect.objectContaining<Partial<PublicMcpError>>({ code: 'media_download_failed' }),
    );

    const mismatchMock = vi.fn(async () =>
      new Response(new Uint8Array([1, 2, 3, 4]), {
        status: 200,
        headers: { 'content-type': 'video/mp4', 'content-length': '4' },
      }),
    );
    await expect(downloadChatGptMediaFile(reference, mismatchMock as FileFetchLike)).rejects.toEqual(
      expect.objectContaining<Partial<PublicMcpError>>({ code: 'media_type_mismatch' }),
    );
  });

  it('requires media to match the selected post category', () => {
    expect(() => assertMediaMatchesCategory('image_pdf', 'image/png')).not.toThrow();
    expect(() => assertMediaMatchesCategory('music', 'audio/mpeg')).not.toThrow();
    expect(() => assertMediaMatchesCategory('video', 'video/mp4')).not.toThrow();
    expect(() => assertMediaMatchesCategory('music', 'video/mp4')).toThrowError(
      expect.objectContaining<Partial<PublicMcpError>>({ code: 'media_category_mismatch' }),
    );
  });
});
