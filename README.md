# EPUB Reader

Local single-user library: Spring Boot stores files, React reads them with epub.js.

## Run

Backend (port 8080):

```bash
./gradlew bootRun
```

Frontend (port 5173; proxies `/api` to 8080):

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173). The header pill is green when `GET /api/health` returns `{ "status": "ok" }`.
