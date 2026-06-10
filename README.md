# TaskBoard Lite

Προσωπικός Διαχειριστής Tasks με Scrum-style Kanban Board.

License: [MIT](LICENSE)

## Τεχνολογίες

- **Backend:** Node.js, Express.js
- **Βάση Δεδομένων:** SQLite (via [sql.js](https://github.com/sql-js/sql.js) — pure JS / WASM)
- **Authentication:** JWT (jsonwebtoken) + bcryptjs
- **Caching:** In-memory cache (Map-based, TTL 60s)
- **Frontend:** HTML5, CSS3, Vanilla JavaScript

## Αρχιτεκτονική

```
taskboard-lite/
├── app.js                 # Entry point, Express setup
├── db/
│   └── index.js           # SQLite init, schema, indexes
├── cache/
│   └── index.js           # In-memory cache (get/set/invalidate)
├── middleware/
│   ├── auth.js            # JWT verification middleware
│   └── validate.js        # Input validation helpers
├── routes/
│   ├── auth.js            # POST /api/auth/login|register|logout
│   ├── boards.js          # GET/POST/DELETE /api/boards
│   └── tasks.js           # Full CRUD /api/tasks + stats
└── public/
    └── index.html         # Single-page frontend
```

## Εγκατάσταση & Εκτέλεση

### Προαπαιτούμενα
- [Node.js](https://nodejs.org/) v18+

### Βήματα

```bash
# 1. Κλωνοποίηση repository
git clone https://github.com/p20voul/taskboard-lite.git
cd taskboard-lite

# 2. Εγκατάσταση dependencies
npm install

# 3. Ρύθμιση environment
cp .env.example .env
# άνοιξε το .env και βάλε ένα JWT_SECRET (δες παρακάτω)

# 4. Εκκίνηση server
npm start

# 5. Άνοιγμα browser
# http://localhost:3000
```

## Environment Variables

Όλες οι ρυθμίσεις διαβάζονται από το `.env` (μέσω `dotenv`). Δες το `.env.example` για template.

| Variable | Default | Περιγραφή |
|----------|---------|-----------|
| `PORT` | `3000` | Port στο οποίο τρέχει ο Express server |
| `JWT_SECRET` | *(required)* | Μυστικό κλειδί για JWT υπογραφή. Δες παρακάτω πώς να το δημιουργήσεις |
| `CORS_ORIGIN` | `*` | Επιτρεπόμενα origins, comma-separated (π.χ. `https://myapp.com,https://www.myapp.com`) |
| `BODY_LIMIT` | `100kb` | Μέγιστο μέγεθος JSON body (π.χ. `500kb`, `1mb`) |

### Δημιουργία JWT_SECRET

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Αντίγραψε το output στο `.env`. Αν δεν είναι σετ, το app θα σκάσει στο boot.

## API Endpoints

| Method | Endpoint | Περιγραφή | Auth |
|--------|----------|-----------|------|
| POST | /api/auth/register | Εγγραφή νέου χρήστη | ✗ |
| POST | /api/auth/login | Σύνδεση, επιστρέφει JWT | ✗ |
| POST | /api/auth/logout | Αποσύνδεση | ✗ |
| GET | /api/boards | Λίστα boards χρήστη | ✓ |
| POST | /api/boards | Δημιουργία board | ✓ |
| DELETE | /api/boards/:id | Διαγραφή board | ✓ |
| GET | /api/tasks?board_id=X | Λίστα tasks (με cache) | ✓ |
| GET | /api/tasks/stats?board_id=X | Στατιστικά ανά status | ✓ |
| GET | /api/tasks/:id | Ανάκτηση task | ✓ |
| POST | /api/tasks | Δημιουργία task | ✓ |
| PUT | /api/tasks/:id | Πλήρης ενημέρωση | ✓ |
| PATCH | /api/tasks/:id | Μερική ενημέρωση (status) | ✓ |
| DELETE | /api/tasks/:id | Διαγραφή task | ✓ |
| GET | /api/cache/stats | Cache statistics (debug) | ✗ |

## Σχήμα Βάσης Δεδομένων

```sql
users   (id, username, password_hash, created_at)
boards  (id, user_id, title, created_at)
tasks   (id, board_id, title, description, status, tag, priority, created_at, updated_at)
```

## Στρατηγική Caching

Το GET `/api/tasks` χρησιμοποιεί in-memory cache με TTL 60 δευτερολέπτων.
Κάθε write operation (POST/PUT/PATCH/DELETE) ακυρώνει αυτόματα το cache του board.
Το frontend εμφανίζει ένδειξη "⚡ cache hit" όταν η απάντηση έρχεται από cache.

### Ροή cache

```
   ┌────────────┐    GET /api/tasks?board_id=1
   │  Browser   │ ─────────────────────────────┐
   └────────────┘                              │
                                               ▼
                                      ┌─────────────────┐
                                      │   Express app   │
                                      └────────┬────────┘
                                               │
                              cache.get('tasks:board:1')
                                               │
                          ┌────────────────────┴────────────────────┐
                          │                                         │
                       HIT (< 60s)                              MISS / expired
                          │                                         │
                          ▼                                         ▼
                 return cached JSON                       SELECT * FROM tasks
                  (X-Cache: HIT)                            WHERE board_id=1
                                                                    │
                                                         cache.set('tasks:board:1', rows)
                                                                    │
                                                                    ▼
                                                          return rows (X-Cache: MISS)


   POST/PUT/PATCH/DELETE /api/tasks
              │
              ▼
   cache.invalidate('tasks:board:N')   ← σβήνει όλα τα keys με αυτό το prefix
```

## License

Διανέμεται με την άδεια [MIT](LICENSE).

## Μάθημα

Διαχείριση Έργων Πληροφορικής — Ατομική Εργασία  
Φοιτητής: Μιχαήλ Βουλγαρέλης | Α.Μ.: Π2020044
