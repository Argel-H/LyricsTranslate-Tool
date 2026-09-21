import { describe, it, expect } from "vitest";
import { filterProjects, normalizeForSearch } from "./useProjectFilters";
import { PROJECT_STATUS } from "@/lib/config/constants";
import type { ProjectStatus } from "@/lib/config/constants";
import type { Project } from "@/types/project";

function makeProject(
  overrides: Partial<Project> & Pick<Project, "id">,
): Project {
  return {
    artistName: ["Artist"],
    trackName: "Track",
    lyrics: {},
    status: PROJECT_STATUS.NOT_STARTED,
    progress: 0,
    createdAt: 0,
    updatedAt: 0,
    ...overrides,
  };
}

const notStarted = makeProject({
  id: 1,
  trackName: "Hello World",
  artistName: ["Adele"],
  albumName: "25",
  status: PROJECT_STATUS.NOT_STARTED,
});
const completed = makeProject({
  id: 2,
  trackName: "Halo",
  artistName: ["Beyoncé"],
  status: PROJECT_STATUS.COMPLETED,
});
const activeInReview = makeProject({
  id: 4,
  trackName: "Review Me",
  artistName: ["Someone"],
  status: PROJECT_STATUS.IN_REVIEW,
});
const archivedInReview = makeProject({
  id: 3,
  trackName: "Archived Track",
  artistName: ["Someone"],
  albumName: "Old",
  status: PROJECT_STATUS.IN_REVIEW,
  archived: true,
});
const archivedCompleted = makeProject({
  id: 5,
  trackName: "Archived Done",
  artistName: ["Y"],
  status: PROJECT_STATUS.COMPLETED,
  archived: true,
});

const ALL = [notStarted, completed, archivedInReview, activeInReview, archivedCompleted];

const ids = (projects: Project[]): number[] => projects.map((p) => p.id);

describe("normalizeForSearch", () => {
  it("lower-cases ASCII text", () => {
    expect(normalizeForSearch("HELLO WORLD")).toBe("hello world");
  });

  it("transliterates accents to ASCII", () => {
    expect(normalizeForSearch("Beyoncé")).toBe("beyonce");
  });

  it("strips diacritics while preserving spaces", () => {
    expect(normalizeForSearch("Café ÉTÉ")).toBe("cafe ete");
  });
});

describe("filterProjects - archived visibility", () => {
  it("hides archived projects by default", () => {
    const result = filterProjects(ALL, {
      query: "",
      statuses: new Set(),
      showArchived: false,
    });
    expect(ids(result)).toEqual([1, 2, 4]);
  });

  it("shows only archived projects when showArchived with no status filter", () => {
    const result = filterProjects(ALL, {
      query: "",
      statuses: new Set(),
      showArchived: true,
    });
    expect(ids(result)).toEqual([3, 5]);
  });
});

describe("filterProjects - status multi-select", () => {
  it("filters by a single status and hides archived", () => {
    const result = filterProjects(ALL, {
      query: "",
      statuses: new Set<ProjectStatus>([PROJECT_STATUS.COMPLETED]),
      showArchived: false,
    });
    expect(ids(result)).toEqual([2]);
  });

  it("filters by multiple statuses", () => {
    const result = filterProjects(ALL, {
      query: "",
      statuses: new Set<ProjectStatus>([
        PROJECT_STATUS.NOT_STARTED,
        PROJECT_STATUS.IN_REVIEW,
      ]),
      showArchived: false,
    });
    expect(ids(result)).toEqual([1, 4]);
  });

  it("includes archived projects matching the status when showArchived is on", () => {
    const result = filterProjects(ALL, {
      query: "",
      statuses: new Set<ProjectStatus>([PROJECT_STATUS.COMPLETED]),
      showArchived: true,
    });
    expect(ids(result)).toEqual([2, 5]);
  });

  it("includes archived in-review projects matching the status", () => {
    const result = filterProjects(ALL, {
      query: "",
      statuses: new Set<ProjectStatus>([PROJECT_STATUS.IN_REVIEW]),
      showArchived: true,
    });
    expect(ids(result)).toEqual([3, 4]);
  });
});

describe("filterProjects - token search", () => {
  it("matches on track name case-insensitively", () => {
    const result = filterProjects(ALL, {
      query: "hello",
      statuses: new Set(),
      showArchived: false,
    });
    expect(ids(result)).toEqual([1]);
  });

  it("matches on artist name with accent normalization", () => {
    const result = filterProjects(ALL, {
      query: "beyonce",
      statuses: new Set(),
      showArchived: false,
    });
    expect(ids(result)).toEqual([2]);
  });

  it("matches on album name", () => {
    const result = filterProjects(ALL, {
      query: "25",
      statuses: new Set(),
      showArchived: false,
    });
    expect(ids(result)).toEqual([1]);
  });

  it("requires every token to match across any field", () => {
    const result = filterProjects(ALL, {
      query: "adele 25",
      statuses: new Set(),
      showArchived: false,
    });
    expect(ids(result)).toEqual([1]);
  });

  it("returns no matches when tokens span unrelated projects", () => {
    const result = filterProjects(ALL, {
      query: "adele beyonce",
      statuses: new Set(),
      showArchived: false,
    });
    expect(ids(result)).toEqual([]);
  });

  it("can search archived projects when showArchived only-archived mode is on", () => {
    const result = filterProjects(ALL, {
      query: "archived done",
      statuses: new Set(),
      showArchived: true,
    });
    expect(ids(result)).toEqual([5]);
  });

  it("searches archived rows that match an active status filter", () => {
    const result = filterProjects(ALL, {
      query: "old",
      statuses: new Set<ProjectStatus>([PROJECT_STATUS.IN_REVIEW]),
      showArchived: true,
    });
    expect(ids(result)).toEqual([3]);
  });

  it("treats whitespace-only queries as empty", () => {
    const result = filterProjects(ALL, {
      query: "   ",
      statuses: new Set(),
      showArchived: false,
    });
    expect(ids(result)).toEqual([1, 2, 4]);
  });

  it("ignores a null album name without throwing", () => {
    const withNullAlbum = makeProject({
      id: 9,
      trackName: "Null Album",
      artistName: ["N"],
      albumName: undefined,
      status: PROJECT_STATUS.NOT_STARTED,
    });
    const result = filterProjects([withNullAlbum], {
      query: "null",
      statuses: new Set(),
      showArchived: false,
    });
    expect(ids(result)).toEqual([9]);
  });

  it("does not mutate the input array or project objects", () => {
    const input = [...ALL];
    filterProjects(input, {
      query: "hello",
      statuses: new Set(),
      showArchived: true,
    });
    expect(input).toEqual(ALL);
  });
});
