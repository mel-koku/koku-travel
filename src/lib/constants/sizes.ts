/**
 * Size and limit constants
 */

// Request size limits
export const MAX_PAYLOAD_SIZE_64KB = 64 * 1024; // 64KB for webhook payloads
export const MAX_URL_LENGTH_1KB = 1024; // 1KB for URL length
export const MAX_SIGNATURE_LENGTH = 500; // Max signature header length

// Path limits
export const MAX_REVALIDATION_PATHS = 100; // Maximum number of paths to revalidate

// Authorization code limits
export const MAX_AUTHORIZATION_CODE_LENGTH = 1000; // Max authorization code length

