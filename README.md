# Link slide:

https://gamma.app/docs/Unit-Testing-voi-AI-Prompt-20y47mokl2w2g9q

# Chạy lệnh test:

- Chạy test thông thường: `npm test`
- Chay test coverage: `npm run test:coverage`

# Aura Booking Platform — Backend (BE_AI4SE)

Backend service for the Aura Booking Platform. It provides authentication, artist schedules, bookings, services, transactions, community features, and availability calculations.

This app is written in TypeScript, runs on Node.js/Express, uses MongoDB (Mongoose) and Redis, and is fully covered by Jest unit tests with ts-jest.

## Tech stack

- Node.js 20+, TypeScript 5
- Express 4
- MongoDB with Mongoose 8
- Redis (ioredis/redis clients)
- Socket.IO
- Jest 30 + ts-jest 29 for tests
- Day.js for date/time utils

## Project layout

- `src/index.ts` — app bootstrap (Express, MongoDB/Redis connect, Socket.IO)
- `src/routes/*` — API route modules mounted under `/api`
- `src/controllers/*` — request handlers
- `src/services/*` — business logic (booking availability, transactions, etc.)
- `src/models/*` — Mongoose models (excluded from coverage by default)
- `src/config/*` — environment, DB, cloud, socket config
- `tests/*` — Jest test suites (TypeScript)
- `testcases/*` — human-readable testcase specs

## Requirements

- Node.js 20 or newer
- A MongoDB connection string
- A Redis instance (optional for local start, but required for some features)

## Environment variables

The app loads `.env.development` by default and `.env.production` in production. At minimum, set:

- `MONGO_URI` — MongoDB connection string
- `JWT_SECRET` — JWT signing secret

Optional (used by specific features):

- `PORT` (default 4000)
- `CLIENT_ORIGIN`
- `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`
- Cloudinary: `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `CLOUDINARY_CLOUD_NAME`
- PayOS: `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`, `PAYOS_PAYOUT_*`, `PAYOS_API_URL`
- SendGrid, Google OAuth, Azure Entra IDs, etc.

See `src/config/index.ts` for the full list and validation.

## Install and run

1. Install dependencies

```
npm install
```

2. Development (watch mode)

```
npm run dev
```

3. Build and start (production style)

```
npm run build
npm start
```

The server logs the port and health endpoint on start. Default: http://localhost:4000

## API quick start

- Health check: `GET /health`
- API root: `GET /api` (lists basic metadata and some sub-paths)
- Booking routes: mounted under `/api/booking`
  - `GET /api/booking/available-slots/monthly?muaId=...&year=YYYY&month=MM&duration=MINUTES` (auth required)
  - `GET /api/booking/available-mua/:day` — list approved MUAs and their available services on a day (no auth)
  - Other booking CRUD endpoints generally require auth (see `src/routes/booking.ts`).

## Testing and coverage

This repo uses Jest + ts-jest. Tests live in `tests/` and are TypeScript.

- Run all tests:

```
npm test
```

- Watch mode:

```
npm run test:watch
```

- Collect coverage and open HTML report:

```
npm run test:coverage
# Then open coverage/lcov-report/index.html
```

### Focused test runs

You can run a single file or pattern, for example:

```
npx jest tests/booking_availability.test.ts
```

### Path aliases in tests

TypeScript path aliases (like `@models/*`, `@services/*`) are configured in `tsconfig.json` and mapped in `jest.config.cjs`. If you add new aliases under `compilerOptions.paths`, also update Jest's `moduleNameMapper` if needed.

### Day.js plugin note (tests)

Some availability calculations use Day.js `isSameOrBefore`. When writing new tests, ensure the plugin is extended in the test environment. The current test suite takes care of this by mocking `dayjs` and extending the plugin at the top of the file. If you introduce a global Jest setup, you can also extend the plugin there.

## Docker

Build and run locally with Docker:

```
docker build -t aura-backend .
docker run --rm -p 4000:4000 --env-file .env.development aura-backend
```

The provided `Dockerfile` uses Node 20 Alpine and starts the app in dev mode (`npm run dev`). Adjust `CMD` to `npm start` for production images if desired.

## Deployment (Render)

`render.yaml` and `Procfile` are provided. A typical Render setup:

- Build command: `npm install && npm run build`
- Start command: `node dist/index.js`

Ensure the required environment variables are configured in Render (see Environment variables above).

## Contributing

1. Create a feature branch
2. Add or update tests (aim for coverage in `tests/` and keep testcases in `testcases/` up to date)
3. Run lint/tests locally
4. Open a PR

## Troubleshooting

- Mongo connection issues: verify `MONGO_URI` and network access. See `src/config/database.ts`.
- Missing env vars: the app exits early and lists missing keys; set them in `.env.development` or Render env.
- Jest TypeErrors around Day.js methods: confirm the `isSameOrBefore` plugin is extended in the test file or a Jest setup file.
- Jest path resolution: if an import like `@models/...` fails, check `tsconfig.json` `paths` and `jest.config.cjs` `moduleNameMapper`.

---

Happy shipping! 🚀
