const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const registerUserSchema = {
  name: {
    required: true,
    type: "string",
    minLength: 2,
  },
  email: {
    required: true,
    type: "string",
    pattern: emailPattern,
    message: "email must be a valid email address",
  },
  password: {
    required: true,
    type: "string",
    minLength: 8,
  },
  role: {
    type: "string",
    enum: ["tenant", "landlord", "agency"],
  },
  phone: {
    type: "string",
  },
};

const loginUserSchema = {
  email: {
    required: true,
    type: "string",
    pattern: emailPattern,
    message: "email must be a valid email address",
  },
  password: {
    required: true,
    type: "string",
  },
};

export { loginUserSchema, registerUserSchema };
