const validateRequest = (schema) => (req, res, next) => {
  const errors = [];

  for (const [field, rules] of Object.entries(schema)) {
    const value = req.body[field];

    if (rules.required && (value === undefined || value === null || value === "")) {
      errors.push(`${field} is required`);
      continue;
    }

    if (value === undefined || value === null || value === "") {
      continue;
    }

    if (rules.type === "array" && !Array.isArray(value)) {
      errors.push(`${field} must be an array`);
      continue;
    }

    if (rules.type && rules.type !== "array" && typeof value !== rules.type) {
      errors.push(`${field} must be a ${rules.type}`);
      continue;
    }

    if (rules.minLength && value.length < rules.minLength) {
      errors.push(`${field} must be at least ${rules.minLength} characters`);
    }

    if (rules.enum && !rules.enum.includes(value)) {
      errors.push(`${field} must be one of: ${rules.enum.join(", ")}`);
    }

    if (rules.pattern && !rules.pattern.test(value)) {
      errors.push(rules.message || `${field} is invalid`);
    }

    if (rules.validate) {
      const message = rules.validate(value);

      if (message) {
        errors.push(message);
      }
    }
  }

  if (errors.length > 0) {
    res.status(400).json({
      message: "Validation failed",
      errors,
    });
    return;
  }

  next();
};

export default validateRequest;
