// What Study says (design D4, D6, D7 of `study-screen`), in Russian with the polite "вы".

import type { Verdict } from "../../domain/checking";
import type { ExerciseStatus, RowChange } from "../../domain/study";
import { StorageError } from "../../storage/db/errors";

export const statusLabel: Record<ExerciseStatus, string> = {
  untouched: "Не начато",
  "in-progress": "В работе",
  done: "Сделано",
};

/** The sign and the words of a verdict (PLAY-003, PLAY-004). */
export const verdictLabel: Record<Verdict, { readonly sign: string; readonly text: string }> = {
  ok: { sign: "✓", text: "Верно" },
  near: { sign: "≈", text: "Почти — проверьте написание" },
  bad: { sign: "✗", text: "Неверно" },
};

/** The words of a verdict set by hand (PLAY-008). */
export function byHandLabel(verdict: Verdict): string {
  return verdict === "ok" ? "засчитано вручную" : "не засчитано вручную";
}

export const changeLabel: Record<RowChange, string> = {
  count: "Засчитать",
  uncount: "Не засчитывать",
  undo: "Отменить",
};

/** "сделано X из Y" (PLAY-011, PROG-014). */
export function doneOf(done: number, total: number): string {
  return `сделано ${done} из ${total}`;
}

/** What is announced after a check (D7): "Упражнение 1.2: верно 4 из 6". */
export function checkedMessage(exercise: string, ok: number, total: number, done: boolean): string {
  return `Упражнение ${exercise}: верно ${ok} из ${total}${done ? ". Упражнение сделано" : ""}`;
}

export function changedMessage(item: string, change: RowChange): string {
  if (change === "count") return `Пункт ${item} засчитан вручную`;
  if (change === "uncount") return `Пункт ${item} не засчитан вручную`;
  return `Пункт ${item}: ручная оценка отменена`;
}

export const revealedMessage = (item: string) => `Пункт ${item}: ответ показан`;
export const sampleMessage = (exercise: string) => `Упражнение ${exercise}: образец показан`;
export const markedDoneMessage = (exercise: string) =>
  `Упражнение ${exercise} отмечено как сделанное`;
export const nothingToCheck = "Введите хотя бы один ответ, чтобы проверить упражнение.";

/** What could not be kept, by the action that was refused. */
export type KeptAction = "check" | "reveal" | "sample" | "change" | "mark-done";

const subject: Record<KeptAction, string> = {
  check: "Результат проверки",
  reveal: "Ответ",
  sample: "Образец",
  change: "Изменение оценки",
  "mark-done": "Отметку «сделано»",
};

/**
 * Why the result of an action was not kept (DATA-004, design D6): it is not shown as kept, and
 * the learner can repeat it.
 */
export function notKeptMessage(action: KeptAction, error: unknown): string {
  const start =
    action === "reveal" || action === "sample"
      ? `${subject[action]} не показан: не удалось записать в этом браузере, что он был открыт`
      : `${subject[action]} не удалось сохранить в этом браузере`;
  const kind = error instanceof StorageError ? error.kind : "failed";
  if (kind === "quota")
    return `${start}: на устройстве не хватает места. Освободите место и повторите.`;
  if (kind === "unavailable") {
    return `${start}: браузер не разрешает этому сайту хранить данные. Разрешите сайту хранить данные и повторите.`;
  }
  return `${start}. Повторите, пожалуйста.`;
}

export const draftNotKept = "Не удалось сохранить черновик";

/** The pages panel without a connection (DOC-008). */
export const pagesOffline = "Страницы демо-книги показываются только при подключении к интернету.";
export const pagesFailed = "Не удалось показать страницы книги.";
export const pagesMissing = "Страниц этой книги нет в приложении.";
