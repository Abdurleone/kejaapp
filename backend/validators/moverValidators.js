const serviceTypes = ["local", "long_distance", "packing", "storage", "office", "furniture"];

const validateLength = (field, maxLength) => (value) => {
  if (typeof value === "string" && value.length > maxLength) {
    return `${field} must be ${maxLength} characters or fewer`;
  }

  return null;
};

const moverProfileSchema = {
  name: {
    required: true,
    type: "string",
    minLength: 2,
  },
  phone: {
    required: true,
    type: "string",
    minLength: 7,
  },
  email: {
    type: "string",
    validate: validateLength("email", 200),
  },
  serviceTypes: {
    type: "array",
    validate(value) {
      const invalid = value.filter((type) => !serviceTypes.includes(type));

      if (invalid.length > 0) {
        return `serviceTypes must only contain: ${serviceTypes.join(", ")}`;
      }

      return null;
    },
  },
  basePrice: {
    type: "number",
  },
};

const rejectMoverVerificationSchema = {
  reason: {
    required: true,
    type: "string",
    minLength: 5,
  },
};

export { moverProfileSchema, rejectMoverVerificationSchema, serviceTypes };
