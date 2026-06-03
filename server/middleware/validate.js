/**
 * Zod request-validation middleware factory.
 *
 * Runs schema.safeParse on the chosen request source ('body' | 'query' | 'params')
 * and either replaces req[source] with the parsed (typed, trimmed, coerced) data
 * or returns a 400 with the first validation error message.
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    const result = schema.safeParse(req[source]);
    if (!result.success) {
      const message = result.error.issues[0]?.message || 'Invalid request';
      return res.status(400).json({ message });
    }
    req[source] = result.data;
    next();
  };
}

module.exports = validate;
