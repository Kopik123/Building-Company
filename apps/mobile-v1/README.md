# Mobile v1 (Expo Prototype)

Role-based prototype shell for `client/employee/manager/admin` on top of `/api/v2`.

The current production-direction mobile split now lives in:

- `apps/mobile-client`
- `apps/mobile-company`

## Run

```bash
cd apps/mobile-v1
npm install
npm run start
```

## Next build steps

1. Keep using `mobile-v1` only as a seed/reference while the dedicated client/company apps mature.
2. Add persistent session storage, native push registration and richer CRUD flows to the new app pair.
3. Retire this prototype once the split mobile apps reach functional parity for their own roles.
