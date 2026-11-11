# Contract examples

Files named `*.valid.json` must validate against the schema named by their `kind`. They are checked in CI and serve as fixtures for implementation tests.

`pack.sourced.valid.json` describes a fictional book. It exists to exercise `source`, page references and `migrations`; its hashes are placeholders.

Invalid examples (`*.invalid.json`, each with a sibling `*.reason.txt` naming the violated rule) are added with the validator in milestone 1.

**Draft.** `pack.schema.json` and `program.schema.json` predate the decision that packs are built on the device from the learner's files and that programs are built in. They are revised by the changes that first use them.
