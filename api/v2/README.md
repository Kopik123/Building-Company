# API v2

Unified API contract for web v2 and mobile v1.

## Response format

- Success: `{ data, meta }`
- Error: `{ error: { code, message, details? } }`

## Core routes

- `POST /api/v2/auth/login`
- `POST /api/v2/auth/refresh`
- `POST /api/v2/auth/logout`
- `GET /api/v2/auth/me`
- `PATCH /api/v2/auth/profile`
- `PATCH /api/v2/auth/password`
- `POST /api/v2/devices/push-token`
- `DELETE /api/v2/devices/push-token/:id`
- `GET /api/v2/services`
- `GET /api/v2/gallery/projects`
- `GET /api/v2/gallery/services`
- `GET /api/v2/crm/clients`
- `GET /api/v2/crm/staff`
- `GET /api/v2/projects`
- `GET /api/v2/projects/:id`
- `POST /api/v2/projects`
- `PATCH /api/v2/projects/:id`
- `GET /api/v2/quotes`
- `PATCH /api/v2/quotes/:id`
- `GET /api/v2/messages/threads`
- `GET /api/v2/messages/direct-threads`
- `POST /api/v2/messages/direct-threads`
- `GET /api/v2/messages/direct-threads/:id/messages`
- `POST /api/v2/messages/direct-threads/:id/messages`
- `POST /api/v2/messages/direct-threads/:id/messages/upload`
- `PATCH /api/v2/messages/direct-threads/:id/read`
- `GET /api/v2/messages/threads/:id/messages`
- `POST /api/v2/messages/threads/:id/messages`
- `POST /api/v2/messages/threads/:id/messages/upload`
- `GET /api/v2/notifications`
- `GET /api/v2/notifications/unread-count`
- `PATCH /api/v2/notifications/:id/read`
- `PATCH /api/v2/notifications/read-all`
- `GET /api/v2/inventory/services`
- `POST /api/v2/inventory/services`
- `PATCH /api/v2/inventory/services/:id`
- `DELETE /api/v2/inventory/services/:id`
- `GET /api/v2/inventory/materials`
- `POST /api/v2/inventory/materials`
- `PATCH /api/v2/inventory/materials/:id`
- `DELETE /api/v2/inventory/materials/:id`
