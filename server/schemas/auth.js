const { z } = require('zod');

// Same character class as the previous inline regex.
const SPECIAL_CHARS = "!@#$%^&*()_+\\-=[\\]{};':\"\\\\|,.<>/?";
const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[a-z]/,                          'Password must include a lowercase letter')
  .regex(/[A-Z]/,                          'Password must include an uppercase letter')
  .regex(/\d/,                             'Password must include a number')
  .regex(new RegExp(`[${SPECIAL_CHARS}]`), 'Password must include a special character');

const emailSchema = z.string().email('Invalid email address');

const registerSchema = z.object({
  name:     z.string().trim().min(2, 'Name must be at least 2 characters')
                              .max(100, 'Name must be at most 100 characters'),
  email:    emailSchema,
  password: passwordSchema,
});

const loginSchema = z.object({
  email:    emailSchema,
  password: z.string().min(1, 'Password is required'),
});

const forgotPasswordSchema = z.object({
  email: emailSchema,
});

const resetPasswordSchema = z.object({
  token:    z.string().min(1, 'Token is required'),
  password: passwordSchema,
});

const verifyEmailQuerySchema = z.object({
  token: z.string().min(1, 'Token is required'),
});

module.exports = {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  verifyEmailQuerySchema,
};
