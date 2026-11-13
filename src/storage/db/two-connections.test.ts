import { describe, expect, it } from "vitest";
import { deriveExercise } from "../../domain/progress";
import { attemptOf, freshFactory, packOf } from "./db.fixture";
import { openStore } from "./store";

describe("two tabs", () => {
  it("@req DATA-012 two connections appending to one exercise in turn lose nothing and read the same state", async () => {
    const factory = freshFactory();
    const first = await openStore({ factory });
    const second = await openStore({ factory });
    const attempts = Array.from({ length: 8 }, (_, index) =>
      attemptOf(index + 1, { "1": index % 3 === 0 ? "ok" : "bad", [String(index % 4)]: "near" }),
    );

    for (const [index, attempt] of attempts.entries()) {
      await (index % 2 === 0 ? first : second).appendAttempt(attempt);
    }

    const whole = deriveExercise(attempts);
    for (const store of [first, second]) {
      expect(await store.getAttempts("test-pack", "1.1")).toEqual(attempts);
      expect(await store.getExerciseState("test-pack", "1.1")).toEqual(whole);
    }
  });

  it("@req DATA-012 two connections appending at the same time lose nothing", async () => {
    const factory = freshFactory();
    const first = await openStore({ factory });
    const second = await openStore({ factory });
    const attempts = Array.from({ length: 10 }, (_, index) =>
      attemptOf(index + 1, { "1": index % 2 === 0 ? "ok" : "bad" }),
    );

    await Promise.all(
      attempts.map((attempt, index) => (index % 2 === 0 ? first : second).appendAttempt(attempt)),
    );

    const whole = deriveExercise(attempts);
    for (const store of [first, second]) {
      expect(await store.getAttempts("test-pack", "1.1")).toEqual(attempts);
      expect(await store.getExerciseState("test-pack", "1.1")).toEqual(whole);
    }
  });

  it("@req DATA-012 a write in one tab is announced to the other", async () => {
    const factory = freshFactory();
    const first = await openStore({ factory, channel: "test-two-tabs" });
    const second = await openStore({ factory, channel: "test-two-tabs" });
    const heard = new Promise<void>((resolve) => {
      second.onOtherTabWrite(resolve);
    });

    await first.putPacks([packOf("first")]);
    await heard;

    expect(await second.getPacks()).toEqual([packOf("first")]);
    first.close();
    second.close();
  });

  it("@req DATA-012 without a channel, nothing is announced", async () => {
    const store = await openStore({ factory: freshFactory() });
    const stop = store.onOtherTabWrite(() => undefined);
    expect(stop()).toBeUndefined();
  });
});
