import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  changePasswordSchema,
  loginUserSchema,
  registerUserSchema,
  updateProfileSchema,
} from "../../validators/authValidators.js";

describe("authValidators", () => {
  it("allows only public roles during registration", () => {
    assert.deepEqual(registerUserSchema.role.enum, ["tenant", "landlord", "agency"]);
  });

  it("does not allow profile role or email updates", () => {
    assert.equal(updateProfileSchema.role, undefined);
    assert.equal(updateProfileSchema.email, undefined);
  });

  it("requires a strong enough new password", () => {
    assert.equal(changePasswordSchema.currentPassword.required, true);
    assert.equal(changePasswordSchema.newPassword.minLength, 8);
  });

  it("accepts either an email or a username to log in", () => {
    assert.equal(loginUserSchema.identifier.required, true);
    assert.equal(loginUserSchema.identifier.pattern, undefined);
  });

  it("requires a non-blank, free-text username during registration", () => {
    assert.equal(registerUserSchema.username.required, true);
    assert.equal(registerUserSchema.username.pattern, undefined);
    assert.equal(registerUserSchema.username.validate("   "), "username is required");
    assert.equal(registerUserSchema.username.validate("johnkamau"), undefined);
  });
});
