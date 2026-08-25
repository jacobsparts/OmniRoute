/**
 * Regression tests for #5918: resolveProviderAlias must follow the alias chain
 * transitively.
 *
 * Root cause: resolveProviderAlias() did a single-hop lookup
 * (`ALIAS_TO_PROVIDER_ID[alias] || alias`). The registry has genuine two-hop chains:
 * the OpenCode Free provider registers `id: "opencode", alias: "oc"`
 * (so `oc -> opencode`). The fork keeps that canonical provider ID terminal
 * instead of remapping it to the distinct `opencode-zen` provider.
 *
 * Resolution remains transitive across alias-only hops, with a depth limit and
 * seen-set preventing cycles. The chain stops as soon as a hop lands on a
 * registered provider ID.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveConfiguredProviderId,
  resolveProviderAlias,
} from "../../open-sse/services/model.ts";

test("resolveProviderAlias stops the oc chain at the registered no-auth opencode provider (#2901)", () => {
  assert.equal(resolveProviderAlias("oc"), "opencode");
});

test("resolveProviderAlias preserves the canonical OpenCode Free provider ID", () => {
  assert.equal(resolveProviderAlias("opencode"), "opencode");
});

test("resolveConfiguredProviderId preserves canonical OpenCode provider identities", () => {
  assert.equal(resolveConfiguredProviderId("opencode"), "opencode");
  assert.equal(resolveConfiguredProviderId("opencode-zen"), "opencode-zen");
});

test("resolveConfiguredProviderId accepts the public OpenCode Free alias", () => {
  assert.equal(resolveConfiguredProviderId("oc"), "opencode");
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
