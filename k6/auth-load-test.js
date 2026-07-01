/**
 * auth-load-test.js — k6 performance test
 *
 * Covers NF-01 and NF-02:
 *   NF-01  Authentication response time at 1 concurrent user  → p95 ≤ 5 s
 *   NF-02  Authentication response time at 10 concurrent users → p95 ≤ 5 s, 0% error rate
 *
 * Run:
 *   k6 run k6/auth-load-test.js
 *
 * The BASE_URL environment variable is injected by CI; defaults to the public test site.
 */

import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const BASE_URL = __ENV.K6_BASE_URL || 'https://automationintesting.online';

// Custom metrics
const authDuration = new Trend('auth_duration', true);
const authErrors   = new Rate('auth_errors');

export const options = {
  scenarios: {
    // NF-01: single user baseline
    single_user: {
      executor: 'constant-vus',
      vus: 1,
      duration: '30s',
      tags: { scenario: 'single_user' },
    },
    // NF-02: light concurrent load
    light_load: {
      executor: 'constant-vus',
      vus: 10,
      duration: '30s',
      startTime: '35s', // run after single_user completes
      tags: { scenario: 'light_load' },
    },
  },

  thresholds: {
    // Acceptance criterion: authentication within 5 seconds
    'auth_duration{scenario:single_user}': ['p(95)<5000'],
    'auth_duration{scenario:light_load}':  ['p(95)<5000'],

    // Zero error rate for normal load
    'auth_errors{scenario:light_load}': ['rate<0.01'],

    // Also enforce on the default http_req_duration metric
    'http_req_duration': ['p(95)<5000'],
    'http_req_failed':   ['rate<0.01'],
  },
};

export default function () {
  const payload = JSON.stringify({
    username: __ENV.ADMIN_USERNAME || 'admin',
    password: __ENV.ADMIN_PASSWORD || 'password',
  });

  const params = {
    headers: { 'Content-Type': 'application/json' },
  };

  const res = http.post(`${BASE_URL}/api/auth/login`, payload, params);

  // Record custom metrics
  authDuration.add(res.timings.duration);
  authErrors.add(res.status !== 200);

  check(res, {
    'status is 200':        (r) => r.status === 200,
    'token is present':     (r) => {
      try {
        const body = JSON.parse(r.body);
        return typeof body.token === 'string' && body.token.length > 0;
      } catch {
        return false;
      }
    },
    'response under 5s':    (r) => r.timings.duration < 5000,
  });

  sleep(1);
}
