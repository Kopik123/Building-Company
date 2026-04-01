# System Logs Panel for Admin/Manager Dashboard

## Goal
Add a dedicated "System Logs" section to the manager/admin dashboard (visible only to admins), styled similarly to the chat panel, with horizontal filter tabs for log categories. Error-level log entries render in red.

## Log Categories
- **Site Activity** — HTTP GET requests to HTML pages (recorded as `site` type)
- **Database** — DB-level events/errors (recorded as `database` type)
- **User Actions** — User-initiated events: login, quote submit, etc. (recorded as `user_action` type)
- **Visit History** — Page visit history with IP, referrer, user agent (recorded as `visit` type)
- **Errors** — Unhandled 5xx errors and exceptions (recorded as `error` type)

## Files Changed/Created

| File | Purpose |
|---|---|
| `models/SystemLog.js` | Sequelize model for `system_logs` table |
| `migrations/202604010001-system-logs.js` | DB migration to create the table + indexes |
| `utils/logger.js` | Logger utility: `requestLogger()` middleware, `logError`, `logVisit`, `logUserAction`, `logDbEvent` |
| `models/index.js` | Register SystemLog model |
| `routes/manager/log-routes.js` | Admin-only `GET /api/manager/logs` with category/level/pagination filters |
| `routes/manager.js` | Register log routes |
| `app.js` | Add `requestLogger()` middleware + log 5xx errors |
| `manager-dashboard.html` | Add `#manager-logs-section` card (hidden, admin-only) |
| `manager-dashboard.js` | `loadLogs()`, `renderLogEntry()`, filter bar, lazy load, refresh, load-more |
| `styles/workspace.css` | CSS for `.logs-filter-bar`, `.logs-panel`, `.logs-entry`, `.logs-entry--error` |

## Architecture Notes
- `SystemLog` is a plain append-only table (no `updatedAt`).
- The logger utility lazily requires the model to avoid circular dependency issues.
- The `requestLogger()` middleware hooks on `res.finish` and only logs HTML GET requests (not API or static assets) to keep volume manageable.
- Error logging is wired into the existing Express error handler in `app.js`.
- The admin UI section is shown/hidden in JS based on `user.role === 'admin'` — the backend route enforces the same with `roleCheck('admin')`.
- `logUserAction()` is exported and ready to be called from any route file (login, quote actions, etc.) for richer coverage.

## Future Work
- Wire `logUserAction` into auth routes (login/logout), quote accept, and estimate send-to-review routes.
- Add a date-range filter to the logs panel UI.
- Consider a log retention policy (delete entries older than 90 days via a scheduled job).
