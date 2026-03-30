# Project Workflow Stage Enum Quoting Production Hotfix

## Summary
- Goal: naprawic produkcyjny blad migracji `202603270002-project-workflow-and-owner-parity.js`, ktory wywraca deploy na Postgresie podczas dodawania `Projects.projectStage`.
- Scope: poprawa sposobu deklaracji enum type w migracji, dopisanie regresji testowej oraz aktualizacja plikow sledzacych plan/todos/dev log.
- Constraints: hotfix musi byc wznowialny na istniejacej produkcji, bez recznej ingerencji w tabele i bez zmiany kontraktu domenowego `projectStage`.

## Key Changes
- Wymusic quoted enum identifier `"enum_Projects_projectStage"` w migracji, tak aby Sequelize wygenerowal poprawny `ALTER TABLE ... ADD COLUMN ... "enum_Projects_projectStage"` zamiast niequoted typu zrzucanego przez Postgresa do lowercase.
- Utrzymac zgodny backfill `projectStage` z jawnie quoted castami enum i dopisac regresje w `tests/api-v2/migrations-quote-table-compat.test.js`, ktora pilnuje poprawnego typu kolumny i quoted castow w SQL.

## Test Plan
- Automated: `node --test tests/api-v2/migrations-quote-table-compat.test.js`
- Manual: po wdrozeniu odpalic `npm run migrate` na droplecie i potwierdzic, ze `202603270002-project-workflow-and-owner-parity.js` przechodzi bez bledu dla typu `enum_projects_projectstage`.

## Assumptions
- Produkcyjna baza nie ma jeszcze zastosowanej tej migracji, wiec poprawka musi zadzialac na pierwszym prawdziwym uruchomieniu `up`.
- Nazwa enum type ma pozostac zgodna z obecnym modelem i migracjami, zmieniamy tylko sposob jej cytowania w SQL generowanym przez Sequelize.