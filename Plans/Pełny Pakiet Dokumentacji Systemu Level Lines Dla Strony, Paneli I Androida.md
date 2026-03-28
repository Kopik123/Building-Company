# Pełny Pakiet Dokumentacji Systemu Level Lines Dla Strony, Paneli I Androida

## Summary
- Przygotować pakiet 3 powiązanych dokumentów w języku polskim dla publicznej strony, legacy paneli, `web-v2`, backendu oraz dwóch aplikacji Android.
- Oprzeć dokumentację wyłącznie na rzeczywistym stanie repo, z czytelnym podziałem dla właściciela projektu i developera.
- Opisać nie tylko ekrany i funkcje, ale też dane, API, sesje, deploy, generator stron i relacje między domenami.

## Key Changes
- Dodać 3 dokumenty:
  - `Docs/Level Lines - System Overview.md`
  - `Docs/Level Lines - Mapa Strony I Ekranow.md`
  - `Docs/Level Lines - Architektura Techniczna.md`
- W `System Overview` opisać powierzchnie produktu, role użytkowników i główne przepływy `quote -> estimate -> project`.
- W `Mapa Strony I Ekranow` skatalogować strony HTML, legacy dashboardy, `web-v2` i Androida wraz z sekcjami, akcjami, API i modelami.
- W `Architektura Techniczna` opisać Express/Sequelize/Postgres, `api/v2`, legacy API, modele, relacje danych, sesje, uploady, generator stron, asset pipeline i deploy.
- Zaktualizować `README.md`, aby nowy pakiet dokumentacji był łatwo odnajdywalny z poziomu repo.

## Test Plan
- Sprawdzić, czy każdy dokument obejmuje:
  - public web,
  - legacy dashboards,
  - `web-v2`,
  - Android client,
  - Android company,
  - backend,
  - deploy/runtime.
- Zweryfikować, że opisy odnoszą się do rzeczywistych plików, modeli i tras obecnych w repo.
- Wykonać lekki check repo po zmianach dokumentacyjnych (`git diff --check`).

## Assumptions
- Dokumentacja jest po polsku, ale nazwy plików, endpointów, statusów i modeli pozostają w oryginalnym angielskim.
- Pakiet ma formę 3 dokumentów, a nie jednego ogromnego pliku.
- Dokumentacja ma być repo-grounded i jasno oznaczać elementy `live`, `transitional` i `foundation`.
