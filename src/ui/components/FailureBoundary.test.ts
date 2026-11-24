import { createRenderer, defineComponent, h, nextTick, type RendererOptions } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import FailureBoundary from "./FailureBoundary";

// The component is drawn by Vue's own renderer on a tree of plain nodes: no browser is needed.
interface Node {
  tag: string;
  text: string;
  props: Record<string, unknown>;
  children: Node[];
  parent: Node | null;
}

const node = (tag: string, text = ""): Node => ({
  tag,
  text,
  props: {},
  children: [],
  parent: null,
});

const options: RendererOptions<Node, Node> = {
  createElement: (tag) => node(tag),
  createText: (text) => node("#text", text),
  createComment: (text) => node("#comment", text),
  setText: (target, text) => void (target.text = text),
  setElementText: (target, text) => void (target.children = [node("#text", text)]),
  patchProp: (target, key, _before, value) => void (target.props[key] = value),
  insert: (child, parent, anchor) => {
    child.parent = parent;
    parent.children.splice(
      anchor ? parent.children.indexOf(anchor) : parent.children.length,
      0,
      child,
    );
  },
  remove: (child) => child.parent?.children.splice(child.parent.children.indexOf(child), 1),
  parentNode: (child) => child.parent,
  nextSibling: (child) => child.parent?.children[child.parent.children.indexOf(child) + 1] ?? null,
};

const { createApp } = createRenderer(options);

const textOf = (target: Node): string =>
  target.text + target.children.map((child) => textOf(child)).join(" ");

const find = (target: Node, tag: string): Node | undefined =>
  target.tag === tag ? target : target.children.map((c) => find(c, tag)).find(Boolean);

/** Presses «Попробовать снова». */
function retry(root: Node) {
  (find(root, "button")!.props["onClick"] as () => void)();
}

let fails: boolean;
let drawn: number;

const Part = defineComponent({
  render() {
    drawn++;
    if (fails) throw new Error("the part cannot be drawn");
    return h("p", "содержимое части");
  },
});

function mount() {
  const root = node("root");
  createApp(
    defineComponent({
      render: () =>
        h("main", [
          h("nav", "верхняя панель"),
          h(FailureBoundary, null, { default: () => h(Part) }),
          h("aside", "соседняя часть"),
        ]),
    }),
  ).mount(root);
  return root;
}

beforeEach(() => {
  fails = true;
  drawn = 0;
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => vi.restoreAllMocks());

describe("FailureBoundary", () => {
  it("@req PROD-011 a part that throws is replaced by the message, and what is around it stays", async () => {
    const root = mount();
    await nextTick();

    expect(textOf(root)).toContain("Не удалось показать эту часть.");
    expect(textOf(root)).not.toContain("содержимое части");
    expect(find(root, "div")?.props["role"]).toBe("alert");
    expect(textOf(root)).toContain("верхняя панель");
    expect(textOf(root)).toContain("соседняя часть");
    expect(console.error).toHaveBeenCalledWith(new Error("the part cannot be drawn"));
  });

  it("@req PROD-011 trying again draws the part anew, and a part that works is shown", async () => {
    const root = mount();
    await nextTick();
    const before = drawn;

    fails = false;
    retry(root);
    await nextTick();

    expect(drawn).toBeGreaterThan(before);
    expect(textOf(root)).toContain("содержимое части");
    expect(textOf(root)).not.toContain("Не удалось показать эту часть.");
  });

  it("@req PROD-011 a part that fails again shows the message again", async () => {
    const root = mount();
    await nextTick();

    retry(root);
    await nextTick();

    expect(textOf(root)).toContain("Не удалось показать эту часть.");
  });

  it("@req PROD-011 a part that works is shown as it is", async () => {
    fails = false;
    const root = mount();
    await nextTick();

    expect(textOf(root)).toContain("содержимое части");
    expect(find(root, "button")).toBeUndefined();
  });
});
