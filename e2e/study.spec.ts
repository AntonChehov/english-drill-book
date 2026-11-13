import { databaseOf } from "./demo";
import {
  announced,
  answers11,
  answers13,
  checkButton,
  exerciseOf,
  expect,
  failNextAttempts,
  fieldOf,
  fill,
  menuOf,
  openUnit,
  refuseAttempts,
  rowAction,
  rowOf,
  test,
  unitHeading,
} from "./study";

interface LoggedAttempt {
  exercise: string;
  action: string;
  answers: Record<string, string>;
  results: Record<string, string>;
  revealed?: string[];
  overridden?: Record<string, string>;
  complete: boolean;
}

/** The attempts in the log, in the order they were written. */
async function logOf(page: import("@playwright/test").Page): Promise<LoggedAttempt[]> {
  const { stores } = await databaseOf(page);
  return ((stores["attempts"] ?? []) as (LoggedAttempt & { at: string })[]).toSorted((a, b) =>
    a.at < b.at ? -1 : 1,
  );
}

const exercisesOf = (page: import("@playwright/test").Page) =>
  page.getByRole("heading", { level: 3 });

test.describe("PLAY-001 Two panels", () => {
  test(
    "@req PLAY-001 a unit shows its pages and its exercises 1.1, 1.2 and 1.3 in order; next and previous move between units, disabled at the ends",
    { tag: "@demo" },
    async ({ page }) => {
      await openUnit(page, "1");

      await expect(unitHeading(page)).toHaveText("Раздел 1. To be: am, is, are");
      const pages = page.getByRole("img", { name: /^Страница \d+$/ });
      expect(
        await pages.evaluateAll((all) => all.map((each) => each.getAttribute("aria-label"))),
      ).toEqual(["Страница 3", "Страница 4"]);
      await expect(exercisesOf(page)).toHaveText([
        "Упражнение 1.1",
        "Упражнение 1.2",
        "Упражнение 1.3",
      ]);
      const previous = page.getByRole("button", { name: "Предыдущий раздел" });
      const next = page.getByRole("button", { name: "Следующий раздел" });
      await expect(previous).toBeDisabled();

      await next.click();
      await expect(unitHeading(page)).toHaveText("Раздел 2. Present simple");
      await expect(exercisesOf(page)).toHaveText([
        "Упражнение 2.1",
        "Упражнение 2.2",
        "Упражнение 2.3",
      ]);
      await previous.click();
      await expect(unitHeading(page)).toHaveText("Раздел 1. To be: am, is, are");

      await openUnit(page, "4");
      await expect(next).toBeDisabled();
      await expect(previous).toBeEnabled();
    },
  );
});

test.describe("PLAY-002 Items and PLAY-015 No help from the browser", () => {
  test(
    "@req PLAY-002 @req PLAY-015 a typed item has its number, prompt and a field with the browser's help off; an item with options is answered by choosing",
    { tag: "@demo" },
    async ({ page }) => {
      await openUnit(page, "1");
      const typed = exerciseOf(page, "1.1");
      const first = rowOf(typed, "1");
      await expect(first).toContainText("1");
      await expect(first).toContainText("My name ___ Marta.");
      await expect(fieldOf(typed, "1")).toBeVisible();

      const fields = page.locator("input[type=text], textarea");
      expect(await fields.count()).toBeGreaterThan(10);
      for (const field of await fields.all()) {
        await expect(field).toHaveAttribute("autocomplete", "off");
        await expect(field).toHaveAttribute("autocorrect", "off");
        await expect(field).toHaveAttribute("autocapitalize", "off");
        await expect(field).toHaveAttribute("spellcheck", "false");
        await expect(field).toHaveAttribute("lang", "en");
      }

      const choices = exerciseOf(page, "1.2");
      const group = choices.getByRole("group", { name: /^Пункт 1\. The keys/ });
      await expect(group.getByRole("radio")).toHaveCount(2);
      await group.getByRole("radio", { name: "are" }).check();
      await checkButton(choices).click();
      await expect(rowOf(choices, "1")).toContainText("✓ Верно");
    },
  );
});

