// A small client of the GitHub REST API for the CI scripts, on Node's own fetch.

/**
 * @param {object} options
 * @param {string} options.token  a token allowed to do what the caller asks
 * @param {string} [options.apiUrl]
 * @param {typeof fetch} [options.fetch]  replaced in tests
 */
export function createGithub({
  token,
  apiUrl = "https://api.github.com",
  fetch: fetchImpl = fetch,
}) {
  async function request(method, path, body) {
    const response = await fetchImpl(`${apiUrl}${path}`, {
      method,
      headers: {
        accept: "application/vnd.github+json",
        authorization: `Bearer ${token}`,
        "x-github-api-version": "2022-11-28",
        "user-agent": "english-drill-book-ci",
        ...(body === undefined ? {} : { "content-type": "application/json" }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`GitHub API ${method} ${path}: ${response.status} ${await response.text()}`);
    }
    return response.status === 204 ? undefined : response.json();
  }

  /** Every item of a list endpoint, following pages of 100. */
  async function paginate(path) {
    const items = [];
    const separator = path.includes("?") ? "&" : "?";
    for (let page = 1; ; page++) {
      const batch = await request("GET", `${path}${separator}per_page=100&page=${page}`);
      items.push(...batch);
      if (batch.length < 100) return items;
    }
  }

  return { request, paginate };
}
