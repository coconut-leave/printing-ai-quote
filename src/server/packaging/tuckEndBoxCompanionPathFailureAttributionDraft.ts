export type TuckEndCompanionFailureLayerDraft =
  | 'template_layer'
  | 'path_caliber'
  | 'continuity'
  | 'rule_candidate'

export type TuckEndCompanionFailureModeIdDraft =
  | 'companion_item_family_drift'
  | 'bundle_followup_shadow_loss'
  | 'primary_item_not_preserved'
  | 'insufficient_followup_context'
  | 'path_bucket_boundary_ambiguous'

export type TuckEndCompanionWrongBucketSampleDraft = {
  sampleKey: string
  conversationId: string
  requestId: string
  rawText: string
  liveBatchBlockReason: string
  observedProblem: string
  familyMergeDriftType:
    | 'tuck_end_box_to_folding_carton'
    | 'follow_up_turn_without_shadow'
    | 'bundle_main_and_companion_relation_lost'
  pathSemanticIssue: string
  sampleShape:
    | 'main_item_plus_leaflet'
    | 'main_item_plus_insert_leaflet_sticker_bundle'
    | 'bundle_follow_up_leaflet_only'
  currentImpact: {
    affectsQuotedCleanSubset: boolean
    affectsLimitedRoleCandidate: boolean
    affectsCompanionBoundaryShadowOnly: boolean
    note: string
  }
  matchedFailureModes: TuckEndCompanionFailureModeIdDraft[]
}

export type TuckEndCompanionFailureModeDraft = {
  modeId: TuckEndCompanionFailureModeIdDraft
  definition: string
  hitSamples: string[]
  classification: TuckEndCompanionFailureLayerDraft[]
  whyItMatters: string
}

