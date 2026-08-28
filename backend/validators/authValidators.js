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
  // `required: true` alone only catches an omitted field - validateRequest.js's
  // required check rejects undefined/null/"", but `false` is none of those,
  // so a false value would otherwise sail through as "present." The custom
  // validate() is what actually enforces "must be true," not just "must be
  // present."
  termsAccepted: {
    required: true,
    validate(value) {
      if (value !== true) {
        return "You must accept the Terms of Service to register";
      }
    },
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
  // A Google signup never sees registerUserSchema's own termsAccepted check -
  // its account already exists (roleConfirmed: false) before this, its own
  // forced next step, ever runs. Same requirement, same custom validate as
  // registerUserSchema's, just gated at this step instead for this one path.
  termsAccepted: {
    required: true,
    validate(value) {
      if (value !== true) {
        return "You must accept the Terms of Service to confirm your role";
      }
    },
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
