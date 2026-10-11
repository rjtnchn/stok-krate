// api/errors.js
// Shared between client.js (real fetch calls) and mockApi.js (fake data),
// so both can throw/handle errors identically and components don't care
// which one is actually active.

export class ApiError extends Error {
  constructor(status, body) {
    super(body?.message || `Request failed with status ${status}`);
    this.status = status;
    this.body = body; // expected shape: { message, errors: { field: "reason" } }
  }
}

// Turns any thrown error into a short, user-safe message — never raw JSON
// or a stack trace. Prefer this over reading err.message/err.body directly
// in a component so a malformed or unexpected error body can't leak
// through to the screen.
export function getErrorMessage(err, fallback = "Something went wrong. Please try again.") {
  if (err instanceof ApiError && typeof err.body?.message === "string" && err.body.message) {
    return err.body.message;
  }
  return fallback;
}