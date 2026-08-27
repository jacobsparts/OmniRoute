import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildPrecisionComboModelStep,
  buildGlobalModelList,
  buildManualComboModelStep,
} from "../../src/lib/combos/builderDraft.ts";
import { resolveProviderAlias, parseModel } from "../../open-sse/services/model.ts";

// Issue #11433: upstream's combo builder serialized a selected target from its
// canonical provider id instead of the selected routing prefix. This fork also
// preserves the canonical `opencode` identity, but retaining the selected `oc`
// prefix remains necessary for exact builder round-tripping and compatibility
// with upstream routing semantics.

test('fork contract: resolveProviderAlias("opencode") preserves OpenCode Free identity', () => {
  assert.equal(resolveProviderAlias("opencode"), "opencode");
});

test("issue #11433 fix: buildPrecisionComboModelStep honors an explicit modelPrefix override", () => {
  // The combo builder call sites now thread through the already-computed
  // routing-alias prefix (e.g. "oc") instead of letting the step default to
  // the raw providerId, so the serialized `model` field round-trips to the
  // correct provider.
  const step = buildPrecisionComboModelStep({
    providerId: "opencode",
    modelId: "big-pickle",
    modelPrefix: "oc",
  });

  assert.equal(step.providerId, "opencode");
  assert.equal(step.model, "oc/big-pickle");

  const parsed = parseModel(step.model);
  assert.equal(parsed.provider, step.providerId);
});

test("issue #11433 fix: buildGlobalModelList derives modelPrefix from qualifiedModel for the no-auth OpenCode Free provider", () => {
  // Mirrors what src/lib/combos/builderOptions.ts::rewriteQualifiedModelPrefix
  // produces for the no-auth "opencode" provider entry: `qualifiedModel` is
  // already rewritten to the "oc/" alias prefix, but (pre-fix)
  // buildGlobalModelList ignored it and rebuilt `model` from the raw
  // providerId, producing "opencode/big-pickle" which parses back to the
  // wrong provider ("opencode-zen").
  const [entry] = buildGlobalModelList([
    {
      providerId: "opencode",
      displayName: "OpenCode Free",
      connectionCount: 0,
      connections: [],
      models: [{ id: "big-pickle", name: "Big Pickle", qualifiedModel: "oc/big-pickle" }],
    },
  ]);

  assert.equal(entry.step.providerId, "opencode");
  assert.equal(entry.step.model, "oc/big-pickle");
  assert.equal(parseModel(entry.step.model).provider, entry.step.providerId);
});

test("issue #11433 fix: buildManualComboModelStep preserves a user-typed oc/<model> prefix", () => {
  // buildManualComboModelStep resolves the typed alias ("oc") back to the
  // canonical providerId ("opencode") before building the step. Pre-fix, it
  // then handed that canonical id straight to buildPrecisionComboModelStep,
  // which rebuilt `model` from it and collapsed "oc/<model>" back down to
  // "opencode/<model>" — reproducing the same collision for manual entry.
  const step = buildManualComboModelStep({
    value: "oc/big-pickle",
    providers: [{ providerId: "opencode", alias: "oc" }],
  });

  assert.ok(step);
  assert.equal(step?.providerId, "opencode");
  assert.equal(step?.model, "oc/big-pickle");
  assert.equal(parseModel(step!.model).provider, step!.providerId);
});
