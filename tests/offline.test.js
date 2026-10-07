import { test } from "node:test";
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFile } from "node:fs/promises";
const root = new URL("../", import.meta.url);
test("Offline-App-Shell vollständig, Navigation fällt auf index.html zurück", async () => {
  const handlers = {},
    store = new Map(),
    origin = "https://calendar.test";
  const key = (x) =>
    new URL(typeof x === "string" ? x : x.url, origin + "/").href;
  const caches = {
    open: async () => ({
      addAll: async (paths) => {
        for (const p of paths) {
          const path = p === "./" ? "index.html" : p;
          store.set(key(p), new Response(await readFile(new URL(path, root))));
        }
      },
    }),
    match: async (req) => store.get(key(req))?.clone(),
  };
  vm.runInNewContext(await readFile(new URL("sw.js", root), "utf8"), {
    self: {
      location: { origin },
      addEventListener: (name, fn) => (handlers[name] = fn),
    },
    caches,
    URL,
    Response,
    fetch: async () => {
      throw new Error("offline");
    },
  });
  let completion;
  handlers.install({ waitUntil: (p) => (completion = p) });
  await completion;
  for (const path of [
    "/",
    "/src/app.js",
    "/example-calendar.json",
    "/assets/icon-192.png",
    "/manifest.webmanifest",
  ]) {
    let response;
    handlers.fetch({
      request: { url: origin + path, method: "GET", mode: "cors" },
      respondWith: (p) => (response = p),
    });
    assert.equal((await response).status, 200);
  }
  let response;
  handlers.fetch({
    request: { url: origin + "/unknown", method: "GET", mode: "navigate" },
    respondWith: (p) => (response = p),
  });
  assert.match(await (await response).text(), /Winterpost/);
  let handled = false;
  handlers.fetch({
    request: { url: "https://external.test/", method: "GET" },
    respondWith: () => (handled = true),
  });
  assert.equal(handled, false);
});
