// JSON helpers

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 
      "Content-Type": "application/json",
      ...extraHeaders 
    }
  });
}

export function error(message, code = "BAD_REQUEST", detail = null, status = 400, extraHeaders = {}) {
  return json({
    success: false,
    error: code,
    message: message,
    detail: detail
  }, status, extraHeaders);
}
