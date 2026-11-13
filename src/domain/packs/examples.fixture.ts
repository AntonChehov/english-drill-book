// The examples of contracts/examples, for tests: every JSON example by file name, and the rule and
// path each invalid pack example breaks, from its `.reason.txt`.

export const examples: Readonly<Record<string, unknown>> = Object.fromEntries(
  Object.entries(
    import.meta.glob<unknown>("../../../contracts/examples/*.json", {
      eager: true,
      import: "default",
    }),
  ).map(([path, value]) => [path.split("/").at(-1)!, value]),
);

const reasons = import.meta.glob<string>("../../../contracts/examples/*.reason.txt", {
  eager: true,
  query: "?raw",
  import: "default",
});

export interface InvalidExample {
  readonly name: string;
  readonly pack: unknown;
  readonly rule: string;
  readonly path: string;
}

/** Every `pack.<name>.invalid.json` with the rule and path its reason names. */
export const invalidPacks: readonly InvalidExample[] = Object.entries(examples)
  .filter(([file]) => /^pack\..+\.invalid\.json$/u.test(file))
  .map(([file, pack]) => {
    const name = file.replace(/\.invalid\.json$/u, "");
    const reason = Object.entries(reasons).find(([path]) => path.endsWith(`/${name}.reason.txt`));
    if (reason === undefined) throw new Error(`${file} has no ${name}.reason.txt`);
    const rule = /^rule: (\S+)$/mu.exec(reason[1])?.[1];
    const path = /^path:(.*)$/mu.exec(reason[1])?.[1]?.trim();
    if (rule === undefined || path === undefined)
      throw new Error(`${name}.reason.txt names no rule or path`);
    return { name, pack, rule, path };
  });

/** Every `*.valid.json` example whose kind is a pack. */
export const validPacks: readonly [string, unknown][] = Object.entries(examples).filter(
  ([file]) => file.startsWith("pack.") && file.endsWith(".valid.json"),
);
