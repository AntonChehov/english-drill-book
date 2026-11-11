import { describe, expect, it } from "vitest";
import { createGithub } from "./github.mjs";

function fakeFetch(responses) {
  const calls = [];
  const fetch = async (url, init) => {
    calls.push({ url, ...init });
    const { status = 200, body } = responses.shift();
    return {
      ok: status < 400,
      status,
      json: async () => body,
      text: async () => JSON.stringify(body),
    };
  };
  return { fetch, calls };
}

describe("createGithub", () => {
  it("sends the token and a JSON body", async () => {
    const { fetch, calls } = fakeFetch([{ body: { id: 1 } }]);
    const github = createGithub({ token: "t", apiUrl: "https://api.test", fetch });
    expect(await github.request("POST", "/x", { a: 1 })).toEqual({ id: 1 });
    expect(calls[0].url).toBe("https://api.test/x");
    expect(calls[0].headers.authorization).toBe("Bearer t");
    expect(calls[0].headers["content-type"]).toBe("application/json");
    expect(calls[0].body).toBe('{"a":1}');
  });

  it("names the request when GitHub refuses it", async () => {
    const { fetch } = fakeFetch([{ status: 404, body: { message: "Not Found" } }]);
    const github = createGithub({ token: "t", fetch });
    await expect(github.request("GET", "/missing")).rejects.toThrow("GET /missing: 404");
  });

  it("follows pages until one is not full", async () => {
    const full = Array.from({ length: 100 }, (_, index) => index);
    const { fetch, calls } = fakeFetch([{ body: full }, { body: [100] }]);
    const github = createGithub({ token: "t", fetch });
    expect(await github.paginate("/items?state=all")).toHaveLength(101);
    expect(calls.map((call) => call.url)).toEqual([
      "https://api.github.com/items?state=all&per_page=100&page=1",
      "https://api.github.com/items?state=all&per_page=100&page=2",
    ]);
  });

  it("returns nothing for 204 No Content", async () => {
    const { fetch } = fakeFetch([{ status: 204 }]);
    expect(await createGithub({ token: "t", fetch }).request("DELETE", "/x")).toBeUndefined();
  });
});
