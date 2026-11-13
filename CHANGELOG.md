# Changelog

## 0.1.0 (2026-11-13)


### Features

* **books:** demo books, their reader and pack validation ([e189167](https://github.com/AntonChehov/english-drill-book/commit/e189167fa69975242610e443c5bac9b901bc11d9))
* **books:** read the demo books into packs by what their pages say ([37b5bbe](https://github.com/AntonChehov/english-drill-book/commit/37b5bbed122db69f6a3e1e1fecb2524e0d2caba2))
* **books:** recognise the demo packs kept by an earlier visit ([7e973c0](https://github.com/AntonChehov/english-drill-book/commit/7e973c0d25837937267277bf10942affad60eb8d))
* bootstrap the app shell, the quality gates and the pipeline ([63cfde0](https://github.com/AntonChehov/english-drill-book/commit/63cfde03eb4d11a9d74261e6fdff543cd1fe1ac9))
* **checking:** answer checker ([e133bdd](https://github.com/AntonChehov/english-drill-book/commit/e133bddee4c8273742f9c9a2d335e76fad30a127))
* **checking:** expand key patterns and report invalid ones ([9758297](https://github.com/AntonChehov/english-drill-book/commit/97582970b92c2109ba2331cf9e998d5cbe2ac71a))
* **checking:** give the verdict on an answer ([9f57e7b](https://github.com/AntonChehov/english-drill-book/commit/9f57e7b6755c2f38852d70fe7f6fd336cfec3481))
* **checking:** normalise answers and keys into readings ([0769471](https://github.com/AntonChehov/english-drill-book/commit/076947173c1d96c51121f97fc7fa71e75827d5be))
* **checking:** prepare the key of an item once ([6dbe71c](https://github.com/AntonChehov/english-drill-book/commit/6dbe71c6189178d941d5db24ec6e85d36c9bb052))
* **checking:** tell strings one edit apart ([ea5d406](https://github.com/AntonChehov/english-drill-book/commit/ea5d4062ff386a48e40bf0c04c6df9c6c95f6cd9))
* **ci:** check the review record in rounds against the reviewed content ([ca9dcf2](https://github.com/AntonChehov/english-drill-book/commit/ca9dcf24384719c178ce409426368843cd610a80))
* **ci:** hash the content a review reads ([88b5c7a](https://github.com/AntonChehov/english-drill-book/commit/88b5c7a21176fcac7894410401b39246addb48bb))
* **ci:** refuse an HTML comment in the review record ([f9412b8](https://github.com/AntonChehov/english-drill-book/commit/f9412b8a82bb078e22d56b2544655ea89f7cbb72))
* **ci:** review in rounds, bound to a hash of the reviewed content ([a978718](https://github.com/AntonChehov/english-drill-book/commit/a978718c63dcb6c00fc9d07ab5026ac82de00c10))
* **ci:** show the state of the review in the evidence comment ([7f3b1a0](https://github.com/AntonChehov/english-drill-book/commit/7f3b1a08a2bb77873b5d0937dfb7e50fce2559a3))
* **demo:** name unit 2 plainly and print exact alternatives in the keys ([8380d18](https://github.com/AntonChehov/english-drill-book/commit/8380d1878a12aacce7819e3e1da1ffe012f56273))
* **demo:** write the demo course and drill book and lay them out as PDFs ([46dc92b](https://github.com/AntonChehov/english-drill-book/commit/46dc92b6aa411a3008c483770e2ee6a3467e7c50))
* **packs:** validate packs against the schema and the semantic rules ([250eca4](https://github.com/AntonChehov/english-drill-book/commit/250eca479b63a0749adef5f8a66fb4c66c7e17f8))
* **progress:** build attempts of the export format and derive the state of an exercise ([d63e4e9](https://github.com/AntonChehov/english-drill-book/commit/d63e4e9dbf97484b5d9301a5386a3513f330bc3b))
* **storage:** keep packs and the attempt log in the browser ([1d86157](https://github.com/AntonChehov/english-drill-book/commit/1d861579ef2e68044043ed11dc0e08d8d5dcdc3a))
* **storage:** keep packs, the attempt log and its derived state in IndexedDB ([e29fd6b](https://github.com/AntonChehov/english-drill-book/commit/e29fd6b3c64d69f58e82489a9b1ef50e16e3c1f6))
* **storage:** read the text of a PDF with pdf.js loaded on demand ([f52a053](https://github.com/AntonChehov/english-drill-book/commit/f52a053a37d57c2439572380917064223b60f3e6))
* **ui:** add the demo books from the start screen ([57560cf](https://github.com/AntonChehov/english-drill-book/commit/57560cf646d295dbf2b73d0ccf004672f5e9302c))
* **ui:** keep the demo books, say when they cannot be kept, and stop on data of a newer version ([7a7649c](https://github.com/AntonChehov/english-drill-book/commit/7a7649ce1a97898f1da8189e99c328e6665206d2))


### Bug Fixes

* **checking:** bound the work of preparing a key ([485f7cd](https://github.com/AntonChehov/english-drill-book/commit/485f7cd39e85bf82b4133c9fa1b0c608c2d948ea))
* **checking:** count each split of a loose alternative once and refuse one inside a group ([67eabff](https://github.com/AntonChehov/english-drill-book/commit/67eabff8c0d8387e45a844632160138b92c58703))
* **checking:** drop single quotation marks and read each part of a text once ([d590b89](https://github.com/AntonChehov/english-drill-book/commit/d590b890db051359f413fb02a7012d08ba9f86ec))
* **checking:** give an answer of more than 1000 characters the verdict bad unread ([4e3c985](https://github.com/AntonChehov/english-drill-book/commit/4e3c98519a8094dd9b87570764debd75d9c6442f))
* **checking:** open a quotation mark before punctuation ([b72dc1f](https://github.com/AntonChehov/english-drill-book/commit/b72dc1fe879a101d0531a07ddec9c4542f35addc))
* **checking:** refuse a key whose patterns or variants are too long together ([03e107f](https://github.com/AntonChehov/english-drill-book/commit/03e107ffacec67c0b7cac6a55ccf585d994f99bb))
* **checking:** refuse a key whose readings are too many or too long ([523b3e7](https://github.com/AntonChehov/english-drill-book/commit/523b3e7b82fa5afa7a053ea058e4fcc7c5d23d33))
* **checking:** stop reading a key after twenty invalid patterns ([d4bf44f](https://github.com/AntonChehov/english-drill-book/commit/d4bf44fa38b33ce18770f70f1b0f4788b9fe8992))
* **ci:** exempt only a real archive move from the evidence check ([3dcf77d](https://github.com/AntonChehov/english-drill-book/commit/3dcf77d0d18a9cbfe60001d91e4faeca7e6fdfd4))
* **ci:** fetch main, refuse unknown changes, hash file modes (F3, F4, F6) ([3ee2b83](https://github.com/AntonChehov/english-drill-book/commit/3ee2b835d1ed2930068afdbcbf75f20e59aa3637))
* **ci:** give free text its places, read fences as CommonMark (F2, F8, F9) ([3683fff](https://github.com/AntonChehov/english-drill-book/commit/3683fff8fa3a8c4ff722db55dd39116deffec5ef))
* **ci:** read the review record strictly, require approval (F1, F2, F5, F7) ([5b5e9e0](https://github.com/AntonChehov/english-drill-book/commit/5b5e9e0f9d38bc195c34439ada13d6dfd2fdf2ea))
* **ci:** refuse an HTML comment in the review record inside fenced blocks too ([597227e](https://github.com/AntonChehov/english-drill-book/commit/597227e73d9ec1a03d9d9bdd13d9ed921e714f92))
* **demo:** retry a pdf.js worker that did not arrive, and read only the published books ([5b7f460](https://github.com/AntonChehov/english-drill-book/commit/5b7f460571a4b68643b93db85a294447306d0ce3))
* **progress:** let an override take a completion back and rebuild caches of another derivation ([673631a](https://github.com/AntonChehov/english-drill-book/commit/673631a151830f388ef55bbd2925ead2ac07f3dd))
* **storage:** open the database again after the browser closes the connection ([ae814bc](https://github.com/AntonChehov/english-drill-book/commit/ae814bc07c13dec15eccd53e6da909baf21865de))
* **ui:** keep the live region and the focus while the demo is read ([0b5fd06](https://github.com/AntonChehov/english-drill-book/commit/0b5fd06f8e99e498c1bad40895cf9f112ff50a21))


### Performance Improvements

* **checking:** build variants from joined stretches of text ([7cd390e](https://github.com/AntonChehov/english-drill-book/commit/7cd390eb8a79a2db13ad1f72fb4175cd485d8ba3))
* **checking:** compare long stretches of readings as whole strings ([76bb4b9](https://github.com/AntonChehov/english-drill-book/commit/76bb4b9220a4cb566a3e343c2abc0622b917c638))
* **checking:** read the text after the fourth 's or 'd once per form ([2f08c39](https://github.com/AntonChehov/english-drill-book/commit/2f08c39ebb1df95d7244229519a4d5c1cf856f39))
