const { ValidationError } = require('../utils/errors');

/**
 * Zod validation middleware factory
 * @param {import('zod').ZodSchema} schema 
 * @param {'body' | 'query' | 'params'} source 
 */
function validate(schema, source = 'body') {
  return (req, res, next) => {
    try {
      const dataToValidate = req[source];
      const result = schema.safeParse(dataToValidate);

      if (!result.success) {
        const issues = result.error.issues.map(i => `${i.path.join('.')}: ${i.message}`).join(', ');
        return next(new ValidationError(`Validation failed: ${issues}`));
      }

      req[source] = result.data;
      next();
    } catch (err) {
      next(err);
    }
  };
}

module.exports = validate;
