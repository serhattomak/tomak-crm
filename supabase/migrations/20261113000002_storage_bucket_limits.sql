-- Server-side limits for the generic storage buckets.
--
-- Both buckets were created with no file_size_limit and no allowed_mime_types,
-- so the only validation was the client-declared values the API forwarded.
-- Storage-api enforces these two columns on upload, which makes the limit hold
-- even for a caller that bypasses /api/storage/upload.

UPDATE storage.buckets
SET file_size_limit = 26214400, -- 25 MB
    allowed_mime_types = ARRAY[
        'image/jpeg', 'image/png', 'image/webp', 'image/gif'
    ]
WHERE id = 'crm-public';

UPDATE storage.buckets
SET file_size_limit = 26214400, -- 25 MB
    allowed_mime_types = ARRAY[
        'application/pdf',
        'image/jpeg', 'image/png', 'image/webp', 'image/gif',
        'text/csv', 'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'application/zip', 'application/x-zip-compressed',
        'application/x-rar-compressed', 'application/x-7z-compressed'
    ]
WHERE id = 'crm-private';
