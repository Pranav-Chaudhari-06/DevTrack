// Mock the email module BEFORE requiring the app so the real nodemailer
// transport never tries to connect to Gmail in tests.
jest.mock('../utils/email', () => ({
  sendVerificationEmail:  jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const buildApp = require('../app');
const db = require('./helpers/db');
const { registerVerifyLogin, VALID_PASSWORD } = require('./helpers/auth');
const { sendVerificationEmail, sendPasswordResetEmail } = require('../utils/email');
const User         = require('../models/User');
const RefreshToken = require('../models/RefreshToken');

let app;

beforeAll(async () => {
  await db.connect();
  app = buildApp();
});

afterAll(async () => {
  await db.disconnect();
});

afterEach(async () => {
  await db.clear();
  sendVerificationEmail.mockClear();
  sendPasswordResetEmail.mockClear();
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/register', () => {
  const valid = { name: 'Ada Lovelace', email: 'ada@example.com', password: VALID_PASSWORD };

  test('happy path: 201, sends verification email, user is unverified', async () => {
    const res = await request(app).post('/api/auth/register').send(valid);
    expect(res.status).toBe(201);
    expect(res.body.message).toMatch(/check your email/i);
    expect(sendVerificationEmail).toHaveBeenCalledTimes(1);
    const [, , token] = sendVerificationEmail.mock.calls[0];
    expect(typeof token).toBe('string');
    expect(token.length).toBeGreaterThan(20);

    const user = await User.findOne({ email: 'ada@example.com' });
    expect(user).toBeTruthy();
    expect(user.emailVerified).toBe(false);
    expect(user.password).not.toBe(VALID_PASSWORD);   // bcrypt hash
  });

  test('rejects weak password', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...valid, password: 'short' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/password/i);
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });

  test('rejects invalid email', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...valid, email: 'nope' });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/email/i);
  });

  test('rejects missing name', async () => {
    const res = await request(app).post('/api/auth/register').send({ email: valid.email, password: valid.password });
    expect(res.status).toBe(400);
  });

  test('duplicate email returns 409', async () => {
    await request(app).post('/api/auth/register').send(valid);
    sendVerificationEmail.mockClear();
    const res = await request(app).post('/api/auth/register').send(valid);
    expect(res.status).toBe(409);
    expect(sendVerificationEmail).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/verify-email
// ─────────────────────────────────────────────────────────────────────────────
describe('GET /api/auth/verify-email', () => {
  test('happy path flips emailVerified and clears token fields', async () => {
    await request(app).post('/api/auth/register')
      .send({ name: 'Ada', email: 'ada@example.com', password: VALID_PASSWORD });
    const [, , token] = sendVerificationEmail.mock.calls[0];

    const res = await request(app).get(`/api/auth/verify-email?token=${token}`);
    expect(res.status).toBe(200);

    const user = await User.findOne({ email: 'ada@example.com' });
    expect(user.emailVerified).toBe(true);
    expect(user.verificationToken).toBeUndefined();
    expect(user.verificationTokenExpiry).toBeUndefined();
  });

  test('rejects unknown token', async () => {
    const res = await request(app).get('/api/auth/verify-email?token=garbage');
    expect(res.status).toBe(400);
  });

  test('rejects empty token', async () => {
    const res = await request(app).get('/api/auth/verify-email');
    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/login', () => {
  test('happy path issues access token + sets httpOnly refresh cookie', async () => {
    const { accessToken, refreshCookie, user } = await registerVerifyLogin(app, sendVerificationEmail);
    expect(typeof accessToken).toBe('string');
    expect(refreshCookie).toMatch(/^devtrack_refresh=/);
    expect(user.email).toMatch(/@example\.com$/);

    const tokens = await RefreshToken.find();
    expect(tokens).toHaveLength(1);
    expect(tokens[0].familyId).toBeTruthy();
    expect(tokens[0].revoked).toBe(false);
  });

  test('wrong password returns 401', async () => {
    const { credentials } = await registerVerifyLogin(app, sendVerificationEmail);
    const res = await request(app).post('/api/auth/login')
      .send({ email: credentials.email, password: 'WrongPassword1!' });
    expect(res.status).toBe(401);
  });

  test('unverified email returns 403', async () => {
    await request(app).post('/api/auth/register')
      .send({ name: 'Ada', email: 'ada@example.com', password: VALID_PASSWORD });
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'ada@example.com', password: VALID_PASSWORD });
    expect(res.status).toBe(403);
    expect(res.body.message).toMatch(/verify/i);
  });

  test('unknown email returns 401 without a DB write', async () => {
    const res = await request(app).post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: VALID_PASSWORD });
    expect(res.status).toBe(401);
    expect(await User.countDocuments()).toBe(0);
  });

  test('5 failed attempts locks the account, 6th gets 429', async () => {
    const { credentials } = await registerVerifyLogin(app, sendVerificationEmail);
    for (let i = 0; i < 5; i++) {
      const r = await request(app).post('/api/auth/login')
        .send({ email: credentials.email, password: 'WrongPassword1!' });
      expect(r.status).toBe(401);
    }
    const sixth = await request(app).post('/api/auth/login')
      .send({ email: credentials.email, password: 'WrongPassword1!' });
    expect(sixth.status).toBe(429);
    expect(sixth.body.message).toMatch(/locked/i);

    // Even the *correct* password should now be locked out
    const correct = await request(app).post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    expect(correct.status).toBe(429);
  });

  test('successful login clears prior failed-attempt counter', async () => {
    const { credentials } = await registerVerifyLogin(app, sendVerificationEmail);
    for (let i = 0; i < 3; i++) {
      await request(app).post('/api/auth/login')
        .send({ email: credentials.email, password: 'WrongPassword1!' });
    }
    await request(app).post('/api/auth/login')
      .send({ email: credentials.email, password: credentials.password });
    const user = await User.findOne({ email: credentials.email });
    expect(user.failedLoginAttempts).toBe(0);
    expect(user.lockoutUntil).toBeNull();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/refresh — includes reuse detection
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/refresh', () => {
  test('happy path rotates the cookie + issues a new access token', async () => {
    const { refreshCookie } = await registerVerifyLogin(app, sendVerificationEmail);

    const res = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);
    expect(res.status).toBe(200);
    expect(typeof res.body.token).toBe('string');
    // (We don't assert token !== old token — JWT iat has 1s resolution so
    //  back-to-back logins can produce byte-identical tokens.)

    const newCookie = (res.headers['set-cookie'] || []).find((c) => c.startsWith('devtrack_refresh='));
    expect(newCookie).toBeTruthy();
    expect(newCookie).not.toBe(refreshCookie);
  });

  test('missing cookie returns 401', async () => {
    const res = await request(app).post('/api/auth/refresh');
    expect(res.status).toBe(401);
  });

  test('reuse of a rotated token nukes the whole family', async () => {
    const { refreshCookie } = await registerVerifyLogin(app, sendVerificationEmail);

    // First refresh rotates the original cookie.
    const firstRotation = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);
    expect(firstRotation.status).toBe(200);

    // Reusing the *original* (now-revoked) cookie should trip reuse detection.
    const reuse = await request(app).post('/api/auth/refresh').set('Cookie', refreshCookie);
    expect(reuse.status).toBe(401);
    expect(reuse.body.message).toMatch(/reuse/i);

    // Family is gone — even the (legitimate) rotated cookie is invalid now.
    const newCookie = (firstRotation.headers['set-cookie'] || [])
      .find((c) => c.startsWith('devtrack_refresh='))
      .split(';')[0];
    const orphan = await request(app).post('/api/auth/refresh').set('Cookie', newCookie);
    expect(orphan.status).toBe(401);

    const remaining = await RefreshToken.countDocuments();
    expect(remaining).toBe(0);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/auth/logout', () => {
  test('deletes the presented refresh token and clears the cookie', async () => {
    const { refreshCookie } = await registerVerifyLogin(app, sendVerificationEmail);
    expect(await RefreshToken.countDocuments()).toBe(1);

    const res = await request(app).post('/api/auth/logout').set('Cookie', refreshCookie);
    expect(res.status).toBe(200);
    expect(await RefreshToken.countDocuments()).toBe(0);
    const cleared = res.headers['set-cookie'].find((c) => c.startsWith('devtrack_refresh='));
    expect(cleared).toMatch(/Expires=Thu, 01 Jan 1970|Max-Age=0/);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/forgot-password + /reset-password
// ─────────────────────────────────────────────────────────────────────────────
describe('Password reset flow', () => {
  test('forgot-password returns the same response for known and unknown emails', async () => {
    const { credentials } = await registerVerifyLogin(app, sendVerificationEmail);

    const known = await request(app).post('/api/auth/forgot-password').send({ email: credentials.email });
    expect(known.status).toBe(200);

    const unknown = await request(app).post('/api/auth/forgot-password').send({ email: 'nobody@example.com' });
    expect(unknown.status).toBe(200);

    expect(known.body).toEqual(unknown.body);
    expect(sendPasswordResetEmail).toHaveBeenCalledTimes(1);
  });

  test('reset-password swaps the password and invalidates all refresh tokens', async () => {
    const { credentials } = await registerVerifyLogin(app, sendVerificationEmail);
    expect(await RefreshToken.countDocuments()).toBe(1);

    await request(app).post('/api/auth/forgot-password').send({ email: credentials.email });
    const [, , resetToken] = sendPasswordResetEmail.mock.calls[0];

    const newPassword = 'Bb2@bbbb';
    const res = await request(app).post('/api/auth/reset-password').send({ token: resetToken, password: newPassword });
    expect(res.status).toBe(200);

    expect(await RefreshToken.countDocuments()).toBe(0);

    const old = await request(app).post('/api/auth/login').send({ email: credentials.email, password: credentials.password });
    expect(old.status).toBe(401);

    const fresh = await request(app).post('/api/auth/login').send({ email: credentials.email, password: newPassword });
    expect(fresh.status).toBe(200);
  });

  test('reset-password clears any lockout state', async () => {
    const { credentials } = await registerVerifyLogin(app, sendVerificationEmail);
    // Run the account into a lockout
    for (let i = 0; i < 5; i++) {
      await request(app).post('/api/auth/login')
        .send({ email: credentials.email, password: 'WrongPassword1!' });
    }
    expect(
      (await request(app).post('/api/auth/login').send({ email: credentials.email, password: credentials.password })).status
    ).toBe(429);

    await request(app).post('/api/auth/forgot-password').send({ email: credentials.email });
    const [, , resetToken] = sendPasswordResetEmail.mock.calls[0];

    await request(app).post('/api/auth/reset-password').send({ token: resetToken, password: 'Cc3#cccc' });

    const user = await User.findOne({ email: credentials.email });
    expect(user.failedLoginAttempts).toBe(0);
    expect(user.lockoutUntil).toBeNull();

    const login = await request(app).post('/api/auth/login').send({ email: credentials.email, password: 'Cc3#cccc' });
    expect(login.status).toBe(200);
  });

  test('reset-password rejects expired/unknown token', async () => {
    const res = await request(app).post('/api/auth/reset-password').send({ token: 'garbage', password: VALID_PASSWORD });
    expect(res.status).toBe(400);
  });

  test('reset-password rejects weak password', async () => {
    const { credentials } = await registerVerifyLogin(app, sendVerificationEmail);
    await request(app).post('/api/auth/forgot-password').send({ email: credentials.email });
    const [, , resetToken] = sendPasswordResetEmail.mock.calls[0];

    const res = await request(app).post('/api/auth/reset-password').send({ token: resetToken, password: 'weak' });
    expect(res.status).toBe(400);
  });
});
