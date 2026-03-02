'use strict';

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
  'image/heic',
  'image/heif'
];

function sanitizeFilename(filename) {
  return filename.replace(/[^a-zA-Z0-9._-]/g, '');
}

function validateImageInput({ title, alt, filename, contentType }) {
  if (!title || typeof title !== 'string') return 'title is required';
  if (title.length > 200) return 'title must be 200 characters or fewer';
  if (!alt || typeof alt !== 'string') return 'alt is required';
  if (alt.length > 500) return 'alt must be 500 characters or fewer';
  if (!filename || typeof filename !== 'string') return 'filename is required';
  if (!contentType || !contentType.startsWith('image/')) return 'contentType must be an image type';
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) return `contentType must be one of: ${ALLOWED_CONTENT_TYPES.join(', ')}`;
  return null;
}

function validateReorderInput({ orderedIds }) {
  if (!Array.isArray(orderedIds)) return 'orderedIds must be an array';
  if (orderedIds.length === 0) return 'orderedIds must not be empty';
  if (orderedIds.length > 100) return 'orderedIds must have 100 or fewer items';
  if (!orderedIds.every(id => typeof id === 'string')) return 'orderedIds must be strings';
  return null;
}

module.exports = { sanitizeFilename, validateImageInput, validateReorderInput };
