import Ajv2020 from "ajv/dist/2020";
import { describe, expect, it, vi } from "vitest";
import exportSchema from "../../../contracts/export.schema.json";
import { deriveExercise, type Attempt } from "../../domain/progress";
import { validatePack } from "../../domain/packs/validate";
import {
  contentsOf,
  snapshot,
  failingNextVersion,
  fixtures,
  freshFactory,
  loadFixture,
  migrationsWithNext,
  NEXT_VERSION,
  rawOpen,
  schemaOf,
} from "./db.fixture";
import { StorageError } from "./errors";
import { MIGRATIONS, SCHEMA_VERSION } from "./schema";
import { openStore } from "./store";

const ajv = new Ajv2020({ allErrors: true, strict: true, strictRequired: false });
ajv.addSchema(exportSchema);
const validAttempt = ajv.getSchema(`${exportSchema.$id}#/$defs/attempt`)!;

const version1 = fixtures.find((fixture) => fixture.version === 1)!;

describe("the fixtures of earlier versions", () => {
  it("@req DATA-005 there is a fixture of every released version, the current one included", () => {
    expect(fixtures.map((fixture) => fixture.version)).toEqual(
      Array.from({ length: SCHEMA_VERSION }, (_, index) => index + 1),
    );
  });

  for (const fixture of fixtures) {
    it(`@req DATA-005 the fixture of version ${fixture.version} has the schema the migrations to it create`, async () => {
      const fromFixture = freshFactory();
      await loadFixture(fromFixture, fixture);
      const fromMigrations = freshFactory();
      const migrations = MIGRATIONS.slice(0, fixture.version + 1);
      (await openStore({ factory: fromMigrations, migrations })).close();

      expect(schemaOf(await rawOpen(fromFixture))).toEqual(schemaOf(await rawOpen(fromMigrations)));
    });
  }

  it("@req DATA-005 the packs and attempts of the fixtures are valid", () => {
    for (const fixture of fixtures) {
      const packs = fixture.stores["packs"]?.records ?? [];
      const attempts = fixture.stores["attempts"]?.records ?? [];
      expect(packs.length).toBeGreaterThan(0);
      expect(attempts.length).toBeGreaterThan(0);
      for (const pack of packs) expect(validatePack(pack).ok).toBe(true);
      for (const attempt of attempts) {
        expect(validAttempt(attempt) ? [] : validAttempt.errors).toEqual([]);
      }
    }
  });
});

describe("older data", () => {
  for (const fixture of fixtures) {
    it(`@req DATA-005 data of version ${fixture.version} opens with every attempt and pack still there`, async () => {
      const factory = freshFactory();
      await loadFixture(factory, fixture);

      const store = await openStore({ factory });

      const attempts = fixture.stores["attempts"]!.records as Attempt[];
      expect(await store.getPacks()).toEqual(fixture.stores["packs"]!.records);
      for (const exercise of ["1.1", "1.2"]) {
        const ofExercise = attempts.filter((attempt) => attempt.exercise === exercise);
        expect(await store.getAttempts("fixture-plurals", exercise)).toEqual(ofExercise);
        expect(await store.getExerciseState("fixture-plurals", exercise)).toEqual(
          deriveExercise(ofExercise),
        );
      }
      expect(await store.getDraft("fixture-plurals", "1.2")).toEqual(
        fixture.stores["drafts"]!.records[0],
      );
      expect(await store.getSetting("theme")).toBe("dark");
      expect(await store.getDayTicks("2026-11-23")).toEqual(fixture.version >= 2 ? ["read"] : []);
      store.close();
      expect((await rawOpen(factory)).version).toBe(SCHEMA_VERSION);
    });
  }

  it("@req DATA-005 @req PROG-009 version 1 data opens at version 2 with an empty store of days", async () => {
    const factory = freshFactory();
    await loadFixture(factory, version1);
    const before = await snapshot(factory);

    (await openStore({ factory })).close();

    const after = await snapshot(factory);
    expect(after).toEqual({ ...before, days: [] });
  });

  it("@req DATA-005 a test-only next version migrates the data of version 1 in place, losing nothing", async () => {
    const factory = freshFactory();
    await loadFixture(factory, version1);
    const before = await snapshot(factory);

    const store = await openStore({ factory, migrations: migrationsWithNext });
    store.close();

    const database = await rawOpen(factory);
    expect(database.version).toBe(NEXT_VERSION);
    const after = await contentsOf(database);
    expect(after["attempts"]).toEqual(before["attempts"]);
    expect(after["packs"]).toEqual(before["packs"]);
    expect(after["drafts"]).toEqual(before["drafts"]);
    expect(after["settings"]).toEqual([{ name: "theme", value: "dark", migrated: true }]);
    expect(after["days"]).toEqual([]);
    expect(after["future"]).toEqual([]);
    expect(schemaOf(database)["attempts"]?.indexes).toHaveProperty("action", "action");
  });

  it("@req DATA-005 a migration that fails leaves the database as it was, all or nothing", async () => {
    const factory = freshFactory();
    await loadFixture(factory, version1);
    const before = await snapshot(factory);

    await expect(
      openStore({ factory, migrations: [...MIGRATIONS, failingNextVersion] }),
    ).rejects.toThrow(new StorageError("failed"));

    const database = await rawOpen(factory);
    expect(database.version).toBe(1);
    expect(await contentsOf(database)).toEqual(before);
  });

  it("@req DATA-005 a version with no migration to it is refused before anything changes", async () => {
    const factory = freshFactory();
    await loadFixture(factory, version1);

    await expect(openStore({ factory, migrations: [...MIGRATIONS, undefined] })).rejects.toThrow(
      new StorageError("failed"),
    );
    expect((await rawOpen(factory)).version).toBe(1);
  });
});

describe("newer data", () => {
  it("@req DATA-005 data of a newer version stops the store and is left unchanged", async () => {
    const factory = freshFactory();
    await loadFixture(factory, version1);
    (await openStore({ factory, migrations: migrationsWithNext })).close();
    const before = await snapshot(factory);

    await expect(openStore({ factory })).rejects.toThrow(new StorageError("newer-version"));

    const database = await rawOpen(factory);
    expect(database.version).toBe(NEXT_VERSION);
    expect(await contentsOf(database)).toEqual(before);
  });
});

describe("another tab upgrades", () => {
  it("@req DATA-005 an open store closes for the upgrade of a newer version, does not block it and says so", async () => {
    const factory = freshFactory();
    const replaced = vi.fn<() => void>();
    const store = await openStore({ factory, onVersionChange: replaced });
    const blocked = vi.fn<() => void>();

    const newer = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = factory.open("english-drill-book", NEXT_VERSION);
      request.addEventListener("blocked", blocked);
      request.addEventListener("upgradeneeded", () => {
        for (const migrate of migrationsWithNext.slice(NEXT_VERSION)) {
          migrate?.(request.result, request.transaction!);
        }
      });
      request.addEventListener("success", () => resolve(request.result));
      request.addEventListener("error", () => reject(request.error));
    });

    expect(newer.version).toBe(NEXT_VERSION);
    expect(blocked).not.toHaveBeenCalled();
    expect(replaced).toHaveBeenCalledOnce();
    await expect(store.getPacks()).rejects.toThrow(new StorageError("newer-version"));
  });
});
