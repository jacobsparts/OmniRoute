/**
 * Regression tests for #5918: resolveProviderAlias must follow the alias chain
 * transitively.
 *
 * The OpenCode provider registers `id: "opencode", alias: "oc"`. Both its alias
 * and canonical id must resolve to the no-auth provider without drifting into a
 * separate OpenCode tier.
 *
 * Fix: resolve transitively with a depth limit AND a seen-set so cycles cannot loop.
 * These assertions FAIL on the old single-hop implementation and pass on the fix.
 *
 * The chain stops as soon as a hop lands on a registered provider id. Transitivity
 * still applies across alias-only hops, and the loop/depth guards are retained.
 */
import test from "node:test";
import assert from "node:assert/strict";

import { resolveProviderAlias } from "../../open-sse/services/model.ts";

test("resolveProviderAlias stops the oc chain at the registered no-auth opencode provider (#2901)", () => {
  // "opencode" is a REGISTERED provider id (the no-auth tier, alias "oc"), so the
  // chain must stop there instead of following the manual opencode→opencode-zen
  // slug override — otherwise the no-auth provider is unreachable by any prefix.
  assert.equal(resolveProviderAlias("oc"), "opencode");
});

test("resolveProviderAlias preserves the registered opencode provider id", () => {
  assert.equal(resolveProviderAlias("opencode"), "opencode");
});

test("resolveProviderAlias returns a terminal id unchanged (id === alias)", () => {
  // opencode-zen registers id === alias === "opencode-zen"; must not loop or drift.
  assert.equal(resolveProviderAlias("opencode-zen"), "opencode-zen");
});

test("resolveProviderAlias falls back to identity for an unknown provider/id", () => {
  assert.equal(resolveProviderAlias("gpt-4"), "gpt-4");
  assert.equal(resolveProviderAlias("some-unregistered-provider"), "some-unregistered-provider");
});

test("resolveProviderAlias returns null for non-string input", () => {
  assert.equal(resolveProviderAlias(null), null);
  assert.equal(resolveProviderAlias(undefined), null);
  // @ts-expect-error — exercising the runtime guard against non-string input
  assert.equal(resolveProviderAlias(123), null);
});
