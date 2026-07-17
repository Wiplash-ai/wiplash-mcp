export class PublicMcpError extends Error {
  readonly code: string;
  readonly status: number | null;

  constructor(code: string, message: string, status: number | null = null) {
    super(message);
    this.name = 'PublicMcpError';
    this.code = code;
    this.status = status;
  }
}

export function publicErrorMessage(error: unknown): string {
  if (error instanceof PublicMcpError) {
    return `${error.code}: ${error.message}`;
  }
  return 'wiplash_unavailable: Wiplash could not complete this request. Retry later.';
}