export const TUCK_END_COMPANION_WRONG_BUCKET_SAMPLES_DRAFT: readonly TuckEndCompanionWrongBucketSampleDraft[] = [
  {
    sampleKey: 'conv2074_req7758',
    conversationId: '2074',
    requestId: '7758',
    rawText: '双插盒配说明书，先看看结构化预报价',
    liveBatchBlockReason: 'shadow_not_emitted_for_tuck_end_companion_path',
    observedProblem: 'phase-one 已经在 tuck_end_box estimated 边界，但 second-phase 当前 turn 没有产出 shadow，导致母池内无法继续做 family/status/path 复核。',
    familyMergeDriftType: 'follow_up_turn_without_shadow',
    pathSemanticIssue: 'companion item 语义一出现，当前 second-phase 没有稳定保留 tuck_end 主件路径，直接出现 shadow coverage 空洞。',
    sampleShape: 'main_item_plus_leaflet',
    currentImpact: {
      affectsQuotedCleanSubset: false,
      affectsLimitedRoleCandidate: false,
      affectsCompanionBoundaryShadowOnly: true,
      note: '它不干扰标准双插 clean quoted 判断，但说明 companion estimated path 当前连 shadow 覆盖都不稳定。',
    },
    matchedFailureModes: ['bundle_followup_shadow_loss', 'primary_item_not_preserved'],
  },
  {
    sampleKey: 'conv2067_req7740',
    conversationId: '2067',
    requestId: '7740',
    rawText: '双插盒：7*5*5CM，350克白卡，正反四色，5000；内托：20*12CM，白卡，5000；说明书：20*5CM，80克双铜纸，双面四色印，折3折，5000；透明贴纸：2.4*3cm，透明贴纸，5000',
    liveBatchBlockReason: 'family_merge_drift_to_folding_carton',
    observedProblem: 'bundle 主件仍是双插盒，但 second-phase 已将主类回落到 folding_carton，造成 estimated bucket 虽保守但 family merge 明显漂移。',
    familyMergeDriftType: 'tuck_end_box_to_folding_carton',
    pathSemanticIssue: 'bundle 内 companion item 抢走了主件归并权，tuck_end 主件没有被持续保留为 primary path anchor。',
    sampleShape: 'main_item_plus_insert_leaflet_sticker_bundle',
    currentImpact: {
      affectsQuotedCleanSubset: false,
      affectsLimitedRoleCandidate: true,
      affectsCompanionBoundaryShadowOnly: true,
      note: '它不动 quoted clean subset 本身，但会拖累 tuck_end 第二期对 family stability 的整体信心。',
    },
    matchedFailureModes: ['companion_item_family_drift', 'primary_item_not_preserved', 'path_bucket_boundary_ambiguous'],
  },
  {
    sampleKey: 'conv2066_req7736',
    conversationId: '2066',
    requestId: '7736',
    rawText: '说明书改成双面黑白',
    liveBatchBlockReason: 'follow_up_turn_loses_tuck_end_identity',
    observedProblem: 'follow-up 文本只剩 companion leaflet 变更，second-phase 不再保留 tuck_end 主件上下文，family 直接掉到 folding_carton。',
    familyMergeDriftType: 'bundle_main_and_companion_relation_lost',
    pathSemanticIssue: 'follow-up 太短且由 companion item 主导，当前 continuity 无法维持主件优先级。',
    sampleShape: 'bundle_follow_up_leaflet_only',
    currentImpact: {
      affectsQuotedCleanSubset: false,
      affectsLimitedRoleCandidate: false,
      affectsCompanionBoundaryShadowOnly: true,
      note: '这是 companion/boundary continuity 问题，不应与标准双插 quoted clean subset 混为一谈。',
    },
    matchedFailureModes: ['insufficient_followup_context', 'primary_item_not_preserved', 'companion_item_family_drift'],
  },
  {
    sampleKey: 'conv2042_req7654',
    conversationId: '2042',
    requestId: '7654',
    rawText: '双插盒：7*5*5CM，350克白卡，正反四色，5000；内托：20*12CM，白卡，5000；说明书：20*5CM，80克双铜纸，双面四色印，折3折，5000；透明贴纸：2.4*3cm，透明贴纸，5000',
    liveBatchBlockReason: 'repeated_family_merge_drift_on_bundle_path',
    observedProblem: '与 2067 同型 bundle 再次复现 tuck_end_box → folding_carton 漂移，说明这不是孤例，而是 companion bundle path 的重复不稳定模式。',
    familyMergeDriftType: 'tuck_end_box_to_folding_carton',
    pathSemanticIssue: '主件 + 内托 + 说明书 + 透明贴纸 的多组件结构在 current path 口径里没有稳定主锚点。',
    sampleShape: 'main_item_plus_insert_leaflet_sticker_bundle',
    currentImpact: {
      affectsQuotedCleanSubset: false,
      affectsLimitedRoleCandidate: true,
      affectsCompanionBoundaryShadowOnly: true,
      note: '重复复现说明估计边界虽保守，但 companion path 的 family stability 仍会阻碍第二期更强产品角色评估。',
    },
    matchedFailureModes: ['companion_item_family_drift', 'primary_item_not_preserved', 'path_bucket_boundary_ambiguous'],
  },
  {
    sampleKey: 'conv2041_req7650',
    conversationId: '2041',
    requestId: '7650',
    rawText: '说明书改成双面黑白',
    liveBatchBlockReason: 'follow_up_turn_family_merge_drift',
    observedProblem: 'follow-up turn 只剩说明书变更，second-phase 再次把上下文解释成 folding_carton companion path，而不是 tuck_end 主件的后续补充。',
    familyMergeDriftType: 'bundle_main_and_companion_relation_lost',
    pathSemanticIssue: 'companion item 主导 follow-up，使 second-phase continuity 断掉并丢失主件保留。',
    sampleShape: 'bundle_follow_up_leaflet_only',
    currentImpact: {
      affectsQuotedCleanSubset: false,
      affectsLimitedRoleCandidate: false,
      affectsCompanionBoundaryShadowOnly: true,
      note: '它不会推翻 clean subset 判断，但说明 follow-up companion path 仍不具备稳定 shadow 复核价值。',
    },
    matchedFailureModes: ['insufficient_followup_context', 'primary_item_not_preserved', 'companion_item_family_drift'],
  },
] as const

