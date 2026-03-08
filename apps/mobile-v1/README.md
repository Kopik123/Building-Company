# Mobile v1 (Expo)

Role-based mobile shell for `client/employee/manager/admin` on top of `/api/v2`.

## Run

```bash
cd apps/mobile-v1
npm install
npm run start
```

## Next build steps

1. Add navigation stacks per role (`projects`, `documents`, `quotes`, `crm`, `inventory`).
2. Register push tokens with `POST /api/v2/devices/push-token`.
3. Add polling fallback for unread counters and thread sync.
