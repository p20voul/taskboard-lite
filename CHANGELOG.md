# Changelog

Σύνοψη των αλλαγών, μέρα-μέρα (βλέπε και commits).

## Day 1 — gitignore + cleanup
- προστέθηκε `.gitignore`, αφαιρέθηκαν `node_modules/` και `db/taskboard.db` από το git
- νέο `.env.example`

## Day 2 — dotenv + jwt secret
- `dotenv` για φόρτωση `.env`
- `JWT_SECRET` πλέον από env, αφαιρέθηκε το hardcoded fallback

## Bugfix — last_insert_rowid
- διορθώθηκε bug όπου το `last_insert_rowid()` γύρναγε 0 μετά το `persist()` στο sql.js
- αυτό έκανε νέα boards να αποθηκεύονται με `user_id = 0` (data isolation bug)

## Day 3 — input validation
- max length για title/description
- enum validation για `status`, `priority`, `tag`

## Day 4 — cors + body limit
- `CORS_ORIGIN` και `BODY_LIMIT` ρυθμίσιμα από `.env`
- handler για `entity.too.large` → καθαρό 413 αντί για 500

## Day 5 — license + readme
- προστέθηκε `LICENSE` (MIT)
- επέκταση README (env vars, troubleshooting, αρχιτεκτονική)

## Day 6 — rate limiting
- rate limit στο `/api/auth/login`, max 5 προσπάθειες σε 15 λεπτά

## Day 7 — graceful shutdown
- handling για SIGINT/SIGTERM
- `db.export()` πριν κλείσει το process, ώστε να μη χάνονται δεδομένα

## Day 8 — multi-board UI
- board switcher στο header, modal για "Νέο Board", διαγραφή board
- fix: όταν δεν υπάρχει κανένα board δεν γίνεται πλέον αυτόματο logout — δείχνεται empty state

## Day 9 — tests
- βασικά tests με `node:test` + `supertest`, `npm test`
- split του `app.js` σε `setup()` + `listen()` ώστε να είναι testable

## Day 10 — changelog + polish
- αυτό το αρχείο
- στο search: διαφορετικό μήνυμα όταν η στήλη είναι άδεια vs όταν η αναζήτηση δεν βρίσκει τίποτα
