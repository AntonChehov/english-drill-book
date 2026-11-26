// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getStore } from "../storage";
import {
  buttonNamed,
  buttonsNamed,
  click,
  exerciseOf,
  flushPromises,
  fieldOf,
  freshStorage,
  mountStudy,
  optionOf,
  pressEnter,
  seededStore,
  stubObservers,
  stubScreen,
  textOf,
  type,
  statusOf,
  unitProgress,
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
const course = "/study/demo-course";

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

/** Types the right answers of exercise 1.1 of the drill book into its fields. */
async function answerAll(exercise: HTMLElement) {
  const answers = [
    "Are you ready",
    "Is the museum open",
    "Are your parents at home",
    "Is Nell your sister",
    "Is it far from here",
    "Are we late",
  ];
  for (const [index, answer] of answers.entries()) {
    await type(fieldOf(exercise, String(index + 1)), answer);
  }
}

describe("an exercise with a field for each item", () => {
  it("@req PLAY-002 shows each item's prompt with a text field, or its options when it has choices", async () => {
    await mountStudy(drills);

    const first = exerciseOf("1.1");
    expect(fieldOf(first, "1").type).toBe("text");
    expect(textOf(first)).toContain("you / ready");
    expect(optionOf(exerciseOf("1.3"), "1", "is").type).toBe("radio");
    expect(optionOf(exerciseOf("1.3"), "1", "are").type).toBe("radio");
  });

  it("@req PLAY-015 the fields turn off the browser's correction of what is typed", async () => {
    await mountStudy(drills);

    const field = fieldOf(exerciseOf("1.1"), "1");

    expect(field.getAttribute("autocomplete")).toBe("off");
    expect(field.getAttribute("autocorrect")).toBe("off");
    expect(field.getAttribute("autocapitalize")).toBe("off");
    expect(field.getAttribute("spellcheck")).toBe("false");
  });

  it("@req PLAY-003 checking gives a verdict in words for each item that has an answer", async () => {
    await mountStudy(drills);
    const exercise = exerciseOf("1.1");

    await type(fieldOf(exercise, "1"), "Are you ready");
    await type(fieldOf(exercise, "2"), "Is the museum closed");
    await click(buttonNamed("Проверить", exercise));

    await vi.waitFor(() => expect(textOf(exercise)).toContain("верно 1 из 6"));
    const rows = [...exercise.querySelectorAll("li")];
    expect(textOf(rows[0]!)).toContain("Верно");
    expect(textOf(rows[1]!)).toContain("Неверно");
    expect(textOf(rows[2]!)).not.toMatch(/Верно|Неверно|Почти/);
  });

  it("@req PLAY-004 a slip in a long word is almost right, asks to check the spelling and does not reveal the key", async () => {
    await mountStudy(drills);
    const exercise = exerciseOf("1.1");

    await type(fieldOf(exercise, "2"), "Is the museun open");
    await click(buttonNamed("Проверить", exercise));

    await vi.waitFor(() => expect(textOf(exercise)).toContain("Почти — проверьте написание"));
    expect(textOf(exercise)).not.toContain("Ответ:");
  });

  it("@req PLAY-006 editing an answer after a check clears its verdict until the next check", async () => {
    await mountStudy(drills);
    const exercise = exerciseOf("1.1");
    await type(fieldOf(exercise, "1"), "Are you ready");
    await click(buttonNamed("Проверить", exercise));
    await vi.waitFor(() => expect(textOf(exercise)).toContain("Верно"));

    await type(fieldOf(exercise, "1"), "Are you");

    expect(textOf(exercise)).not.toContain("Верно");
  });

  it("@req PROD-007 Enter in a field checks the exercise and the focus stays in the field", async () => {
    await mountStudy(drills);
    const exercise = exerciseOf("1.1");
    const field = fieldOf(exercise, "1");
    await type(field, "Are you ready");

    await pressEnter(field);

    await vi.waitFor(() => expect(textOf(exercise)).toContain("Верно"));
    expect(document.activeElement).toBe(field);
  });

  it("@req PROD-007 Enter that confirms a composed character does not check", async () => {
    await mountStudy(drills);
    const exercise = exerciseOf("1.1");
    const field = fieldOf(exercise, "1");
    await type(field, "Are you ready");

    await pressEnter(field, { isComposing: true });

    expect(textOf(exercise)).not.toContain("Верно");
  });

  it("@req PLAY-003 checking with every field empty says there is nothing to check and records nothing", async () => {
    await mountStudy(drills);
    const exercise = exerciseOf("1.1");

    await click(buttonNamed("Проверить", exercise));

    expect(textOf(exercise)).toContain("Введите хотя бы один ответ");
    expect(await (await getStore()).getAttempts("demo-drills", "1.1")).toEqual([]);
  });

  it("@req PLAY-009 an exercise whose items all check out is done, and the header counts it", async () => {
    await mountStudy(drills);
    const exercise = exerciseOf("1.1");
    expect(statusOf(exercise)).toContain("Не начато");

    await answerAll(exercise);
    await click(buttonNamed("Проверить", exercise));

    await vi.waitFor(() => expect(statusOf(exercise)).toContain("Сделано"));
    expect(statusOf(exercise)).toContain("верно 6 из 6");
    expect(unitProgress()).toContain("сделано 1 из 3");
    expect(buttonsNamed("Выполнить упражнение", exercise)).toHaveLength(0);
  });

  it("@req PLAY-011 an exercise with some answers checked is in progress", async () => {
    await mountStudy(drills);
    const exercise = exerciseOf("1.1");
    await type(fieldOf(exercise, "1"), "Are you ready");

    await click(buttonNamed("Проверить", exercise));

    await vi.waitFor(() => expect(statusOf(exercise)).toContain("В работе"));
  });

  it("@req PLAY-002 an item with choices is answered by picking an option and checked", async () => {
    await mountStudy(drills);
    const exercise = exerciseOf("1.3");

    optionOf(exercise, "1", "are").checked = true;
    optionOf(exercise, "1", "are").dispatchEvent(new Event("change", { bubbles: true }));
    optionOf(exercise, "2", "aren't").checked = true;
    optionOf(exercise, "2", "aren't").dispatchEvent(new Event("change", { bubbles: true }));
    await click(buttonNamed("Проверить", exercise));

    await vi.waitFor(() => expect(textOf(exercise)).toContain("верно 1 из 6"));
  });
});

describe("the menu of an item", () => {
  it("@req PLAY-007 reveals the key of one item, before any check, and returns the focus to the menu button", async () => {
    await mountStudy(drills);
    const exercise = exerciseOf("1.1");

    const toggle = buttonNamed("Действия: пункт 1", exercise);
    await click(toggle);
    expect(toggle.getAttribute("aria-expanded")).toBe("true");
    await click(buttonNamed("Показать ответ", exercise));

    await vi.waitFor(() => expect(textOf(exercise)).toContain("Ответ: Are you ready"));
    expect(document.activeElement).toBe(toggle);
    expect(textOf(exercise)).not.toContain("Is the museum open");
  });

  it("@req PLAY-007 a key already shown is not offered again", async () => {
    await mountStudy(drills);
    const exercise = exerciseOf("1.1");
    await click(buttonNamed("Действия: пункт 1", exercise));
    await click(buttonNamed("Показать ответ", exercise));
    await vi.waitFor(() => expect(textOf(exercise)).toContain("Ответ: Are you ready"));

    await click(buttonNamed("Действия: пункт 1", exercise));

    expect(buttonsNamed("Показать ответ", exercise)).toHaveLength(0);
    expect(textOf(exercise)).toContain("Ответ уже показан");
  });

  it("@req PLAY-008 counts a wrong answer by hand and takes it back", async () => {
    await mountStudy(drills);
    const exercise = exerciseOf("1.1");
    await type(fieldOf(exercise, "1"), "Is you ready");
    await click(buttonNamed("Проверить", exercise));
    await vi.waitFor(() => expect(textOf(exercise)).toContain("Неверно"));

    await click(buttonNamed("Действия: пункт 1", exercise));
    await click(buttonNamed("Засчитать", exercise));
    await vi.waitFor(() => expect(textOf(exercise)).toContain("засчитано вручную"));
    expect(textOf(exercise)).toContain("верно 1 из 6");

    await click(buttonNamed("Действия: пункт 1", exercise));
    await click(buttonNamed("Отменить", exercise));
    await vi.waitFor(() => expect(textOf(exercise)).not.toContain("засчитано вручную"));
    expect(textOf(exercise)).toContain("верно 0 из 6");
  });

  it("@req PLAY-008 counts a right answer as wrong by hand", async () => {
    await mountStudy(drills);
    const exercise = exerciseOf("1.1");
    await type(fieldOf(exercise, "1"), "Are you ready");
    await click(buttonNamed("Проверить", exercise));
    await vi.waitFor(() => expect(textOf(exercise)).toContain("Верно"));

    await click(buttonNamed("Действия: пункт 1", exercise));
    await click(buttonNamed("Не засчитывать", exercise));

    await vi.waitFor(() => expect(textOf(exercise)).toContain("не засчитано вручную"));
  });

  it("@req PROD-007 Escape closes the menu and returns the focus to its button", async () => {
    await mountStudy(drills);
    const exercise = exerciseOf("1.1");
    const toggle = buttonNamed("Действия: пункт 1", exercise);
    await click(toggle);
    buttonNamed("Показать ответ", exercise).focus();

    buttonNamed("Показать ответ", exercise).dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
    await flushPromises();

    expect(toggle.getAttribute("aria-expanded")).toBe("false");
    expect(buttonsNamed("Показать ответ", exercise)).toHaveLength(0);
    expect(document.activeElement).toBe(toggle);
  });
});

describe("marking an exercise done", () => {
  it("@req PLAY-021 makes the exercise done with nothing typed, and the focus goes to its number", async () => {
    await mountStudy(drills);
    const exercise = exerciseOf("1.2");
    const mark = buttonNamed("Выполнить упражнение", exercise);
    mark.focus();

    await click(mark);

    await vi.waitFor(() => expect(statusOf(exercise)).toContain("Сделано"));
    expect(buttonsNamed("Выполнить упражнение", exercise)).toHaveLength(0);
    expect(document.activeElement).toBe(buttonNamed("Упражнение 1.2", exercise));
    expect(unitProgress()).toContain("сделано 1 из 3");
  });

  it("@req PLAY-010 an exercise stays done when it is answered wrongly later", async () => {
    await mountStudy(drills);
    const exercise = exerciseOf("1.1");
    await answerAll(exercise);
    await click(buttonNamed("Проверить", exercise));
    await vi.waitFor(() => expect(statusOf(exercise)).toContain("Сделано"));

    await type(fieldOf(exercise, "1"), "Is you ready");
    await click(buttonNamed("Проверить", exercise));

    await vi.waitFor(() => expect(textOf(exercise)).toContain("Неверно"));
    expect(statusOf(exercise)).toContain("Сделано");
  });
});

describe("an exercise with a text", () => {
  it("@req PLAY-013 an open exercise has one field, shows the sample on request and is marked done", async () => {
    await mountStudy(`${course}/4`);
    const exercise = exerciseOf("4.3");
    const field = exercise.querySelector("textarea")!;

    expect(field.getAttribute("spellcheck")).toBe("false");
    expect(textOf(exercise)).not.toContain("Образец");
    await click(buttonNamed("Показать образец", exercise));
    await vi.waitFor(() => expect(textOf(exercise)).toContain("Образец"));
    expect(buttonsNamed("Показать образец", exercise)).toHaveLength(0);

    await click(buttonNamed("Выполнить упражнение", exercise));
    await vi.waitFor(() => expect(statusOf(exercise)).toContain("Сделано"));
  });

  it("@req PLAY-005 the text typed in a field is kept when it loses the focus and shown again on reopening", async () => {
    const { app } = await mountStudy(`${course}/2`);
    const field = exerciseOf("2.3").querySelector("textarea")!;

    await type(field, "Omar lives in a flat.");
    field.dispatchEvent(new FocusEvent("blur"));
    await vi.waitFor(async () =>
      expect((await (await getStore()).getDraft("demo-course", "2.3"))?.answers).toEqual({
        text: "Omar lives in a flat.",
      }),
    );
    app.unmount();
    document.body.innerHTML = "";
    await mountStudy(`${course}/2`);

    expect(exerciseOf("2.3").querySelector("textarea")!.value).toBe("Omar lives in a flat.");
  });
});
