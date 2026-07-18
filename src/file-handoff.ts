import { PublicMcpError } from './errors.js';

export interface ChatGptFileReference {
  file_id: string;
  download_url: string;
  file_name?: string;
  mime_type?: string;
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

function fallbackFilename(fileId: string, contentType: string): string {
  const extensionByType: Record<string, string> = {
    'application/pdf': 'pdf',
    'audio/aac': 'aac',
    'audio/flac': 'flac',
    'audio/mp4': 'm4a',
    'audio/mpeg': 'mp3',
    'audio/ogg': 'ogg',
    'audio/wav': 'wav',
    'audio/webm': 'webm',
    'image/gif': 'gif',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'video/mp4': 'mp4',
    'video/quicktime': 'mov',
    'video/webm': 'webm',
    'video/x-matroska': 'mkv',
  };
  const extension = extensionByType[canonicalContentType(contentType)] ?? 'bin';
  const safeId = fileId.replace(/[^A-Za-z0-9_-]/g, '').slice(-64) || 'file';
  return `chatgpt-${safeId}.${extension}`;
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
  maxBytes = MAX_CHATGPT_FILE_BYTES,
): Promise<DownloadedMediaFile> {
  if (!Number.isSafeInteger(maxBytes) || maxBytes <= 0 || maxBytes > MAX_CHATGPT_FILE_BYTES) {
    throw new TypeError('maxBytes must be a positive safe integer within the global file limit.');
  }
  const declaredType = normalizedContentType(reference.mime_type);
  if (declaredType && !ALLOWED_CONTENT_TYPES.has(declaredType)) {
    throw new PublicMcpError('unsupported_media_type', 'Use a supported image, PDF, audio, or video file.', 422);
  }

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
      headers: { Accept: declaredType || '*/*' },
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
  if (declaredLength > maxBytes) {
    throw new PublicMcpError('media_file_too_large', 'The downloaded file exceeded its declared safe size.', 413);
  }
  const responseType = normalizedContentType(response.headers.get('content-type'));
  if (
    declaredType &&
    responseType &&
    responseType !== 'application/octet-stream' &&
    canonicalContentType(responseType) !== canonicalContentType(declaredType)
  ) {
    throw new PublicMcpError('media_type_mismatch', 'The downloaded file type did not match the uploaded file.', 422);
  }
  const contentType = declaredType || (responseType === 'application/octet-stream' ? '' : responseType);
  if (!contentType || !ALLOWED_CONTENT_TYPES.has(contentType)) {
    throw new PublicMcpError('unsupported_media_type', 'Use a supported image, PDF, audio, or video file.', 422);
  }
  const filename = reference.file_name
    ? safeFilename(reference.file_name)
    : fallbackFilename(reference.file_id, contentType);

  const bytes = await response.arrayBuffer();
  if (!bytes.byteLength || bytes.byteLength > maxBytes) {
    throw new PublicMcpError('media_file_too_large', 'The downloaded file exceeded its declared safe size.', 413);
  }
  return { bytes, filename, contentType, size: bytes.byteLength };
}
