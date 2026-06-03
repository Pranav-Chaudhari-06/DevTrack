// Smoke test for the project + task surface: ensures the JWT middleware,
// per-project role middleware, controller chain, and Mongoose schemas all
// agree on the happy path. Auth is covered in depth by auth.test.js; this
// suite just exercises one slice end-to-end.

jest.mock('../utils/email', () => ({
  sendVerificationEmail:  jest.fn().mockResolvedValue(undefined),
  sendPasswordResetEmail: jest.fn().mockResolvedValue(undefined),
}));

const request = require('supertest');
const buildApp = require('../app');
const db = require('./helpers/db');
const { registerVerifyLogin, VALID_PASSWORD } = require('./helpers/auth');
const { sendVerificationEmail } = require('../utils/email');

let app;
let admin;       // { user, accessToken, refreshCookie }
let developer;
let viewer;
let project;     // { _id, name, ... }

const bearer = (token) => ({ Authorization: `Bearer ${token}` });

beforeAll(async () => {
  await db.connect();
  app = buildApp();
});

afterAll(async () => {
  await db.disconnect();
});

// Each suite gets fresh users + a fresh project so we don't lean on test order.
beforeEach(async () => {
  await db.clear();
  sendVerificationEmail.mockClear();

  admin     = await registerVerifyLogin(app, sendVerificationEmail, { email: 'admin@example.com',     name: 'Admin Adams' });
  developer = await registerVerifyLogin(app, sendVerificationEmail, { email: 'dev@example.com',       name: 'Dee Veloper' });
  viewer    = await registerVerifyLogin(app, sendVerificationEmail, { email: 'viewer@example.com',    name: 'Vee Yewer' });

  const projRes = await request(app).post('/api/projects')
    .set(bearer(admin.accessToken))
    .send({ name: 'Apollo', description: 'Moon landing' });
  expect(projRes.status).toBe(201);
  project = projRes.body;

  // Invite the other two so they're members of the project.
  await request(app).post(`/api/projects/${project._id}/members`)
    .set(bearer(admin.accessToken))
    .send({ email: 'dev@example.com', role: 'developer' });
  await request(app).post(`/api/projects/${project._id}/members`)
    .set(bearer(admin.accessToken))
    .send({ email: 'viewer@example.com', role: 'viewer' });
});

describe('Auth gating', () => {
  test('GET /api/projects without a token returns 401', async () => {
    const res = await request(app).get('/api/projects');
    expect(res.status).toBe(401);
  });
});

describe('Projects', () => {
  test('the creator becomes admin and the project appears in their list', async () => {
    const list = await request(app).get('/api/projects').set(bearer(admin.accessToken));
    expect(list.status).toBe(200);
    expect(list.body).toHaveLength(1);
    expect(list.body[0].name).toBe('Apollo');
    expect(list.body[0].myRole).toBe('admin');
    expect(list.body[0].taskCount).toBe(0);
  });

  test('GET /api/projects/:id includes populated members + my role', async () => {
    const res = await request(app).get(`/api/projects/${project._id}`)
      .set(bearer(developer.accessToken));
    expect(res.status).toBe(200);
    expect(res.body.myRole).toBe('developer');
    expect(res.body.members.map((m) => m.user.email).sort()).toEqual(
      ['admin@example.com', 'dev@example.com', 'viewer@example.com']
    );
  });

  test('non-member is denied', async () => {
    const outsider = await registerVerifyLogin(app, sendVerificationEmail, { email: 'outsider@example.com', name: 'Out' });
    const res = await request(app).get(`/api/projects/${project._id}`)
      .set(bearer(outsider.accessToken));
    expect(res.status).toBe(403);
  });
});

