export class PublicApiError extends Error {
  constructor(message: string, public readonly status: 400 | 409 | 503) {
    super(message);
    this.name = "PublicApiError";
  }
}
