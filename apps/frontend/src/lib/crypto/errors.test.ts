import { describe, expect, it } from "vitest";
import { KeyGrantMismatchError, KeyGrantMissingError } from "./errors";

/**
 * Callers rely on `instanceof` checks and on `error.name` to distinguish the two grant
 * errors — a regression here would silently re-encrypt under a wrong KEK (KeyGrantMismatch)
 * or prompt for re-grant when none was needed (KeyGrantMissing). Both outcomes risk data loss.
 */
describe("KeyGrantMissingError", () => {
  it("is an instance of Error", () => {
    const err = new KeyGrantMissingError("proj-1");
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(KeyGrantMissingError);
  });

  it("sets name to KeyGrantMissingError (used for class discrimination)", () => {
    const err = new KeyGrantMissingError("proj-1");
    expect(err.name).toBe("KeyGrantMissingError");
  });

  it("includes the project id in the message for log correlation", () => {
    const err = new KeyGrantMissingError("project-abc-123");
    expect(err.message).toContain("project-abc-123");
  });

  it("distinct instances with different ids keep their own message", () => {
    const a = new KeyGrantMissingError("a");
    const b = new KeyGrantMissingError("b");
    expect(a.message).not.toBe(b.message);
    expect(a.message).toContain("a");
    expect(b.message).toContain("b");
  });

  it("preserves a stack trace", () => {
    const err = new KeyGrantMissingError("proj-1");
    expect(typeof err.stack).toBe("string");
  });
});

describe("KeyGrantMismatchError", () => {
  it("is an instance of Error", () => {
    const err = new KeyGrantMismatchError("proj-1", new Error("wrong key"));
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(KeyGrantMismatchError);
  });

  it("sets name to KeyGrantMismatchError", () => {
    const err = new KeyGrantMismatchError("proj-1", new Error("x"));
    expect(err.name).toBe("KeyGrantMismatchError");
  });

  it("includes the project id and a mention of KEK in the message", () => {
    const err = new KeyGrantMismatchError("proj-abc", new Error("x"));
    expect(err.message).toContain("proj-abc");
    expect(err.message.toLowerCase()).toContain("kek");
  });

  it("preserves the underlying cause (never lose forensic info)", () => {
    const cause = new Error("OperationError inner");
    const err = new KeyGrantMismatchError("proj-1", cause);
    expect(err.cause).toBe(cause);
  });

  it("accepts an unknown cause (not only Error instances)", () => {
    const err = new KeyGrantMismatchError("proj-1", "a string cause");
    expect(err.cause).toBe("a string cause");
  });

  it("is NOT an instance of KeyGrantMissingError and vice-versa", () => {
    const miss = new KeyGrantMissingError("p");
    const mism = new KeyGrantMismatchError("p", new Error("x"));
    expect(miss).not.toBeInstanceOf(KeyGrantMismatchError);
    expect(mism).not.toBeInstanceOf(KeyGrantMissingError);
  });
});