export const TUCK_END_COMPANION_FAILURE_MODES_DRAFT: readonly TuckEndCompanionFailureModeDraft[] = [
  {
    modeId: 'companion_item_family_drift',
    definition: '主件仍属于 tuck_end_box，但因为 companion item 或 bundle 结构介入，second-phase 将 family 回落到 folding_carton。',
    hitSamples: ['conv2067_req7740', 'conv2066_req7736', 'conv2042_req7654', 'conv2041_req7650'],
    classification: ['path_caliber', 'continuity', 'rule_candidate'],
    whyItMatters: '这是当前第一批 live review 里最主要的已暴露失稳模式，直接影响 companion path 的 family stability 判断。',
  },
  {
    modeId: 'bundle_followup_shadow_loss',
    definition: 'companion path 在 follow-up 或简短请求里没有继续产出 second-phase shadow，导致真实流量无法进入后续复核。',
    hitSamples: ['conv2074_req7758'],
    classification: ['template_layer', 'continuity', 'rule_candidate'],
    whyItMatters: '它说明当前 companion path 还存在 live shadow coverage 空洞，连失败都无法稳定记录。',
  },
  {
    modeId: 'primary_item_not_preserved',
    definition: 'bundle 或 companion follow-up 出现后，双插盒主件没有被继续保留为主判断锚点，secondary item 反向主导了 family 解释。',
    hitSamples: ['conv2074_req7758', 'conv2067_req7740', 'conv2066_req7736', 'conv2042_req7654', 'conv2041_req7650'],
    classification: ['path_caliber', 'continuity', 'rule_candidate'],
    whyItMatters: '这是 5 条错桶样本的共同核心，说明 companion path 失稳并不是 quoted clean subset 问题，而是主件保留失败。',
  },
  {
    modeId: 'insufficient_followup_context',
    definition: 'follow-up 文本太短且只描述 companion item 变更，当前 second-phase continuity 不足以恢复 tuck_end 主件上下文。',
    hitSamples: ['conv2066_req7736', 'conv2041_req7650'],
    classification: ['continuity', 'rule_candidate'],
    whyItMatters: '这类短 follow-up 代表真实对话高频形态，如果不单独识别，会持续制造 family merge 漂移。',
  },
  {
    modeId: 'path_bucket_boundary_ambiguous',
    definition: 'bundle 主件 + 内托/说明书/透明贴纸 的组合路径当前只能保守落到 estimated，但在 tuck_end companion path 与 folding/flat-print 语义之间边界含混。',
    hitSamples: ['conv2067_req7740', 'conv2042_req7654'],
    classification: ['path_caliber', 'rule_candidate'],
    whyItMatters: '它解释了为什么状态保守没错，但 family 和 bucket 仍会错。',
  },
] as const

export const TUCK_END_COMPANION_FAILURE_ATTRIBUTION_SUMMARY_DRAFT = {
  reviewedWrongBucketSampleCount: 5,
  primaryInstability: 'primary_item_not_preserved',
  dominantFailureDirection: 'tuck_end companion path drifts away from tuck_end identity under bundle and follow-up pressure',
  dominantImpact: 'does not currently weaken quoted clean subset, but does weaken companion/boundary family stability and therefore blocks broader confidence for stronger product role',
  ruleOptimizationCandidates: [
    'preserve tuck_end main-item identity when companion items appear in the same bundle turn',
    'preserve tuck_end continuity across short companion-only follow-up turns',
    'separate bundle companion boundary from generic folding_carton / flat_print redirect behavior',
  ],
  notPrimaryProblemsRightNow: [
    'quoted clean subset misrelease',
    'limited-role candidate path instability on standard double-tuck main-item',
    'live handoff-boundary correctness',
  ],
  handoffCoverageNextStep: 'After locking these companion-path failure modes, the next step is to deliberately search live mother-pool traffic for explicit open-window and high-complexity tuck_end signals so handoff-boundary coverage can be added without mixing it with companion drift failures.',
} as const