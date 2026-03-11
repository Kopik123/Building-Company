# Repository Conventions

## Plan Storage

- Save every newly created plan as a Markdown file in `Plans/`.
- Use the plan title as the filename when practical, for example `Plans/Responsive Rewrite For Site + HTML Dashboards.md`.
- Use `Plans/Plan Template.md` as the default structure for every newly created plan unless the task clearly requires a different format.
- After creating a new plan file, append an entry to `Plans/Plan History.md`.
- Each history entry must include:
  - date
  - time
  - plan title
  - relative path to the saved plan file
- Do not add `Plans/Plan Template.md` itself to `Plans/Plan History.md`.
zawsze zapisuj bledy/problemy jako checkliste w pliku Project_todos.md ,
 oraz wszystkie wykonane czynnosci/zmiany w projekcie jako plan dzialania Project_Dev_plan.md , pliki maja dzialac wspolnie`
wszystkie plany ktore stworzymy zapisuj w fodlerze Plans/title planu.md, stworz plik zawierajacy historie dodawania planow z data i godz 
zawsze na koniec stworz odpowiedni commit i wyslij push 

## Platform Direction

- The current primary product is the responsive web app for PC and mobile browsers.
- A dedicated Android/iOS app is planned later and must be treated as a standing architectural requirement.
- For every new web feature, design the implementation so it is ready to support a future Android/iOS app without a full rewrite.
- Default expectations for new work:
  - keep API contracts reusable for native clients
  - avoid coupling core logic to page-only DOM flows when shared service logic can be separated
  - keep auth, session, messaging, media, quote and project flows portable to mobile app clients
  - prefer data models, endpoints and UI structure that can map cleanly to both web and future mobile app surfaces
- When a better technology, language, framework or tool exists for a given function, always call it out together with tradeoffs and whether it is worth adopting now or later.
