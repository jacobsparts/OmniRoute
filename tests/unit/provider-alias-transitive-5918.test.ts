/**
 * Regression tests for #5918: resolveProviderAlias must follow the alias chain
 * transitively.
 *
 * Root cause: resolveProviderAlias() did a single-hop lookup
 * (`ALIAS_TO_PROVIDER_ID[alias] || alias`). The registry has genuine two-hop chains:
 * the parent OpenCode Free provider registers `id: "opencode", alias: "oc"`
 * (so `oc -> opencode`), while a manual routing-prefix override maps a directly
 * entered `opencode` prefix to the distinct `opencode-zen` provider.
 *
 * Resolution remains transitive across alias-only hops, with a depth limit and
 * seen-set preventing cycles.
 *
 * RECONCILED at v3.8.44 with the #2901 contract: the chain STOPS as soon as a hop
 * lands on a REGISTERED provider id. "oc" is the registry alias of the no-auth
 * "opencode" provider, so `oc/<model>` must resolve to it — continuing through the
 * manual "opencode" → "opencode-zen" slug override (which exists only for
 * user-typed `opencode/` prefixes) would leave the no-auth provider unreachable by
 * any prefix and misroute its combo entries (see combo-builder-opencode-prefix
 * test #2901). Transitivity still applies across alias-only hops, and the
 * loop/depth guards from #5918 are retained.
 */
import test from "node:test";
import assert from "node:assert/strict";

import {
  resolveConfiguredProviderId,
  resolveProviderAlias,
} from "../../open-sse/services/model.ts";

test("resolveProviderAlias stops the oc chain at the registered no-auth opencode provider (#2901)", () => {
  // "opencode" is a REGISTERED provider id (the no-auth tier, alias "oc"), so the
  // chain must stop there instead of following the manual opencode→opencode-zen
  // slug override — otherwise the no-auth provider is unreachable by any prefix.
  assert.equal(resolveProviderAlias("oc"), "opencode");
});

test("resolveProviderAlias resolves a direct one-hop alias", () => {
  assert.equal(resolveProviderAlias("opencode"), "opencode-zen");
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