test.describe("PLAY-003 – PLAY-006 Checking", () => {
  test(
    "@req PLAY-003 @req PLAY-004 @req PLAY-006 three verdicts with their signs, nothing on a blank row, almost shows no answer and is not done, and the check is in the log",
    { tag: "@demo" },
    async ({ page }) => {
      await openUnit(page, "1");
      const exercise = exerciseOf(page, "1.3");
      await fill(exercise, {
        "1": answers13["1"],
        "2": "The bus is not lates",
        "3": "We is home",
      });
      await checkButton(exercise).click();

      await expect(rowOf(exercise, "1")).toContainText("✓ Верно");
      await expect(rowOf(exercise, "2")).toContainText("≈ Почти — проверьте написание");
      await expect(rowOf(exercise, "3")).toContainText("✗ Неверно");
      await expect(rowOf(exercise, "4")).not.toContainText(/Верно|Почти|Неверно/);
      await expect(rowOf(exercise, "2")).not.toContainText("Ответ:");
      await expect(exercise).toContainText("В работе");
      await expect(exercise).toContainText("верно 1 из 5");
      await expect(announced(page)).toHaveText("Упражнение 1.3: верно 1 из 5");

      const log = await logOf(page);
      expect(log).toEqual([
        expect.objectContaining({
          exercise: "1.3",
          action: "check",
          answers: { "1": answers13["1"], "2": "The bus is not lates", "3": "We is home" },
          results: { "1": "ok", "2": "near", "3": "bad" },
          complete: false,
        }),
      ]);

      // Almost and every other item right: still not done.
      await fill(exercise, { ...answers13, "2": "The bus is not lates" });
      await checkButton(exercise).click();
      await expect(exercise).toContainText("верно 4 из 5");
      await expect(exercise).toContainText("В работе");
    },
  );

  test(
    "@req PLAY-006 editing one answer clears its verdict at once, the others stay, and the next check judges the new answer",
    { tag: "@demo" },
    async ({ page }) => {
      await openUnit(page, "1");
      const exercise = exerciseOf(page, "1.1");
      await fill(exercise, answers11);
      await checkButton(exercise).click();
      await expect(exercise.getByText("✓")).toHaveCount(9);

      await fieldOf(exercise, "2").fill("is");
      await expect(rowOf(exercise, "2")).not.toContainText("Верно");
      await expect(rowOf(exercise, "1")).toContainText("✓ Верно");
      await expect(rowOf(exercise, "3")).toContainText("✓ Верно");

      await checkButton(exercise).click();
      await expect(rowOf(exercise, "2")).toContainText("✗ Неверно");
      await expect(exercise).toContainText("Сделано");
    },
  );

  test(
    "@req PLAY-006 a check the browser refuses to keep is said in the exercise with a repeat, and the repeat records it",
    { tag: "@demo" },
    async ({ page }) => {
      await refuseAttempts(page);
      await openUnit(page, "1");
      const exercise = exerciseOf(page, "1.3");
      await fill(exercise, { "1": answers13["1"] });
      await failNextAttempts(page);
      await checkButton(exercise).click();

      const alert = exercise.getByRole("alert");
      await expect(alert).toContainText(
        "Результат проверки не удалось сохранить в этом браузере. Повторите, пожалуйста.",
      );
      await expect(rowOf(exercise, "1")).not.toContainText("Верно");
      expect(await logOf(page)).toEqual([]);

      await alert.getByRole("button", { name: "Повторить" }).click();
      await expect(alert).toHaveCount(0);
      await expect(rowOf(exercise, "1")).toContainText("✓ Верно");
      expect(await logOf(page)).toEqual([
        expect.objectContaining({ action: "check", results: { "1": "ok" } }),
      ]);
    },
  );
});

