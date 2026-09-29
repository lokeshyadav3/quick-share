export function createErrorResponse(code, message) {
  return {
    success: false,
    error: {
      code,
      message,
    },
  };
}
