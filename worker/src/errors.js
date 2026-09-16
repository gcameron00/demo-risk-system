/**
 * Errors are instructions: a bad enum value or an unresolvable name comes
 * back with the valid values or a clear "not found", not a stack trace, so
 * the model can fix its own call. See docs/mcp-server.md#implementation-rules.
 */

export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'NotFoundError';
  }
}
