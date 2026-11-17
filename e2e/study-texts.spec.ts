import { AxeBuilder } from "@axe-core/playwright";
import type { Locator, Page } from "@playwright/test";
import { addedHeading, databaseName, databaseOf } from "./demo";
import {
  answers11,
  checkButton,
  exerciseOf,
  expect,
  fill,
  openUnit,
  rowOf,
  test,
  unitHeading,
} from "./study";
import { addressOf } from "./views";

/** The block «Объяснение» of the open unit (PLAY-020). */
const explanation = (page: Page) =>
  page.locator("details").filter({ has: page.locator("summary", { hasText: "Объяснение" }) });

const exercisesHeading = (page: Page) =>
  page.getByRole("heading", { level: 2, name: "Упражнения" });

/** The book's task of an exercise, the first English paragraph of its block. */
const taskOf = (exercise: Locator) => exercise.locator("p[lang=en]").first();

const help11 = "Впишите в пропуск am, is или are.";

/**
 * Rewrites the stored demo packs as an earlier app left them: `version` set when given, and the
 * `theory` and `help` of `stripped` units (every unit for "all") removed.
 */
function rewriteStoredPacks(page: Page, change: { version?: string; stripped: "all" | string }) {
  return page.evaluate(
    ({ name, wanted }) =>
      new Promise<void>((resolve, reject) => {
        const request = indexedDB.open(name);
        request.addEventListener("error", () => reject(request.error));
        request.addEventListener("success", () => {
          const database = request.result;
          const transaction = database.transaction("packs", "readwrite");
          const store = transaction.objectStore("packs");
          const all = store.getAll();
          all.addEventListener("success", () => {
            interface Stored {
              version: string;
              units: { id: string; theory?: string; exercises: { help?: string }[] }[];
            }
            for (const pack of all.result as Stored[]) {
              if (wanted.version !== undefined) pack.version = wanted.version;
              for (const unit of pack.units) {
                if (wanted.stripped !== "all" && unit.id !== wanted.stripped) continue;
                delete unit.theory;
                for (const exercise of unit.exercises) delete exercise.help;
              }
              store.put(pack);
            }
          });
          transaction.addEventListener("complete", () => {
            database.close();
            resolve();
          });
          transaction.addEventListener("error", () => reject(transaction.error));
        });
      }),
    { name: databaseName, wanted: change },
  );
}

