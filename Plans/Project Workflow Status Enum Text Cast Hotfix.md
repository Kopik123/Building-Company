# Project Workflow Status Enum Text Cast Hotfix

## Summary
- Goal: naprawic drugi produkcyjny wariant awarii migracji `202603270002-project-workflow-and-owner-parity.js`, ktory wywraca backfill `projectStage` na bazie z enumowym `Projects.status`.
- Scope: poprawa SQL backfillu tak, aby porownywal enum `Projects.status` przez `::text`, dopisanie regresji testowej oraz aktualizacja plan/todos/dev log.
- Constraints: hotfix ma pozostac bezpieczny dla juz czesciowo przygotowanej produkcji i nie moze wymagac recznych zmian danych.

## Key Changes
- Zmienic porownania w backfillu `projectStage` z `COALESCE("status", '')` na `COALESCE("status"::text, '')`, zeby Postgres nie probowal parsowac pustego stringa jako wartosci `enum_Projects_status`.
- Dopisac regresje testowa pilnujaca text-castu w SQL migracji, zeby przyszle refaktory nie przywrocily tego bledu.

## Test Plan
- Automated: `node --test tests/api-v2/migrations-quote-table-compat.test.js`
- Manual: po wdrozeniu odpalic `npm run migrate` na droplecie i potwierdzic, ze `202603270002-project-workflow-and-owner-parity.js` przechodzi bez bledu z enumowym `Projects.status`.

## Assumptions
- Produkcyjna tabela `Projects` moze zawierac `NULL` w `status`, ale nie moze bezpiecznie przejsc przez `COALESCE(..., '')` bez jawnego castu do tekstu.
- Sama mapa status -> stage pozostaje bez zmian; poprawiamy tylko sposob porownania enumowej kolumny w Postgresie.