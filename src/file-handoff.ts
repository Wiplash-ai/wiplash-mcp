import { PublicMcpError } from './errors.js';

export interface ChatGptFileReference {
  file_id?: string;
  download_url: string;
  name: string;
  mime_type: string;
  size: number;
}

export interface DownloadedMediaFile {
  bytes: ArrayBuffer;
  filename: string;
  contentType: string;
  size: number;
}

export type FileFetchLike = typeof fetch;

export const MAX_CHATGPT_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_CHATGPT_MEDIA_BATCH_BYTES = 100 * 1024 * 1024;

const ALLOWED_CONTENT_TYPES = new Set([
  'application/pdf',
  'audio/aac',
  'audio/flac',
  'audio/m4a',
  'audio/mp3',
  'audio/mp4',
  'audio/mpeg',
  'audio/ogg',
  'audio/wav',
  'audio/webm',
  'audio/x-flac',
  'audio/x-m4a',
  'audio/x-wav',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-matroska',
]);

function normalizedContentType(value: string | null | undefined): string {
  return String(value ?? '').split(';', 1)[0]?.trim().toLocaleLowerCase() ?? '';
}

function canonicalContentType(value: string | null | undefined): string {
  const normalized = normalizedContentType(value);
  const aliases: Record<string, string> = {
    'audio/m4a': 'audio/mp4',
    'audio/mp3': 'audio/mpeg',
    'audio/x-flac': 'audio/flac',
    'audio/x-m4a': 'audio/mp4',
    'audio/x-wav': 'audio/wav',
  };
  return aliases[normalized] ?? normalized;
}

function isAllowedOpenAiFileHost(hostname: string): boolean {
  const normalized = hostname.toLocaleLowerCase().replace(/\.$/, '');
  return normalized === 'files.oaiusercontent.com' || normalized.endsWith('.oaiusercontent.com');
}

function safeFilename(value: string): string {
  const normalized = value.replaceAll('\\', '/').split('/').pop()?.trim() ?? '';
  if (!normalized || normalized === '.' || normalized === '..' || normalized.length > 180) {
    throw new PublicMcpError('invalid_media_file', 'The uploaded file name is not valid.', 422);
  }
  return normalized;
}

export function mediaTypeForContentType(contentType: string): 'image' | 'document' | 'audio' | 'video' {
  const normalized = normalizedContentType(contentType);
  if (normalized.startsWith('image/')) return 'image';
  if (normalized === 'application/pdf') return 'document';
  if (normalized.startsWith('audio/')) return 'audio';
  if (normalized.startsWith('video/')) return 'video';
  throw new PublicMcpError('unsupported_media_type', 'Use a supported image, PDF, audio, or video file.', 422);
}

export function assertMediaMatchesCategory(
  category: 'image_pdf' | 'music' | 'video',
  contentType: string,
): void {
  const mediaType = mediaTypeForContentType(contentType);
  const matches = category === 'image_pdf'
    ? mediaType === 'image' || mediaType === 'document'
    : category === 'music'
      ? mediaType === 'audio'
      : mediaType === 'video';
  if (!matches) {
    throw new PublicMcpError(
      'media_category_mismatch',
      `The selected file does not match the ${category} post category.`,
      422,
    );
  }
}

export async function downloadChatGptMediaFile(
  reference: ChatGptFileReference,
  fetchImpl: FileFetchLike = fetch,
  timeoutMs = 20_000,
): Promise<DownloadedMediaFile> {
  if (!Number.isSafeInteger(reference.size) || reference.size <= 0 || reference.size > MAX_CHATGPT_FILE_BYTES) {
    throw new PublicMcpError(
      'media_file_too_large',
      `Each uploaded file must be between 1 byte and ${MAX_CHATGPT_FILE_BYTES / (1024 * 1024)} MB.`,
      413,
    );
  }
  const contentType = normalizedContentType(reference.mime_type);
  if (!ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new PublicMcpError('unsupported_media_type', 'Use a supported image, PDF, audio, or video file.', 422);
  }
  const filename = safeFilename(reference.name);

  let url: URL;
  try {
    url = new URL(reference.download_url);
  } catch {
    throw new PublicMcpError('invalid_media_file', 'The ChatGPT file handoff URL is invalid.', 422);
  }
  if (
    url.protocol !== 'https:' ||
    !isAllowedOpenAiFileHost(url.hostname) ||
    url.username ||
    url.password ||
    (url.port && url.port !== '443')
  ) {
    throw new PublicMcpError(
      'untrusted_media_source',
      'Only temporary ChatGPT file handoff URLs from OpenAI file storage are accepted.',
      422,
    );
  }

  let response: Response;
  try {
    response = await fetchImpl(url, {
      method: 'GET',
      headers: { Accept: contentType },
      redirect: 'error',
      signal: AbortSignal.timeout(timeoutMs),
    });
  } catch {
    throw new PublicMcpError('media_download_failed', 'ChatGPT could not hand the uploaded file to Wiplash.', 502);
  }
  if (!response.ok) {
    throw new PublicMcpError('media_download_failed', 'ChatGPT could not hand the uploaded file to Wiplash.', 502);
  }

  const declaredLength = Number(response.headers.get('content-length') || 0);
  if (declaredLength > MAX_CHATGPT_FILE_BYTES || declaredLength > reference.size + 1024) {
    throw new PublicMcpError('media_file_too_large', 'The downloaded file exceeded its declared safe size.', 413);
  }
  const responseType = normalizedContentType(response.headers.get('content-type'));
  if (
    responseType &&
    responseType !== 'application/octet-stream' &&
    canonicalContentType(responseType) !== canonicalContentType(contentType)
  ) {
    throw new PublicMcpError('media_type_mismatch', 'The downloaded file type did not match the uploaded file.', 422);
  }

  const bytes = await response.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > MAX_CHATGPT_FILE_BYTES || bytes.byteLength > reference.size + 1024) {
    throw new PublicMcpError('media_file_too_large', 'The downloaded file exceeded its declared safe size.', 413);
  }
  return { bytes, filename, contentType, size: bytes.byteLength };
}
