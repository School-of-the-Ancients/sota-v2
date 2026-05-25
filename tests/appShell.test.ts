import test from "node:test";
import assert from "node:assert/strict";

import { renderAppShell } from "../src/app/App.ts";
import { resolveRoute } from "../src/app/router.ts";

test("app shell renders a visible home page at root", () => {
  const html = renderAppShell("/");

  assert.match(html, /School of the Ancients/i);
  assert.match(html, /Start a new goal/i);
  assert.match(html, /href="\/goals\/new"/);
  assert.match(html, /data-route="home"/);
});

test("app shell renders the goal intake route", () => {
  const html = renderAppShell("/goals/new");

  assert.match(html, /data-route="goal-intake"/);
  assert.match(html, /<form[^>]+method="post"[^>]+action="\/goals\/new"/);
  assert.match(html, /name="goal"/);
});

test("router returns a not found route for unknown paths", () => {
  const route = resolveRoute("/missing-route");

  assert.equal(route.id, "not-found");
  assert.match(route.html, /not found/i);
});
