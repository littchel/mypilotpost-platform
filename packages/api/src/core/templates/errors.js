export function templateError(code, message, details = null) {
  const err = new Error(message || code);
  err.code = code;
  err.details = details;
  return err;
}

export const TEMPLATE_NOT_CERTIFIED = "TEMPLATE_NOT_CERTIFIED";
export const TEMPLATE_RENDER_FAILED = "TEMPLATE_RENDER_FAILED";
export const TEMPLATE_FONT_UNAVAILABLE = "TEMPLATE_FONT_UNAVAILABLE";
export const TEMPLATE_MEDIA_UNAVAILABLE = "TEMPLATE_MEDIA_UNAVAILABLE";
export const TEMPLATE_CONTENT_OVERFLOW = "TEMPLATE_CONTENT_OVERFLOW";
export const TEMPLATE_INVALID_SPECIFICATION = "TEMPLATE_INVALID_SPECIFICATION";
export const CONTENT_EXCEEDS_CAPACITY = "CONTENT_EXCEEDS_CAPACITY";
export const FONT_NOT_REGISTERED = "FONT_NOT_REGISTERED";