test.describe("PLAY-005 Drafts", () => {
  test(
    "@req PLAY-005 answers typed and not checked are in their fields after a reload, and a checked exercise comes back with its verdicts",
    { tag: "@demo" },
    async ({ page }) => {
      await openUnit(page, "1");
      const typed = exerciseOf(page, "1.1");
      await fill(typed, { "1": "is", "2": "am", "3": "are", "4": "is" });
      const checked = exerciseOf(page, "1.3");
      await fill(checked, { "1": answers13["1"], "2": "The bus late" });
      await checkButton(checked).click();
      await expect(rowOf(checked, "2")).toContainText("✗ Неверно");
      await expect.poll(async () => (await databaseOf(page)).stores["drafts"]?.length).toBe(2);

      await page.reload();
      await expect(unitHeading(page)).toBeVisible();

      for (const [item, answer] of Object.entries({
        "1": "is",
        "2": "am",
        "3": "are",
        "4": "is",
      })) {
        await expect(fieldOf(typed, item)).toHaveValue(answer);
      }
      await expect(fieldOf(typed, "5")).toHaveValue("");
      await expect(typed).toContainText("В работе");
      await expect(fieldOf(checked, "1")).toHaveValue(answers13["1"]);
      await expect(fieldOf(checked, "2")).toHaveValue("The bus late");
      await expect(rowOf(checked, "1")).toContainText("✓ Верно");
      await expect(rowOf(checked, "2")).toContainText("✗ Неверно");
    },
  );
});

test.describe("PLAY-007 One answer at a time", () => {
  test(
    "@req PLAY-007 the answer of item 3 alone is shown before any check and the log records it; nothing reveals a whole exercise",
    { tag: "@demo" },
    async ({ page }) => {
      await openUnit(page, "3");
      const exercise = exerciseOf(page, "3.3");
      await rowAction(exercise, "3", "Показать ответ");

      await expect(rowOf(exercise, "3")).toContainText(
        "Ответ: My uncle is a farmer или He is a farmer",
      );
      await expect(exercise.getByText("Ответ:")).toHaveCount(1);
      await expect(menuOf(exercise, "3")).toBeFocused();
      expect(await logOf(page)).toEqual([
        expect.objectContaining({ exercise: "3.3", action: "reveal", revealed: ["3"] }),
      ]);

      for (const name of [/все ответы/i, /показать ключ/i, /ответы упражнения/i]) {
        await expect(page.getByRole("button", { name })).toHaveCount(0);
      }
      await fill(exercise, { "1": "Priya is a doctor" });
      await checkButton(exercise).click();
      await expect(page.getByRole("button", { name: /все ответы|ключ/i })).toHaveCount(0);
    },
  );
});

test.describe("PLAY-008 – PLAY-010 The last word and done", () => {
  test(
    "@req PLAY-008 @req PLAY-009 a wrong row counted as correct by hand completes the exercise; a correct row counted as wrong takes it back; undo returns the app's verdict",
    { tag: "@demo" },
    async ({ page }) => {
      await openUnit(page, "1");
      const exercise = exerciseOf(page, "1.3");
      await fill(exercise, { ...answers13, "5": "Kofi and Nell is not friends" });
      await checkButton(exercise).click();
      await expect(rowOf(exercise, "5")).toContainText("✗ Неверно");
      await expect(exercise).toContainText("В работе");

      await rowAction(exercise, "5", "Засчитать");
      await expect(rowOf(exercise, "5")).toContainText("✓ Верно · засчитано вручную");
      await expect(exercise).toContainText("Сделано");
      await expect(page.getByText("сделано 1 из 3")).toBeVisible();

      await rowAction(exercise, "1", "Не засчитывать");
      await expect(rowOf(exercise, "1")).toContainText("✗ Неверно · не засчитано вручную");
      await expect(exercise).toContainText("В работе");

      await rowAction(exercise, "1", "Отменить");
      await expect(rowOf(exercise, "1")).toContainText("✓ Верно");
      await expect(rowOf(exercise, "1")).not.toContainText("вручную");
      await expect(exercise).toContainText("Сделано");
    },
  );

  test(
    "@req PLAY-009 @req PLAY-010 every item correct makes the exercise done; counting a row wrong takes it back and undo returns it; a later wrong answer leaves it done",
    { tag: "@demo" },
    async ({ page }) => {
      await openUnit(page, "1");
      const exercise = exerciseOf(page, "1.1");
      await fill(exercise, answers11);
      await checkButton(exercise).click();
      await expect(exercise).toContainText("✓ Сделано");

      await rowAction(exercise, "4", "Не засчитывать");
      await expect(exercise).toContainText("В работе");
      await rowAction(exercise, "4", "Отменить");
      await expect(exercise).toContainText("✓ Сделано");

      await fieldOf(exercise, "4").fill("are");
      await checkButton(exercise).click();
      await expect(rowOf(exercise, "4")).toContainText("✗ Неверно");
      await expect(exercise).toContainText("✓ Сделано");
    },
  );
});