describe('Tasks', () => {
  test('admin creates a task assigned to the developer, both can see it', async () => {
    const create = await request(app).post(`/api/projects/${project._id}/tasks`)
      .set(bearer(admin.accessToken))
      .send({ title: 'Build LM', description: 'Build the lunar module', assignedTo: developer.user.id });
    expect(create.status).toBe(201);
    expect(create.body.title).toBe('Build LM');
    expect(create.body.assignedTo).toBe(developer.user.id);
    expect(create.body.assigneeName).toBe('Dee Veloper');

    const list = await request(app).get(`/api/projects/${project._id}/tasks`)
      .set(bearer(developer.accessToken));
    expect(list.status).toBe(200);
    expect(list.body.tasks).toHaveLength(1);
    expect(list.body.total).toBe(1);
    expect(list.body.hasMore).toBe(false);
  });

  test('viewer cannot create tasks (403)', async () => {
    const res = await request(app).post(`/api/projects/${project._id}/tasks`)
      .set(bearer(viewer.accessToken))
      .send({ title: 'Try', assignedTo: developer.user.id });
    expect(res.status).toBe(403);
  });

  test('rejects an assignee who is not a project member', async () => {
    const outsider = await registerVerifyLogin(app, sendVerificationEmail, { email: 'outsider@example.com', name: 'Out' });
    const res = await request(app).post(`/api/projects/${project._id}/tasks`)
      .set(bearer(admin.accessToken))
      .send({ title: 'Try', assignedTo: outsider.user.id });
    expect(res.status).toBe(400);
    expect(res.body.message).toMatch(/member of this project/i);
  });

  test('developer assigned to a task can move it to resolved (and resolvedAt is stamped)', async () => {
    const create = await request(app).post(`/api/projects/${project._id}/tasks`)
      .set(bearer(admin.accessToken))
      .send({ title: 'Inspect LM', assignedTo: developer.user.id });

    const patch = await request(app).patch(`/api/tasks/${create.body._id}`)
      .set(bearer(developer.accessToken))
      .send({ status: 'resolved' });
    expect(patch.status).toBe(200);
    expect(patch.body.status).toBe('resolved');
    expect(patch.body.resolvedAt).toBeTruthy();
  });

  test('developer assigned to one task cannot update a different one', async () => {
    const mine     = await request(app).post(`/api/projects/${project._id}/tasks`)
      .set(bearer(admin.accessToken)).send({ title: 'Mine',     assignedTo: developer.user.id });
    const notMine = await request(app).post(`/api/projects/${project._id}/tasks`)
      .set(bearer(admin.accessToken)).send({ title: 'Not Mine', assignedTo: admin.user.id });

    const allowed = await request(app).patch(`/api/tasks/${mine.body._id}`)
      .set(bearer(developer.accessToken)).send({ status: 'in-progress' });
    expect(allowed.status).toBe(200);

    const denied = await request(app).patch(`/api/tasks/${notMine.body._id}`)
      .set(bearer(developer.accessToken)).send({ status: 'in-progress' });
    expect(denied.status).toBe(403);
  });

  test('admin can delete a task; developer cannot', async () => {
    const create = await request(app).post(`/api/projects/${project._id}/tasks`)
      .set(bearer(admin.accessToken)).send({ title: 'Trash me', assignedTo: developer.user.id });

    const devTry = await request(app).delete(`/api/tasks/${create.body._id}`)
      .set(bearer(developer.accessToken));
    expect(devTry.status).toBe(403);

    const adminTry = await request(app).delete(`/api/tasks/${create.body._id}`)
      .set(bearer(admin.accessToken));
    expect(adminTry.status).toBe(200);

    const list = await request(app).get(`/api/projects/${project._id}/tasks`)
      .set(bearer(admin.accessToken));
    expect(list.body.tasks).toHaveLength(0);
    expect(list.body.total).toBe(0);
  });

  test('pagination caps page size, returns total + hasMore', async () => {
    for (let i = 0; i < 5; i++) {
      await request(app).post(`/api/projects/${project._id}/tasks`)
        .set(bearer(admin.accessToken))
        .send({ title: `Task ${i}`, assignedTo: developer.user.id });
    }

    const first = await request(app).get(`/api/projects/${project._id}/tasks?page=1&limit=2`)
      .set(bearer(admin.accessToken));
    expect(first.body.tasks).toHaveLength(2);
    expect(first.body.total).toBe(5);
    expect(first.body.hasMore).toBe(true);

    const third = await request(app).get(`/api/projects/${project._id}/tasks?page=3&limit=2`)
      .set(bearer(admin.accessToken));
    expect(third.body.tasks).toHaveLength(1);
    expect(third.body.hasMore).toBe(false);

    // limit is capped at 200 — asking for 1000 returns the capped value
    const capped = await request(app).get(`/api/projects/${project._id}/tasks?limit=1000`)
      .set(bearer(admin.accessToken));
    expect(capped.body.limit).toBe(200);
  });

  test('any project member can post a comment; addComment returns the same doc that was inserted', async () => {
    const create = await request(app).post(`/api/projects/${project._id}/tasks`)
      .set(bearer(admin.accessToken)).send({ title: 'Discuss', assignedTo: developer.user.id });

    const post = await request(app).post(`/api/tasks/${create.body._id}/comments`)
      .set(bearer(viewer.accessToken)).send({ text: 'looks good' });
    expect(post.status).toBe(201);
    expect(post.body.text).toBe('looks good');
    expect(post.body.authorName).toBe('Vee Yewer');

    const list = await request(app).get(`/api/tasks/${create.body._id}/comments`)
      .set(bearer(admin.accessToken));
    expect(list.body).toHaveLength(1);
    expect(list.body[0]._id).toBe(post.body._id);   // race-free identity match
  });
});
