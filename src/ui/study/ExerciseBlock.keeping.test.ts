// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StorageError } from "../../storage/db/errors";
import { getStore } from "../storage";
import {
  buttonNamed,
  click,
  exerciseOf,
  fieldOf,
  freshStorage,
  markDoneElsewhere,
  mountStudy,
  seededStore,
  stubObservers,
  stubScreen,
  textOf,
  type,
} from "../testing/study.fixture";

vi.mock("../../storage/pdf/render", () => ({
  openPdf: async () => ({
    count: 12,
    size: async () => ({ width: 595, height: 842 }),
    draw: async () => undefined,
    destroy: () => undefined,
  }),
}));

const drills = "/study/demo-drills/1";

beforeEach(async () => {
  await freshStorage();
  stubObservers();
  stubScreen(false);
  vi.stubGlobal("fetch", async () => new Response(new Uint8Array([1])));
  await seededStore();
});

afterEach(() => {
  vi.useRealTimers();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

const statusOf = (exercise: HTMLElement) => textOf(exercise.querySelector(".state")!);

describe("drafts", () => {
  it("@req PLAY-005 answers typed are saved once typing pauses and are back when the unit is reopened", async () => {
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout"] });
    const { app } = await mountStudy(drills);
    const field = fieldOf(exerciseOf("1.1"), "1");

    await type(field, "Are you");
    expect(await (await getStore()).getDraft("demo-drills", "1.1")).toBeUndefined();
    await vi.advanceTimersByTimeAsync(400);

    await vi.waitFor(async () =>
      expect((await (await getStore()).getDraft("demo-drills", "1.1"))?.answers).toEqual({
        "1": "Are you",
      }),
    );
    app.unmount();
    document.body.innerHTML = "";
    await mountStudy(drills);
    expect(fieldOf(exerciseOf("1.1"), "1").value).toBe("Are you");
  });

  it("@req PLAY-005 an answer typed is kept when the screen is left at once", async () => {
    const { app } = await mountStudy(drills);
    await type(fieldOf(exerciseOf("1.1"), "1"), "Are you");

    app.unmount();

    await vi.waitFor(async () =>
      expect((await (await getStore()).getDraft("demo-drills", "1.1"))?.answers).toEqual({
        "1": "Are you",
      }),
    );
  });

  it("@req DATA-004 a draft that cannot be written is said so in the header", async () => {
    await mountStudy(drills);
    vi.spyOn(await getStore(), "putDraft").mockRejectedValue(new StorageError("quota"));
    const field = fieldOf(exerciseOf("1.1"), "1");

    await type(field, "Are you");
    field.dispatchEvent(new FocusEvent("blur"));

    await vi.waitFor(() =>
      expect(document.body.textContent).toContain("Не удалось сохранить черновик"),
    );
  });
});

describe("a result that cannot be kept", () => {
  it("@req DATA-004 is not shown as kept; the exercise says why and the check is repeated by a button", async () => {
    await mountStudy(drills);
    const exercise = exerciseOf("1.1");
    const store = await getStore();
    vi.spyOn(store, "appendAttempt").mockRejectedValueOnce(new StorageError("quota"));
    await type(fieldOf(exercise, "1"), "Are you ready");

    await click(buttonNamed("Проверить", exercise));

    await vi.waitFor(() => expect(textOf(exercise)).toContain("на устройстве не хватает места"));
    expect(textOf(exercise)).not.toContain("Верно");
    await click(buttonNamed("Повторить", exercise));
    await vi.waitFor(() => expect(textOf(exercise)).toContain("Верно"));
    expect(textOf(exercise)).not.toContain("не хватает места");
  });

  it("@req DATA-004 says when the browser forbids the site to keep data", async () => {
    await mountStudy(drills);
    const exercise = exerciseOf("1.2");
    vi.spyOn(await getStore(), "appendAttempt").mockRejectedValueOnce(
      new StorageError("unavailable"),
    );

    await click(buttonNamed("Выполнить упражнение", exercise));

    await vi.waitFor(() =>
      expect(textOf(exercise)).toContain("не разрешает этому сайту хранить данные"),
    );
    expect(statusOf(exercise)).not.toContain("Сделано");
  });

  it("@req DATA-004 a revealed key is not shown when it could not be kept", async () => {
    await mountStudy(drills);
    const exercise = exerciseOf("1.1");
    vi.spyOn(await getStore(), "appendAttempt").mockRejectedValueOnce(new Error("disk"));

    await click(buttonNamed("Действия: пункт 1", exercise));
    await click(buttonNamed("Показать ответ", exercise));

    await vi.waitFor(() => expect(textOf(exercise)).toContain("не удалось записать"));
    expect(textOf(exercise)).not.toContain("Ответ: Are you ready");
  });
});

describe("another tab", () => {
  it("@req DATA-012 an attempt made in another tab is shown when the window gains the focus", async () => {
    await mountStudy(drills);
    const exercise = exerciseOf("1.2");
    expect(statusOf(exercise)).toContain("Не начато");

    await markDoneElsewhere("demo-drills", "1.2");
    window.dispatchEvent(new Event("focus"));

    await vi.waitFor(() => expect(statusOf(exercise)).toContain("Сделано"));
  });

  it("@req DATA-012 the answer being typed is not replaced by what another tab wrote", async () => {
    await mountStudy(drills);
    const exercise = exerciseOf("1.1");
    const field = fieldOf(exercise, "1");
    await type(field, "Are you rea");
    // The draft is stored first: an answer not stored is never read over.
    field.dispatchEvent(new FocusEvent("blur"));
    await vi.waitFor(async () =>
      expect(await (await getStore()).getDraft("demo-drills", "1.1")).toBeDefined(),
    );
    field.focus();
    await markDoneElsewhere("demo-drills", "1.1");

    window.dispatchEvent(new Event("focus"));

    await vi.waitFor(() => expect(statusOf(exercise)).toContain("Сделано"));
    expect(field.value).toBe("Are you rea");
  });
});
