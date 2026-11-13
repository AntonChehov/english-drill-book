// What the start screen says while the demo is added and when adding or keeping it fails (design
// D8 of `demo-books`, D4 of `storage`).

import { StorageError } from "../../storage/db/errors";
import type { DemoFailure, DemoProgress } from "./add-demo";

export function progressMessage({ book, index, count }: DemoProgress): string {
  return `Читаем книгу ${index} из ${count}: «${book}»…`;
}

/**
 * The failure of an error thrown while adding the demo, if it is one of the known kinds. A file of
 * the app that does not arrive, such as the module that adds the demo, is a network failure.
 */
export function failureOf(error: unknown): DemoFailure | "network" | undefined {
  if (error instanceof Error && "failure" in error) return error.failure as DemoFailure;
  // The modules that add the demo are files of the app, fetched when asked for.
  if (error instanceof TypeError) return "network";
  return undefined;
}

export function failureMessage(failure: DemoFailure | "network" | undefined): string {
  if (failure === "network") {
    return "Не удалось загрузить демо-книги: нет связи с сайтом. Проверьте подключение к интернету и попробуйте ещё раз.";
  }
  if (failure === undefined) {
    return "Не удалось добавить демо-книги из-за непредвиденной ошибки. Попробуйте ещё раз.";
  }
  switch (failure.kind) {
    case "network":
      return `Не удалось загрузить демо-книгу «${failure.book}»: нет связи с сайтом. Проверьте подключение к интернету и попробуйте ещё раз.`;
    case "status":
      return `Сайт не отдал файл демо-книги «${failure.book}» (ошибка ${failure.status}). Попробуйте ещё раз немного позже.`;
    case "unreadable":
      return `Демо-книгу «${failure.book}» не удалось прочитать: файл повреждён или не той версии. Попробуйте ещё раз, а если не поможет, обновите страницу.`;
    case "insecure":
      return `Демо-книгу «${failure.book}» нельзя проверить: страница открыта по незащищённому адресу, и браузер не даёт сверить файл. Откройте приложение по адресу, который начинается с https://.`;
  }
}

/** Said while the books, read earlier, are stored again after a failure. */
export const keepingMessage = "Сохраняем демо-книги…";

/**
 * Why the books, read and checked, could not be kept in this browser (DATA-004), in words with no
 * technical terms.
 */
export function keepFailureMessage(error: unknown): string {
  const start = "Демо-книги прочитаны, но сохранить их в этом браузере не удалось";
  const kind = error instanceof StorageError ? error.kind : "failed";
  switch (kind) {
    case "unavailable":
      return `${start}: браузер не разрешает этому сайту хранить данные. Так бывает в режиме инкогнито или когда сохранение данных сайтов выключено в настройках браузера. Разрешите его и попробуйте ещё раз.`;
    case "quota":
      return `${start}: на устройстве не хватает места. Освободите место и попробуйте ещё раз.`;
    default:
      return `${start}. Попробуйте ещё раз.`;
  }
}
