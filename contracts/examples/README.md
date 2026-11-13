# Contract examples

Files named `*.valid.json` must validate against the schema named by their `kind`. They are checked in CI and serve as fixtures for implementation tests.

`pack.sourced.valid.json` describes a fictional book. It exists to exercise `source`, page references and `migrations`; its hashes are placeholders.

`pack.documents.valid.json` is an original pack that names the document it was read from, as the demo books do; its hash is a placeholder.

Invalid examples (`pack.<name>.invalid.json`) break one rule each. The sibling `pack.<name>.reason.txt` names the rule on its first line (`rule: <keyword or semantic rule>`), the JSON pointer of the offending value on its second (`path: <pointer>`, empty for the pack itself), and says what is wrong after that. A rule that is a keyword of the schema is refused by any JSON Schema validator; a semantic rule of PACK-002 (`unique-unit-id`, `unique-exercise-id`, `unique-item-id`, `invalid-key`, `no-accepted-choice`) only by the app's validator. Both kinds are checked in the unit tests.

**Draft.** `pack.schema.json` and `program.schema.json` predate the decision that packs are built on the device from the learner's files and that programs are built in. They are revised by the changes that first use them.
