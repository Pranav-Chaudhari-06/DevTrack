const request = require('supertest');

const VALID_PASSWORD = 'Aa1!aaaa'; // satisfies the zod password schema

/**
 * Register, verify, and log in a user in one call. The email module is mocked
 * (see __tests__/auth.test.js), so we read the verification token from the
 * mock's recorded call args.
 *
 * Returns: { user, accessToken, refreshCookie }
 *   refreshCookie is the raw "devtrack_refresh=..." string ready to feed back
 *   into supertest's .set('Cookie', ...) on follow-up requests.
 */
async function registerVerifyLogin(app, sendVerificationEmailMock, overrides = {}) {
  const credentials = {
    name:     overrides.name     || 'Test User',
    email:    overrides.email    || `user+${Date.now()}@example.com`,
    password: overrides.password || VALID_PASSWORD,
  };

  const registerRes = await request(app).post('/api/auth/register').send(credentials);
  if (registerRes.status !== 201) {
    throw new Error(`register failed (${registerRes.status}): ${JSON.stringify(registerRes.body)}`);
  }

  // The mock was called as sendVerificationEmail(email, name, rawToken).
  // Pick the last call so multiple users in one test don't trip on each other.
  const calls = sendVerificationEmailMock.mock.calls;
  const token = calls[calls.length - 1]?.[2];
  if (!token) throw new Error('verification token was never captured by the email mock');

  const verifyRes = await request(app).get(`/api/auth/verify-email?token=${token}`);
  if (verifyRes.status !== 200) {
    throw new Error(`verify-email failed (${verifyRes.status}): ${JSON.stringify(verifyRes.body)}`);
  }

  const loginRes = await request(app).post('/api/auth/login').send({
    email: credentials.email, password: credentials.password,
  });
  if (loginRes.status !== 200) {
    throw new Error(`login failed (${loginRes.status}): ${JSON.stringify(loginRes.body)}`);
  }

  const refreshCookie = (loginRes.headers['set-cookie'] || [])
    .find((c) => c.startsWith('devtrack_refresh='));
  if (!refreshCookie) throw new Error('login did not set a refresh cookie');

  return {
    user:          loginRes.body.user,
    accessToken:   loginRes.body.token,
    refreshCookie: refreshCookie.split(';')[0],
    credentials,
  };
}

module.exports = { registerVerifyLogin, VALID_PASSWORD };
