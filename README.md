# B&B Demo — QA Technical Exercise

Automated test suite for the [Shady Meadows B&B demo](https://automationintesting.online/) and its
Restful Booker Platform API.

## Stack

| Layer | Tool |
|---|---|
| E2E / UI | [Playwright](https://playwright.dev/) (TypeScript) |
| API | [Newman](https://github.com/postmanlabs/newman) (Postman collection runner) |
| Performance | [k6](https://k6.io/) |
| CI/CD | GitHub Actions |

---

## Prerequisites

- Node.js ≥ 20
- npm ≥ 9
- [k6](https://k6.io/docs/getting-started/installation/) (for performance tests)
- Newman: `npm install -g newman`

---

## Setup

```bash
git clone https://github.com/Kennyinspire/shady-meadows-demo-test.git
cd shady-meadows-demo-test
npm install
npx playwright install --with-deps chromium
```

No configuration needed — tests use the public test site by default.

---

## Running the tests

### API tests (Newman)
```bash
npm run test:api
```

### E2E UI tests (Playwright)
```bash
npm run test:e2e
```

### All tests
```bash
npm test
```

### Verify before push (API + E2E)
```bash
npm run verify
```

### Full local verification (API + E2E + k6)
```bash
npm run verify:full
```

### Performance tests (k6 — requires k6 installed)
```bash
npm run test:perf
```

### View Playwright HTML report
```bash
npx playwright show-report
```

---

## Environment variables (Optional)

These default to the public test site. Only override if using a different API endpoint.

| Variable | Default | Description |
|---|---|---|
| `BASE_URL` | `https://automationintesting.online` | Front-end base URL |
| `API_BASE_URL` | `https://automationintesting.online` | API base URL (not required for tests) |
| `ADMIN_USERNAME` | `admin` | Admin login username |
| `ADMIN_PASSWORD` | `password` | Admin login password |

---

## Project structure

```
shady-meadows-demo-test/
├── playwright/
│   ├── tests/
│   │   ├── availability-checker.spec.ts   # TC-01 to TC-09 (US1, US2)
│   │   ├── admin-auth.spec.ts             # TC-10 to TC-17 (US3)
│   │   └── accessibility.spec.ts          # NF-07
│   ├── fixtures/
│   │   └── bookings.ts                    # API-based test data helpers
│   └── playwright.config.ts
├── postman/
│   └── RestfulBookerPlatform.collection.json
├── k6/
│   └── auth-load-test.js                  # NF-01, NF-02
├── .github/
│   └── workflows/
│       └── test.yml
├── .env.example
├── package.json
└── README.md
```

---

## CI/CD

Tests run automatically via GitHub Actions on every pull request and push to `main`.
Performance tests run nightly, on manual workflow dispatch, and on pushes to `main`.

See `.github/workflows/test.yml` for the full pipeline definition.
