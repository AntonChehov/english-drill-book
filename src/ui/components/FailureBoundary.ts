// A failure stays in its part: when what is drawn inside throws, the part says so with a way to try
// again, and the rest of the page, the top bar included, goes on. Trying again draws the part anew.
// It catches errors of the components drawn inside it. An error in an expression of the slot itself
// (a binding in the parent's template) is raised in the parent, so the boundary above the parent
// catches it, not this one. It is a render function, not a single-file component, so that a test
// can draw it without a browser.
import { defineComponent, Fragment, h, onErrorCaptured, ref } from "vue";

export default defineComponent({
  name: "FailureBoundary",
  setup(_, { slots }) {
    const failed = ref(false);
    /** Changes on each retry, so that what is inside is made again, not reused. */
    const attempt = ref(0);

    onErrorCaptured((error) => {
      console.error(error);
      failed.value = true;
      return false;
    });

    function retry() {
      failed.value = false;
      attempt.value++;
    }

    return () =>
      failed.value
        ? h("div", { class: "part-failed", role: "alert" }, [
            h("p", "Не удалось показать эту часть."),
            h(
              "button",
              { type: "button", class: "secondary", onClick: retry },
              "Попробовать снова",
            ),
          ])
        : h(Fragment, { key: attempt.value }, slots["default"]?.());
  },
});