test.describe("PLAY-011 States and counts", () => {
  test(
    "@req PLAY-011 one exercise done, one with answers typed and one untouched: the header says one of three, each exercise names its state",
    { tag: "@demo" },
    async ({ page }) => {
      await openUnit(page, "1");
      const header = page.locator("header", { has: unitHeading(page) });
      await expect(header).toContainText("сделано 0 из 3");
      await expect(exerciseOf(page, "1.1")).toContainText("Не начато");

      await fill(exerciseOf(page, "1.1"), answers11);
      await checkButton(exerciseOf(page, "1.1")).click();
      await fill(exerciseOf(page, "1.3"), { "1": "I am" });

      await expect(header).toContainText("сделано 1 из 3");
      await expect(exerciseOf(page, "1.1")).toContainText("Сделано");
      await expect(exerciseOf(page, "1.2")).toContainText("Не начато");
      await expect(exerciseOf(page, "1.3")).toContainText("В работе");
    },
  );
});

test.describe("PLAY-013 Open exercises", () => {
  test(
    "@req PLAY-013 writing freely gives no verdict, the sample shows only when asked for, and marking it done counts in the unit",
    { tag: "@demo" },
    async ({ page }) => {
      await openUnit(page, "4");
      const exercise = exerciseOf(page, "4.3");
      await exercise
        .getByRole("textbox", { name: "Ваш текст" })
        .fill("There is a lamp on my desk.");
      await expect(exercise).not.toContainText(/Верно|Неверно|Почти/);
      await expect(exercise.getByText("Образец", { exact: true })).toHaveCount(0);
      await expect(exercise.getByRole("button", { name: "Проверить" })).toHaveCount(0);

      await exercise.getByRole("button", { name: "Показать образец" }).click();
      await expect(exercise.getByText("Образец", { exact: true })).toBeVisible();
      await expect(exercise).toContainText("There is a bed next to the window.");

      await exercise.getByRole("button", { name: "Отметить как сделанное" }).click();
      await expect(exercise).toContainText("✓ Сделано");
      await expect(page.getByText("сделано 1 из 3")).toBeVisible();
      expect((await logOf(page)).map(({ action }) => action)).toEqual(["reveal", "mark-done"]);
    },
  );

  test(
    "@req PLAY-013 the connected text is presented like an open exercise, its model as the sample",
    { tag: "@demo" },
    async ({ page }) => {
      await openUnit(page, "2");
      const exercise = exerciseOf(page, "2.3");
      await expect(exercise.getByRole("textbox", { name: "Ваш текст" })).toBeVisible();
      await expect(exercise.getByRole("button", { name: "Отметить как сделанное" })).toBeVisible();
      await exercise.getByRole("button", { name: "Показать образец" }).click();
      await expect(exercise).toContainText("Omar lives in a flat near the river.");
    },
  );
});
