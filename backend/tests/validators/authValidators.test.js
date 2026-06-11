import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  changePasswordSchema,
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
});
