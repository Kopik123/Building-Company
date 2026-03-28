# Device Push App Variant Enum Role Text Cast Hotfix

## Summary
- Goal: naprawic produkcyjny blad migracji `202603270004-device-push-app-variant-and-device-name.js`, ktory wywraca backfill `DevicePushTokens.appVariant` na bazie z enumowym `Users.role`.
- Scope: poprawa SQL backfillu tak, aby `LOWER(...)` operowal na `Users.role::text`, dopisanie regresji testowej oraz aktualizacja plan/todos/dev log.
- Constraints: hotfix ma byc bezpieczny dla juz czesciowo zmigrowanej produkcji i nie moze wymagac recznych zmian w `DevicePushTokens` ani `Users`.

## Key Changes
- Zmienic warunek backfillu z `LOWER(COALESCE("Users"."role", 'client'))` na `LOWER(COALESCE("Users"."role"::text, 'client'))`, zeby Postgres nie probowal uruchamiac `LOWER()` bezposrednio na enum `enum_Users_role`.
- Dopisac regresje testowa dla migracji `202603270004-device-push-app-variant-and-device-name.js`, ktora pilnuje text-castu na roli uzytkownika w backfillu `appVariant`.

## Test Plan
- Automated: `node --test tests/api-v2/migrations-quote-table-compat.test.js`
- Manual: po wdrozeniu odpalic `npm run migrate` na droplecie i potwierdzic, ze `202603270004-device-push-app-variant-and-device-name.js` przechodzi bez bledu `function lower("enum_Users_role") does not exist`.

## Assumptions
- Produkcyjna kolumna `Users.role` pozostaje enumem i nie chcemy zmieniac jej typu ani kontraktu domenowego.
- Sama logika mapowania `client -> client`, reszta rol -> `company` pozostaje bez zmian; poprawiamy tylko sposob porownania enumu w SQL.