test.describe("PLAY-020 The explanation and the help", () => {
  test("@req PLAY-020 @req PACK-004 unit 1 of the course opens with «Объяснение» before the exercises, its Russian paragraphs with the English in italics marked en, and the help of 1.1 between its task and item 1; axe finds nothing", async ({
    page,
  }) => {
    await openUnit(page, "1");
    await expect(unitHeading(page)).toHaveText("Раздел 1. Глагол to be: am, is, are");
    await expect(unitHeading(page).locator("[lang]")).toHaveCount(0);

    const block = explanation(page);
    await expect(block).toBeVisible();
    await expect(block).toHaveJSProperty("open", true);
    expect(
      await block.evaluate(
        (details, heading) =>
          Boolean(details.compareDocumentPosition(heading!) & Node.DOCUMENT_POSITION_FOLLOWING),
        await exercisesHeading(page).elementHandle(),
      ),
      "the block comes before the card «Упражнения»",
    ).toBe(true);
    const paragraphs = block.locator("p");
    expect(await paragraphs.count()).toBeGreaterThanOrEqual(2);
    await expect(paragraphs.first()).toContainText("Глагол");
    await expect(paragraphs.first()).toContainText(/[а-яё]/iu);
    const english = paragraphs.first().locator("em[lang=en]");
    await expect(english.first()).toHaveText("be");
    expect(await english.first().evaluate((em) => getComputedStyle(em).fontStyle)).toBe("italic");
    await expect(block.locator("[lang=en]:not(em)")).toHaveCount(0);

    const exercise = exerciseOf(page, "1.1");
    const help = exercise.getByText(help11, { exact: true });
    await expect(help).toBeVisible();
    await expect(help).not.toHaveAttribute("lang", /.+/u);
    const task = (await taskOf(exercise).boundingBox())!;
    const helpBox = (await help.boundingBox())!;
    const row = (await rowOf(exercise, "1").boundingBox())!;
    expect(task.y + task.height).toBeLessThanOrEqual(helpBox.y);
    expect(helpBox.y + helpBox.height).toBeLessThanOrEqual(row.y);
    await expect(taskOf(exercise)).toHaveText("Complete the sentences with am, is or are.");
    const prompt = rowOf(exercise, "1").locator("[lang=en]").first();
    await expect(prompt).toHaveText("My name ___ Marta.");

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();
    expect(
      results.violations
        .filter((violation) => ["serious", "critical"].includes(violation.impact ?? ""))
        .map((violation) => violation.id),
    ).toEqual([]);
  });

  test("@req PLAY-020 folding «Объяснение» leaves its title and moves the exercises up, by pointer and by keyboard; the unit opened again has it open", async ({
    page,
  }) => {
    await openUnit(page, "1");
    const block = explanation(page);
    const summary = block.locator("summary");
    const before = (await exercisesHeading(page).boundingBox())!.y;

    await summary.click();
    await expect(block).toHaveJSProperty("open", false);
    await expect(summary).toBeVisible();
    await expect(block.locator("p").first()).toBeHidden();
    expect((await exercisesHeading(page).boundingBox())!.y).toBeLessThan(before);

    await summary.focus();
    await page.keyboard.press("Enter");
    await expect(block).toHaveJSProperty("open", true);
    await expect(block.locator("p").first()).toBeVisible();
    await page.keyboard.press("Space");
    await expect(block).toHaveJSProperty("open", false);

    await page.getByRole("button", { name: "Следующий раздел" }).click();
    await expect(unitHeading(page)).toHaveText("Раздел 2. Present simple");
    await expect(explanation(page)).toHaveJSProperty("open", true);
    await page.getByRole("button", { name: "Предыдущий раздел" }).click();
    await expect(unitHeading(page)).toHaveText("Раздел 1. Глагол to be: am, is, are");
    await expect(explanation(page)).toHaveJSProperty("open", true);
  });

  test("@req PLAY-020 a unit without a theory has no «Объяснение», and an exercise without a help has nothing between its task and its items", async ({
    page,
  }) => {
    await page.goto(addressOf("/"));
    await expect(addedHeading(page)).toBeVisible();
    await rewriteStoredPacks(page, { stripped: "2" });

    await openUnit(page, "2");
    await expect(exercisesHeading(page)).toBeVisible();
    await expect(explanation(page)).toHaveCount(0);
    const exercise = exerciseOf(page, "2.1");
    await expect(taskOf(exercise)).toHaveText("Write the verb in brackets in the present simple.");
    expect(
      await taskOf(exercise).evaluate((task) => task.nextElementSibling?.tagName),
      "the items follow the task at once",
    ).toBe("OL");
    await expect(exercise.getByText(/Поставьте глагол из скобок/u)).toHaveCount(0);

    // The other units keep theirs.
    await openUnit(page, "1");
    await expect(explanation(page)).toBeVisible();
  });
});

test.describe("PACK-004 A pack of the earlier version", () => {
  test("@req PACK-004 the demo stored at 1.0.0 with a check on 1.1 is read again on the next visit: the packs carry the Russian texts and 1.1 is still done", async ({
    page,
  }) => {
    await openUnit(page, "1");
    const exercise = exerciseOf(page, "1.1");
    await fill(exercise, answers11);
    await checkButton(exercise).click();
    await expect(exercise).toContainText("Сделано");
    await rewriteStoredPacks(page, { version: "1.0.0", stripped: "all" });
    expect((await databaseOf(page)).stores["packs"]).toEqual([
      expect.objectContaining({ id: "demo-course", version: "1.0.0" }),
      expect.objectContaining({ id: "demo-drills", version: "1.0.0" }),
    ]);

    await page.goto(addressOf("/"));
    await expect(addedHeading(page)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Раздел 1. Глагол to be: am, is, are" }),
    ).toHaveCount(2);
    const packs = (await databaseOf(page)).stores["packs"] as {
      id: string;
      version: string;
      units: { theory?: string; exercises: { help?: string }[] }[];
    }[];
    expect(packs.map(({ id, version }) => ({ id, version }))).toEqual([
      { id: "demo-course", version: "1.1.0" },
      { id: "demo-drills", version: "1.1.0" },
    ]);
    for (const pack of packs) {
      for (const unit of pack.units) {
        expect(unit.theory).toMatch(/[а-яё]/iu);
        for (const found of unit.exercises) expect(found.help).toMatch(/[а-яё]/iu);
      }
    }

    await openUnit(page, "1");
    await expect(explanation(page)).toBeVisible();
    await expect(exerciseOf(page, "1.1")).toContainText("✓ Сделано");
    await expect(page.getByText("сделано 1 из 3")).toBeVisible();
    await expect(exerciseOf(page, "1.1").getByText(help11, { exact: true })).toBeVisible();
  });
});
