import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  changePasswordSchema,
  confirmRoleSchema,
  googleAuthSchema,
  loginUserSchema,
  registerUserSchema,
  updateProfileSchema,
} from "../../validators/authValidators.js";

describe("authValidators", () => {
  it("allows only public roles during registration", () => {
    assert.deepEqual(registerUserSchema.role.enum, ["tenant", "landlord", "agency", "mover"]);
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

  it("requires an idToken for Google sign-in", () => {
    assert.equal(googleAuthSchema.idToken.required, true);
    assert.equal(googleAuthSchema.idToken.type, "string");
  });

  it("only allows public roles (never admin) when confirming a role", () => {
    assert.equal(confirmRoleSchema.role.required, true);
    assert.deepEqual(confirmRoleSchema.role.enum, ["tenant", "landlord", "agency", "mover"]);
  });

  it("requires termsAccepted to be exactly true during registration", () => {
    assert.equal(registerUserSchema.termsAccepted.required, true);
    assert.equal(
      registerUserSchema.termsAccepted.validate(false),
      "You must accept the Terms of Service to register"
    );
    assert.equal(
      registerUserSchema.termsAccepted.validate("true"),
      "You must accept the Terms of Service to register"
    );
    assert.equal(registerUserSchema.termsAccepted.validate(true), undefined);
  });

  it("requires termsAccepted to be exactly true when confirming a role", () => {
    assert.equal(confirmRoleSchema.termsAccepted.required, true);
    assert.equal(
      confirmRoleSchema.termsAccepted.validate(false),
      "You must accept the Terms of Service to confirm your role"
    );
    assert.equal(confirmRoleSchema.termsAccepted.validate(true), undefined);
  });
});
