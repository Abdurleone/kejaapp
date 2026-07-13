import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { formatPagination, parsePaginationParams } from "../../utils/pagination.js";

describe("pagination utils", () => {
  it("defaults to page 1 with a limit of 20", () => {
    assert.deepEqual(parsePaginationParams({}), { page: 1, limit: 20, skip: 0 });
  });

  it("computes skip from page and limit", () => {
    assert.deepEqual(parsePaginationParams({ page: "3", limit: "10" }), {
      page: 3,
      limit: 10,
      skip: 20,
    });
  });

  it("floors page and limit at 1", () => {
    assert.deepEqual(parsePaginationParams({ page: "0", limit: "-5" }), {
      page: 1,
      limit: 1,
      skip: 0,
    });
  });

  it("caps limit at 100", () => {
    assert.deepEqual(parsePaginationParams({ limit: "500" }), { page: 1, limit: 100, skip: 0 });
  });

  it("ignores non-numeric input", () => {
    assert.deepEqual(parsePaginationParams({ page: "abc", limit: "xyz" }), {
      page: 1,
      limit: 20,
      skip: 0,
    });
  });

  it("formats pagination metadata", () => {
    assert.deepEqual(formatPagination(2, 20, 45), { page: 2, limit: 20, total: 45, pages: 3 });
    assert.deepEqual(formatPagination(1, 20, 0), { page: 1, limit: 20, total: 0, pages: 0 });
  });
});
