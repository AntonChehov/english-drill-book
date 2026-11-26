import { describe, expect, it } from "vitest";
import { StorageError } from "../../storage/db/errors";
import {
  byHandLabel,
  changedMessage,
  checkedMessage,
  doneOf,
  notKeptMessage,
  type KeptAction,
} from "./messages";

describe("what Study says", () => {
  it("@req PLAY-011 says how many exercises are done", () => {
    expect(doneOf(2, 5)).toBe("сделано 2 из 5");
  });

  it("@req PLAY-003 announces the score of a check and, when every item is right, that the exercise is done", () => {
    expect(checkedMessage("1.2", 4, 6, false)).toBe("Упражнение 1.2: верно 4 из 6");
    expect(checkedMessage("1.2", 6, 6, true)).toBe(
      "Упражнение 1.2: верно 6 из 6. Упражнение сделано",
    );
  });

  it("@req PLAY-008 says in which direction the learner changed a verdict, or that it was taken back", () => {
    expect(changedMessage("3", "count")).toBe("Пункт 3 засчитан вручную");
    expect(changedMessage("3", "uncount")).toBe("Пункт 3 не засчитан вручную");
    expect(changedMessage("3", "undo")).toBe("Пункт 3: ручная оценка отменена");
    expect(byHandLabel("ok")).toBe("засчитано вручную");
    expect(byHandLabel("bad")).toBe("не засчитано вручную");
  });
});

describe("why a result was not kept", () => {
  const actions: KeptAction[] = ["check", "reveal", "sample", "change", "mark-done"];

  it("@req DATA-004 names what was not kept, for each action", () => {
    const said = actions.map((action) => notKeptMessage(action, new Error("disk")));

    expect(said).toEqual([
      "Результат проверки не удалось сохранить в этом браузере. Повторите, пожалуйста.",
      "Ответ не показан: не удалось записать в этом браузере, что он был открыт. Повторите, пожалуйста.",
      "Образец не показан: не удалось записать в этом браузере, что он был открыт. Повторите, пожалуйста.",
      "Изменение оценки не удалось сохранить в этом браузере. Повторите, пожалуйста.",
      "Отметку «сделано» не удалось сохранить в этом браузере. Повторите, пожалуйста.",
    ]);
  });

  it("@req DATA-004 says that there is no room when the device is full, and what to do", () => {
    expect(notKeptMessage("check", new StorageError("quota"))).toContain(
      "на устройстве не хватает места. Освободите место и повторите.",
    );
  });

  it("@req DATA-004 says that the browser does not let the site keep data, and what to allow", () => {
    expect(notKeptMessage("check", new StorageError("unavailable"))).toContain(
      "браузер не разрешает этому сайту хранить данные. Разрешите сайту хранить данные и повторите.",
    );
  });
});
