import { describe, expect, it } from "vitest";
import { DemoError } from "./add-demo";
import { StorageError } from "../../storage/db/errors";
import { failureMessage, failureOf, keepFailureMessage, progressMessage } from "./messages";

const book = "Everyday Grammar: Demo Drills";

describe("messages of the demo section", () => {
  it("@req PACK-003 says which book is being read", () => {
    expect(progressMessage({ book, index: 2, count: 2 })).toBe(`Читаем книгу 2 из 2: «${book}»…`);
  });

  it("@req PACK-003 takes the failure of the demo, and counts a module that did not arrive as the network", () => {
    const failure = { kind: "status", book, status: 404 } as const;
    expect(failureOf(new DemoError(failure))).toEqual(failure);
    expect(failureOf(new TypeError("Failed to fetch dynamically imported module"))).toBe("network");
    expect(failureOf(new Error("something else"))).toBeUndefined();
  });

  it("@req PACK-003 explains each failure in Russian", () => {
    expect(failureMessage("network")).toMatch(
      /^Не удалось загрузить демо-книги: нет связи с сайтом/u,
    );
    expect(failureMessage(undefined)).toMatch(/непредвиденной ошибки/u);
    expect(failureMessage({ kind: "network", book })).toMatch(/нет связи с сайтом/u);
    expect(failureMessage({ kind: "status", book, status: 503 })).toMatch(/\(ошибка 503\)/u);
    expect(failureMessage({ kind: "unreadable", book })).toMatch(/повреждён или не той версии/u);
    expect(failureMessage({ kind: "insecure", book })).toMatch(/незащищённому адресу.*https:\/\//u);
  });
});

describe("messages when the demo cannot be kept", () => {
  it("@req DATA-004 says in Russian that the books were read and not kept, and why when it is known", () => {
    const start = /^Демо-книги прочитаны, но сохранить их в этом браузере не удалось/u;
    for (const error of [
      new StorageError("unavailable"),
      new StorageError("quota"),
      new StorageError("failed"),
      new Error("anything else"),
    ]) {
      expect(keepFailureMessage(error)).toMatch(start);
      expect(keepFailureMessage(error)).toMatch(/попробуйте ещё раз\.$/iu);
      expect(keepFailureMessage(error)).not.toMatch(/IndexedDB|storage|quota|error/iu);
    }
    expect(keepFailureMessage(new StorageError("unavailable"))).toMatch(
      /браузер не разрешает этому сайту хранить данные/u,
    );
    expect(keepFailureMessage(new StorageError("quota"))).toMatch(/не хватает места/u);
    expect(keepFailureMessage(new StorageError("failed"))).toBe(
      "Демо-книги прочитаны, но сохранить их в этом браузере не удалось. Попробуйте ещё раз.",
    );
  });
});
