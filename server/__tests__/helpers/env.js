// Loaded by jest before any test/helper module. Sets the env vars that
// app.js and authController expect to be present at require-time.
process.env.NODE_ENV       = 'test';
process.env.JWT_SECRET     = 'test-secret-with-enough-entropy-for-jwt-signing';
process.env.MONGO_URI      = 'set-by-mongodb-memory-server';
process.env.LOG_LEVEL      = 'silent';
process.env.ALLOWED_ORIGINS = 'http://localhost:5173';
process.env.CLIENT_URL     = 'http://localhost:5173';
