import { describe, it, expect } from "vitest";
import { validateBackupFile } from "./useDatabaseImport";

// Valid shape: a JSON object whose `projects` property is an array. Anything
// else is rejected so the hook can surface `settings.importInvalidFile`.
// Only `projects` is structurally required; extra fields are optional.
describe("validateBackupFile", () => {
  it("accepts a valid backup and reports the project count", () => {
    const text = JSON.stringify({
      version: 1,
      exportedAt: "2026-01-01T00:00:00.000Z",
      projects: [{ id: 1 }, { id: 2 }, { id: 3 }],
      preferences: null,
    });

    expect(validateBackupFile(text)).toEqual({ ok: true, count: 3 });
  });

  it("accepts an empty projects array with count 0", () => {
    expect(validateBackupFile(JSON.stringify({ projects: [] }))).toEqual({
      ok: true,
      count: 0,
    });
  });

  it("accepts a minimal backup that only carries projects", () => {
    expect(validateBackupFile('{"projects":[{"id":42}]}')).toEqual({
      ok: true,
      count: 1,
    });
  });

  it("rejects malformed JSON", () => {
    expect(validateBackupFile("{ not json")).toEqual({ ok: false });
    expect(validateBackupFile("")).toEqual({ ok: false });
  });

  it("rejects primitives at the document root", () => {
    expect(validateBackupFile("null")).toEqual({ ok: false });
    expect(validateBackupFile("42")).toEqual({ ok: false });
    expect(validateBackupFile('"a string"')).toEqual({ ok: false });
    expect(validateBackupFile("true")).toEqual({ ok: false });
  });

  it("rejects an array at the document root", () => {
    expect(validateBackupFile("[]")).toEqual({ ok: false });
    expect(validateBackupFile("[1,2,3]")).toEqual({ ok: false });
  });

  it("rejects an object missing the projects key", () => {
    expect(validateBackupFile("{}")).toEqual({ ok: false });
    expect(validateBackupFile('{"version":1}')).toEqual({ ok: false });
    expect(validateBackupFile('{"preferences":null}')).toEqual({ ok: false });
  });

  it("rejects a non-array projects value", () => {
    expect(validateBackupFile('{"projects":null}')).toEqual({ ok: false });
    expect(validateBackupFile('{"projects":"nope"}')).toEqual({ ok: false });
    expect(validateBackupFile('{"projects":{"0":{}}}')).toEqual({ ok: false });
    expect(validateBackupFile('{"projects":42}')).toEqual({ ok: false });
  });
});
