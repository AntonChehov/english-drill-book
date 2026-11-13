import { describe, expect, it } from "vitest";
import coursePack from "../../../../demo/course.pack.json";
import drillsPack from "../../../../demo/drills.pack.json";
import { keptDemo } from "./kept";

const course = structuredClone(coursePack) as unknown;
const drills = structuredClone(drillsPack) as unknown;
const other = { kind: "pack", id: "my-own-book" };

describe("the kept demo", () => {
  it("@req DATA-001 both stored demo packs are the kept demo, in the order of the books", () => {
    expect(keptDemo([drills, other, course])).toEqual({ kind: "kept", packs: [course, drills] });
  });

  it("@req DATA-001 no stored demo pack is no kept demo", () => {
    expect(keptDemo([])).toEqual({ kind: "none" });
    expect(keptDemo([other, null, "text", 42])).toEqual({ kind: "none" });
  });

  it("@req DATA-001 @req PACK-001 a stored demo pack that fails validation is read again", () => {
    const broken = { ...(drillsPack as object), units: [] };
    expect(keptDemo([course, broken])).toEqual({ kind: "stale" });
  });

  it("@req DATA-001 a demo with one of its two packs missing is read again", () => {
    expect(keptDemo([course])).toEqual({ kind: "stale" });
  });

  it("@req DATA-001 a demo pack read from another edition of the book or by another profile is read again", () => {
    const edition = {
      ...drillsPack,
      source: {
        ...drillsPack.source,
        documents: [{ role: "book", sha256: "0".repeat(64), pages: 6 }],
      },
    };
    const version = { ...drillsPack, version: "0.9.0" };
    const unsourced = { ...drillsPack, source: { ...drillsPack.source, documents: undefined } };

    for (const pack of [edition, version, unsourced]) {
      expect(keptDemo([course, JSON.parse(JSON.stringify(pack)) as unknown])).toEqual({
        kind: "stale",
      });
    }
  });
});
