import { roleGroups } from "../constants/rbac.js";

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
  username: {
    required: true,
    type: "string",
    validate(value) {
      if (!value.trim()) {
        return "username is required";
      }
    },
  },
  password: {
    required: true,
    type: "string",
    minLength: 8,
  },
  role: {
    type: "string",
    enum: roleGroups.publicRegistration,
  },
  phone: {
    type: "string",
  },
};

const loginUserSchema = {
  identifier: {
    required: true,
    type: "string",
    minLength: 3,
  },
  password: {
    required: true,
    type: "string",
  },
};

const updateProfileSchema = {
  name: {
    type: "string",
    minLength: 2,
  },
  phone: {
    type: "string",
  },
};

const changePasswordSchema = {
  currentPassword: {
    required: true,
    type: "string",
  },
  newPassword: {
    required: true,
    type: "string",
    minLength: 8,
  },
};

const refreshTokenSchema = {
  refreshToken: {
    type: "string",
    minLength: 20,
  },
};

const googleAuthSchema = {
  idToken: {
    required: true,
    type: "string",
  },
};

const confirmRoleSchema = {
  role: {
    required: true,
    type: "string",
    enum: roleGroups.publicRegistration,
  },
};

export {
  changePasswordSchema,
  confirmRoleSchema,
  googleAuthSchema,
  loginUserSchema,
  refreshTokenSchema,
  registerUserSchema,
  updateProfileSchema,
};
