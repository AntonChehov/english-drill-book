/// <reference types="node" />
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import coursePack from "../../demo/course.pack.json";
import { sha256Hex } from "./digest";
import { StaticFileError, staticFileUrl } from "./static-files";

describe("staticFileUrl", () => {
  it("@req PACK-003 resolves a file of the app against its base address", () => {
    expect(staticFileUrl("demo/course.pdf", "/", "http://127.0.0.1:4173/#/").href).toBe(
      "http://127.0.0.1:4173/demo/course.pdf",
    );
    expect(
      staticFileUrl(
        "demo/course.pdf",
        "/english-drill-book/",
        "https://example.github.io/english-drill-book/#/about",
      ).href,
    ).toBe("https://example.github.io/english-drill-book/demo/course.pdf");
  });

  it("@req PACK-003 refuses an address on another origin before anything is requested", () => {
    for (const path of ["https://elsewhere.example/book.pdf", "//elsewhere.example/book.pdf"]) {
      expect(() => staticFileUrl(path, "/", "http://127.0.0.1:4173/")).toThrow(StaticFileError);
    }
    const error = (() => {
      try {
        staticFileUrl("https://elsewhere.example/a.pdf", "/", "http://127.0.0.1:4173/");
      } catch (caught) {
        return caught;
      }
      return undefined;
    })();
    expect(error).toMatchObject({
      path: "https://elsewhere.example/a.pdf",
      failure: { kind: "foreign" },
    });
  });
});

describe("sha256Hex", () => {
  it("@req PACK-003 gives the hash the demo pack records for its PDF", async () => {
    const bytes = new Uint8Array(
      readFileSync(new URL("../../public/demo/course.pdf", import.meta.url)),
    );
    expect(await sha256Hex(bytes)).toBe(coursePack.source.documents[0]!.sha256);
  });
});
