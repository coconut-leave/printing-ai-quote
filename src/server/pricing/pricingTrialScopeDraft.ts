import type {
  ComplexPackagingItem,
  ComplexPackagingRequest,
  ComplexPackagingTemplateId,
  PricingTrialBundleGateStatus,
  PricingTrialGateStatus,
} from '@/server/packaging/types'
import { buildWorkbookLineItemQuote } from './complexPackagingLineItemEngine'

export type PricingTrialItemGate = {
  itemIndex: number
  itemType: ComplexPackagingItem['productType']
  itemTitle: string
  templateId?: ComplexPackagingTemplateId
  gateStatus: PricingTrialGateStatus
  reasonCode: string
  reasonText: string
}

export type PricingTrialScopeAssessment = {
  requestGateStatus: PricingTrialGateStatus
  requestGateReasonCode: string
  requestGateReasonText: string
  bundleGateStatus?: PricingTrialBundleGateStatus
  bundleGateReasonCode?: string
  bundleGateReasonText?: string
  itemGates: PricingTrialItemGate[]
}

type QuotedBundleSignature =
  | 'main_plus_standard_leaflet'
  | 'mailer_plus_standard_insert'
  | 'tuck_end_plus_standard_insert'
  | 'main_plus_sticker'
  | 'main_plus_simple_carton'
  | 'blank_foil_bag_plus_carton'
  | 'mailer_plus_proxy_insert'
  | 'tuck_end_plus_proxy_insert'
  | 'multi_accessory_standard_bundle_quoted'

type ExtendedMainPlusInsertClassification =
  | 'extended_main_plus_insert_quoted_candidate'
  | 'extended_main_plus_insert_estimated_only'
  | 'extended_main_plus_insert_handoff_only'

type MultiAccessoryStandardBundleClassification =
  | 'multi_accessory_standard_bundle_quoted_candidate'
  | 'multi_accessory_standard_bundle_estimated_only'
  | 'multi_accessory_standard_bundle_handoff_only'

function getItemTitle(item: ComplexPackagingItem): string {
  return item.title || item.productType
}

function getSourceText(item: ComplexPackagingItem): string {
  return (item.sourceText || '').trim()
}

function hasExplicitNoPrint(text: string): boolean {
  return /无印刷|不印刷|无印|不印|空白/i.test(text)
}

function hasPositivePrintSignal(item: ComplexPackagingItem, text: string): boolean {
  if (hasExplicitNoPrint(text)) {
    return false
  }

  if (item.printColor && item.printColor !== 'none') {
    return true
  }

  return /印|四色|专色|4c|专印|彩印/i.test(text)
}

function isNoFilmWindow(text: string): boolean {
  return /不贴胶片|无胶片/i.test(text)
}

function isStandardPrintedFoilBagQuotedCandidate(item: ComplexPackagingItem, text: string): boolean {
  const spotCount = Math.max(item.spotColorCount || 0, item.pantoneCodes?.length || 0)
  const gaugeMatch = text.match(/(\d+(?:\.\d+)?)\s*丝/i)
  const gauge = gaugeMatch ? Number(gaugeMatch[1]) : undefined
  const normalized = text.toUpperCase()

  return item.productType === 'foil_bag'
    && gauge === 8
    && Boolean(item.length && item.width)
    && Boolean(item.quantity && item.quantity >= 10000)
    && item.printColor === 'four_color'
    && /单面/i.test(text)
    && !/双面|正反/i.test(text)
    && spotCount === 0
    && !/打样|数码样/i.test(text)
    && !item.surfaceFinish
    && !['局部UV', 'UV', '易撕线', '贴易撕线', '提手', '珍珠棉', '逆向UV', '激凸', '击凸', '烫金', '烫银'].some((term) => normalized.includes(term.toUpperCase()))
}

function isStandardPrintedCartonQuotedCandidate(item: ComplexPackagingItem, text: string): boolean {
  const normalized = text.toUpperCase()

  return item.productType === 'carton_packaging'
    && /大外箱/i.test(text)
    && /K636K/i.test(text)
    && item.material === 'corrugated_carton'
    && Boolean(item.length && item.width && item.height)
    && Boolean(item.quantity && item.quantity >= 10000)
    && item.printColor === 'four_color'
    && /单面/i.test(text)
    && !/双面|正反/i.test(text)
    && /啤|模切/i.test(text)
    && !/成箱|粘箱|包装费|装箱费/i.test(text)
    && !/打样|数码样/i.test(text)
    && !item.surfaceFinish
    && !['局部UV', 'UV', '易撕线', '贴易撕线', '提手', '珍珠棉', '逆向UV', '激凸', '击凸', '烫金', '烫银'].some((term) => normalized.includes(term.toUpperCase()))
}

function isAllowedQuotedNoFilmWindowItem(item: ComplexPackagingItem, gate?: PricingTrialItemGate): boolean {
  const text = getSourceText(item)

  return gate?.gateStatus === 'allowed_quoted_in_trial'
    && item.productType === 'window_box'
    && isNoFilmWindow(text)
    && item.laminationType === 'glossy'
}

function isAllowedQuotedMainBoxProductType(itemType: ComplexPackagingItem['productType']): boolean {
  return ['tuck_end_box', 'mailer_box', 'window_box'].includes(itemType)
}

function hasQuotedMainBoxCoreDimensions(item: ComplexPackagingItem): boolean {
  return Boolean(item.length && item.width && item.height)
}

function hasQuotedMainBoxMaterial(item: ComplexPackagingItem): boolean {
  return Boolean(item.outerMaterial || item.material) && Boolean(item.outerWeight || item.weight)
}

function hasQuotedMainBoxProcessSignals(item: ComplexPackagingItem, text: string): boolean {
  return hasPositivePrintSignal(item, text)
}

function hasQuotedInsertCoreDimensions(item: ComplexPackagingItem): boolean {
  return Boolean(item.insertLength || item.length) && Boolean(item.insertWidth || item.width)
}

function hasQuotedInsertMaterial(item: ComplexPackagingItem): boolean {
  return Boolean(item.insertMaterial || item.material) && Boolean(item.weight)
}

function hasQuotedProxyInsertMaterial(item: ComplexPackagingItem): boolean {
  return Boolean(item.insertMaterial || item.material) && !item.weight
}

function hasQuotedInsertProcessSignals(item: ComplexPackagingItem, text: string): boolean {
  return (Boolean(item.printColor && item.printColor !== 'none') || Boolean(item.spotColorCount))
    && (Boolean(item.dieCut) || Boolean(item.mounting) || Boolean(item.laminationType && item.laminationType !== 'none') || /啤|模切|裱|对裱|覆哑|覆膜|粘位/i.test(text))
}

function hasQuotedLeafletCoreDimensions(item: ComplexPackagingItem): boolean {
  return Boolean(item.length && item.width)
}

function hasQuotedLeafletMaterial(item: ComplexPackagingItem): boolean {
  return Boolean(item.paperType || item.material) && Boolean(item.weight)
}

function hasQuotedLeafletProcessSignals(item: ComplexPackagingItem, text: string): boolean {
  return /折/.test(text)
    && Boolean(item.printColor && item.printColor !== 'generic_print' && item.printColor !== 'none')
}

function hasQuotedGenericLeafletProcessSignals(item: ComplexPackagingItem, text: string): boolean {
  return item.printColor === 'generic_print' && hasPositivePrintSignal(item, text)
}

function hasQuotedStickerCoreDimensions(item: ComplexPackagingItem): boolean {
  return Boolean(item.stickerLength || item.length) && Boolean(item.stickerWidth || item.width)
}

function hasQuotedStickerMaterial(item: ComplexPackagingItem): boolean {
  return (item.stickerMaterial || item.material) === 'clear_sticker'
}

function hasQuotedStickerProcessSignals(item: ComplexPackagingItem, text: string): boolean {
  return !hasPositivePrintSignal(item, text)
}

function hasQuotedCartonCoreDimensions(item: ComplexPackagingItem): boolean {
  return Boolean(item.length && item.width && item.height)
}

function hasQuotedCartonMaterial(item: ComplexPackagingItem): boolean {
  return Boolean(item.material || item.outerMaterial || item.sourceText)
}

function hasQuotedCartonProcessSignals(item: ComplexPackagingItem, text: string): boolean {
  return !hasPositivePrintSignal(item, text)
}

function isStandardQuotedBoxInsert(item: ComplexPackagingItem, templateId?: ComplexPackagingTemplateId, lineQuoteStatus?: string): boolean {
  return templateId === 'box_insert_template' && lineQuoteStatus === 'quoted' && Boolean(item.weight)
}

function isHighFrequencyQuotedGenericLeaflet(item: ComplexPackagingItem, templateId?: ComplexPackagingTemplateId, lineQuoteStatus?: string): boolean {
  return templateId === 'leaflet_insert_template'
    && lineQuoteStatus === 'quoted'
    && hasQuotedLeafletCoreDimensions(item)
    && hasQuotedLeafletMaterial(item)
    && hasQuotedGenericLeafletProcessSignals(item, getSourceText(item))
}

function isHighFrequencyQuotedProxyInsert(item: ComplexPackagingItem, templateId?: ComplexPackagingTemplateId, lineQuoteStatus?: string): boolean {
  return templateId === 'box_insert_template'
    && lineQuoteStatus === 'quoted'
    && hasQuotedInsertCoreDimensions(item)
    && hasQuotedProxyInsertMaterial(item)
}

function isAllowedQuotedStandardLeafletBundleItem(item: ComplexPackagingItem, gate?: PricingTrialItemGate): boolean {
  return gate?.gateStatus === 'allowed_quoted_in_trial'
    && hasQuotedLeafletCoreDimensions(item)
    && hasQuotedLeafletMaterial(item)
    && hasQuotedLeafletProcessSignals(item, getSourceText(item))
}

function isAllowedQuotedGenericLeafletBundleItem(item: ComplexPackagingItem, gate?: PricingTrialItemGate): boolean {
  return gate?.gateStatus === 'allowed_quoted_in_trial'
    && hasQuotedLeafletCoreDimensions(item)
    && hasQuotedLeafletMaterial(item)
    && hasQuotedGenericLeafletProcessSignals(item, getSourceText(item))
}

function isAllowedQuotedStickerBundleItem(item: ComplexPackagingItem, gate?: PricingTrialItemGate): boolean {
  return gate?.gateStatus === 'allowed_quoted_in_trial'
    && hasQuotedStickerCoreDimensions(item)
    && hasQuotedStickerMaterial(item)
    && hasQuotedStickerProcessSignals(item, getSourceText(item))
}

function isAllowedQuotedCartonBundleItem(item: ComplexPackagingItem, gate?: PricingTrialItemGate): boolean {
  return gate?.gateStatus === 'allowed_quoted_in_trial'
    && gate.reasonCode === 'trial_scope_allowed_quoted_simple_carton'
    && hasQuotedCartonCoreDimensions(item)
    && hasQuotedCartonMaterial(item)
    && hasQuotedCartonProcessSignals(item, getSourceText(item))
}

function isAllowedQuotedBlankFoilBagBundleItem(item: ComplexPackagingItem, gate?: PricingTrialItemGate): boolean {
  return gate?.gateStatus === 'allowed_quoted_in_trial'
    && item.productType === 'foil_bag'
    && !hasPositivePrintSignal(item, getSourceText(item))
}

function isAllowedQuotedStandardInsertBundleItem(item: ComplexPackagingItem, gate?: PricingTrialItemGate): boolean {
  return gate?.gateStatus === 'allowed_quoted_in_trial'
    && hasQuotedInsertCoreDimensions(item)
    && hasQuotedInsertMaterial(item)
    && hasQuotedInsertProcessSignals(item, getSourceText(item))
}

function isAllowedQuotedProxyInsertBundleItem(item: ComplexPackagingItem, gate?: PricingTrialItemGate): boolean {
  return gate?.gateStatus === 'allowed_quoted_in_trial'
    && hasQuotedInsertCoreDimensions(item)
    && hasQuotedProxyInsertMaterial(item)
}

function classifyExtendedMainPlusInsert(
  request: ComplexPackagingRequest,
  itemGates: PricingTrialItemGate[],
): ExtendedMainPlusInsertClassification | undefined {
  if (request.subItems.length !== 1 || request.subItems[0]?.productType !== 'box_insert') {
    return undefined
  }

  if (!['mailer_box', 'window_box'].includes(request.mainItem.productType)) {
    return undefined
  }

  if (itemGates.some((gate) => gate.gateStatus === 'handoff_only_in_trial')) {
    return 'extended_main_plus_insert_handoff_only'
  }

  const mainGate = itemGates[0]
  const insertGate = itemGates[1]
  const insert = request.subItems[0]
  const mainAllowed = mainGate?.gateStatus === 'allowed_quoted_in_trial'
    && hasQuotedMainBoxCoreDimensions(request.mainItem)
    && hasQuotedMainBoxMaterial(request.mainItem)
    && hasQuotedMainBoxProcessSignals(request.mainItem, getSourceText(request.mainItem))
    && !isAllowedQuotedNoFilmWindowItem(request.mainItem, mainGate)

  if (!mainAllowed || !insert) {
    return 'extended_main_plus_insert_estimated_only'
  }

  const insertAllowed = isAllowedQuotedStandardInsertBundleItem(insert, insertGate)
    || isAllowedQuotedProxyInsertBundleItem(insert, insertGate)

  if (request.mainItem.productType === 'mailer_box' && insertAllowed) {
    return 'extended_main_plus_insert_quoted_candidate'
  }

  return 'extended_main_plus_insert_estimated_only'
}

function classifyMultiAccessoryStandardBundle(
  request: ComplexPackagingRequest,
  itemGates: PricingTrialItemGate[],
): MultiAccessoryStandardBundleClassification | undefined {
  if (request.subItems.length !== 2) {
    return undefined
  }

  if (itemGates.some((gate) => gate.gateStatus === 'handoff_only_in_trial')) {
    return 'multi_accessory_standard_bundle_handoff_only'
  }

  const mainAllowed = itemGates[0]?.gateStatus === 'allowed_quoted_in_trial'
    && ['tuck_end_box', 'mailer_box'].includes(request.mainItem.productType)
    && hasQuotedMainBoxCoreDimensions(request.mainItem)
    && hasQuotedMainBoxMaterial(request.mainItem)
    && hasQuotedMainBoxProcessSignals(request.mainItem, getSourceText(request.mainItem))

  if (!mainAllowed) {
    return 'multi_accessory_standard_bundle_estimated_only'
  }

  const leafletIndex = request.subItems.findIndex((item) => item.productType === 'leaflet_insert')
  const insertIndex = request.subItems.findIndex((item) => item.productType === 'box_insert')
  const stickerIndex = request.subItems.findIndex((item) => item.productType === 'seal_sticker')
  const cartonIndex = request.subItems.findIndex((item) => item.productType === 'carton_packaging')

  const leaflet = leafletIndex >= 0 ? request.subItems[leafletIndex] : undefined
  const insert = insertIndex >= 0 ? request.subItems[insertIndex] : undefined
  const sticker = stickerIndex >= 0 ? request.subItems[stickerIndex] : undefined
  const carton = cartonIndex >= 0 ? request.subItems[cartonIndex] : undefined

  const leafletGate = leafletIndex >= 0 ? itemGates[leafletIndex + 1] : undefined
  const insertGate = insertIndex >= 0 ? itemGates[insertIndex + 1] : undefined
  const stickerGate = stickerIndex >= 0 ? itemGates[stickerIndex + 1] : undefined
  const cartonGate = cartonIndex >= 0 ? itemGates[cartonIndex + 1] : undefined

  const hasStandardLeaflet = Boolean(leaflet && isAllowedQuotedStandardLeafletBundleItem(leaflet, leafletGate))
  const hasGenericLeaflet = Boolean(leaflet && isAllowedQuotedGenericLeafletBundleItem(leaflet, leafletGate))
  const hasStandardInsert = Boolean(insert && isAllowedQuotedStandardInsertBundleItem(insert, insertGate))
  const hasProxyInsert = Boolean(insert && isAllowedQuotedProxyInsertBundleItem(insert, insertGate))
  const hasStandardSticker = Boolean(sticker && isAllowedQuotedStickerBundleItem(sticker, stickerGate))
  const hasStandardCarton = Boolean(carton && isAllowedQuotedCartonBundleItem(carton, cartonGate))

  if (
    (hasStandardLeaflet && hasStandardSticker)
    || (hasStandardInsert && hasStandardLeaflet)
    || (hasStandardInsert && hasStandardSticker)
    || (hasStandardLeaflet && hasStandardCarton)
  ) {
    return 'multi_accessory_standard_bundle_quoted_candidate'
  }

  if (hasGenericLeaflet || hasProxyInsert) {
    return 'multi_accessory_standard_bundle_estimated_only'
  }

  return 'multi_accessory_standard_bundle_estimated_only'
}

function getQuotedBundleSignature(
  request: ComplexPackagingRequest,
  itemGates: PricingTrialItemGate[],
): QuotedBundleSignature | undefined {
  const mainGate = itemGates[0]

  if (request.mainItem.productType === 'foil_bag' && request.subItems.length === 1) {
    const subItem = request.subItems[0]
    if (
      isAllowedQuotedBlankFoilBagBundleItem(request.mainItem, mainGate)
      && subItem?.productType === 'carton_packaging'
      && isAllowedQuotedCartonBundleItem(subItem, itemGates[1])
    ) {
      return 'blank_foil_bag_plus_carton'
    }

    return undefined
  }

  if (
    !isAllowedQuotedMainBoxProductType(request.mainItem.productType)
    || mainGate?.gateStatus !== 'allowed_quoted_in_trial'
    || !hasQuotedMainBoxCoreDimensions(request.mainItem)
    || !hasQuotedMainBoxMaterial(request.mainItem)
    || !hasQuotedMainBoxProcessSignals(request.mainItem, getSourceText(request.mainItem))
    || isAllowedQuotedNoFilmWindowItem(request.mainItem, mainGate)
  ) {
    return undefined
  }

  if (request.subItems.length === 1) {
    const subItem = request.subItems[0]
    if (!subItem) {
      return undefined
    }

    if (subItem.productType === 'leaflet_insert') {
      if (isAllowedQuotedStandardLeafletBundleItem(subItem, itemGates[1])) {
        return 'main_plus_standard_leaflet'
      }
    }

    if (
      request.mainItem.productType === 'mailer_box'
      && subItem.productType === 'box_insert'
      && isAllowedQuotedStandardInsertBundleItem(subItem, itemGates[1])
    ) {
      return 'mailer_plus_standard_insert'
    }

    if (
      request.mainItem.productType === 'tuck_end_box'
      && subItem.productType === 'box_insert'
      && isAllowedQuotedStandardInsertBundleItem(subItem, itemGates[1])
    ) {
      return 'tuck_end_plus_standard_insert'
    }

    if (
      request.mainItem.productType === 'mailer_box'
      && subItem.productType === 'box_insert'
      && isAllowedQuotedProxyInsertBundleItem(subItem, itemGates[1])
    ) {
      return 'mailer_plus_proxy_insert'
    }

    if (
      request.mainItem.productType === 'tuck_end_box'
      && subItem.productType === 'box_insert'
      && isAllowedQuotedProxyInsertBundleItem(subItem, itemGates[1])
    ) {
      return 'tuck_end_plus_proxy_insert'
    }

    if (subItem.productType === 'seal_sticker' && isAllowedQuotedStickerBundleItem(subItem, itemGates[1])) {
      return 'main_plus_sticker'
    }

    if (subItem.productType === 'carton_packaging' && isAllowedQuotedCartonBundleItem(subItem, itemGates[1])) {
      return 'main_plus_simple_carton'
    }

    return undefined
  }

  if (request.subItems.length === 2) {
    const multiAccessoryClassification = classifyMultiAccessoryStandardBundle(request, itemGates)

    if (multiAccessoryClassification === 'multi_accessory_standard_bundle_quoted_candidate') {
      return 'multi_accessory_standard_bundle_quoted'
    }
  }

  return undefined
}

function createItemGate(input: PricingTrialItemGate): PricingTrialItemGate {
  return input
}

function classifyTrialItemGate(item: ComplexPackagingItem, itemIndex: number): PricingTrialItemGate {
  const buildResult = buildWorkbookLineItemQuote(item)
  const text = getSourceText(item)
  const title = getItemTitle(item)
  const lineQuote = buildResult?.lineQuote
  const templateId = lineQuote?.templateId
  const material = item.productType === 'leaflet_insert'
    ? item.paperType || item.material
    : item.productType === 'box_insert'
      ? item.insertMaterial || item.material
      : item.productType === 'seal_sticker'
        ? item.stickerMaterial || item.material
        : item.material

  if (!buildResult || !lineQuote) {
    return createItemGate({
      itemIndex,
      itemType: item.productType,
      itemTitle: title,
      templateId,
      gateStatus: 'estimated_only_in_trial',
      reasonCode: 'trial_scope_estimated_only',
      reasonText: `当前路径在试运行内只允许参考报价：${title}还没有稳定落入可正式报价的试运行模板。`,
    })
  }

  if (item.productType === 'box_insert' && buildResult.status === 'handoff_required') {
    return createItemGate({
      itemIndex,
      itemType: item.productType,
      itemTitle: title,
      templateId,
      gateStatus: 'handoff_only_in_trial',
      reasonCode: 'trial_scope_handoff_only',
      reasonText: '当前路径在试运行内只允许人工兜底：复杂内托结构、特材或 blocking 术语仍未进入标准内托模板范围。',
    })
  }

  if (buildResult.status === 'handoff_required') {
    return createItemGate({
      itemIndex,
      itemType: item.productType,
      itemTitle: title,
      templateId,
      gateStatus: 'handoff_only_in_trial',
      reasonCode: 'trial_scope_handoff_only',
      reasonText: `当前路径在试运行内只允许人工兜底：${title}命中了未稳定映射模板的结构或术语。`,
    })
  }

  if (templateId === 'tuck_end_box_template' && lineQuote.status === 'quoted') {
    return createItemGate({
      itemIndex,
      itemType: item.productType,
      itemTitle: title,
      templateId,
      gateStatus: 'allowed_quoted_in_trial',
      reasonCode: 'trial_scope_allowed_quoted',
      reasonText: '当前路径属于试运行允许正式报价范围：标准双插盒主件。',
    })
  }

  if (templateId === 'mailer_box_template' && lineQuote.status === 'quoted') {
    return createItemGate({
      itemIndex,
      itemType: item.productType,
      itemTitle: title,
      templateId,
      gateStatus: 'allowed_quoted_in_trial',
      reasonCode: 'trial_scope_allowed_quoted',
      reasonText: '当前路径属于试运行允许正式报价范围：已验证飞机盒标准路径。',
    })
  }

  if (
    templateId === 'window_box_template'
    && lineQuote.status === 'quoted'
    && lineQuote.lineItems.some((line) => line.code === 'window_process')
    && item.laminationType === 'glossy'
    && !isNoFilmWindow(text)
    && lineQuote.lineItems.some((line) => line.code === 'window_film')
  ) {
    return createItemGate({
      itemIndex,
      itemType: item.productType,
      itemTitle: title,
      templateId,
      gateStatus: 'allowed_quoted_in_trial',
      reasonCode: 'trial_scope_allowed_quoted',
      reasonText: '当前路径属于试运行允许正式报价范围：标准开窗覆光胶贴片路径。',
    })
  }

  if (
    templateId === 'window_box_template'
    && lineQuote.status === 'quoted'
    && isNoFilmWindow(text)
    && item.laminationType === 'glossy'
    && lineQuote.lineItems.some((line) => line.code === 'window_process')
    && !lineQuote.lineItems.some((line) => line.code === 'window_film')
  ) {
    return createItemGate({
      itemIndex,
      itemType: item.productType,
      itemTitle: title,
      templateId,
      gateStatus: 'allowed_quoted_in_trial',
      reasonCode: 'trial_scope_allowed_quoted',
      reasonText: '当前路径属于试运行允许正式报价范围：标准开窗不贴胶片覆光胶单品路径。',
    })
  }

  if (templateId === 'leaflet_insert_template' && lineQuote.status === 'quoted' && item.printColor !== 'generic_print') {
    return createItemGate({
      itemIndex,
      itemType: item.productType,
      itemTitle: title,
      templateId,
      gateStatus: 'allowed_quoted_in_trial',
      reasonCode: 'trial_scope_allowed_quoted',
      reasonText: '当前路径属于试运行允许正式报价范围：标准说明书。',
    })
  }

  if (isHighFrequencyQuotedGenericLeaflet(item, templateId, lineQuote.status)) {
    return createItemGate({
      itemIndex,
      itemType: item.productType,
      itemTitle: title,
      templateId,
      gateStatus: 'allowed_quoted_in_trial',
      reasonCode: 'trial_scope_allowed_quoted',
      reasonText: '当前路径属于试运行允许正式报价范围：高频 generic 说明书已进入标准化 quoted candidate。',
    })
  }

  if (isStandardQuotedBoxInsert(item, templateId, lineQuote.status)) {
    return createItemGate({
      itemIndex,
      itemType: item.productType,
      itemTitle: title,
      templateId,
      gateStatus: 'allowed_quoted_in_trial',
      reasonCode: 'trial_scope_allowed_quoted',
      reasonText: '当前路径属于试运行允许正式报价范围：标准内托单品（显式克重）。',
    })
  }

  if (isHighFrequencyQuotedProxyInsert(item, templateId, lineQuote.status)) {
    return createItemGate({
      itemIndex,
      itemType: item.productType,
      itemTitle: title,
      templateId,
      gateStatus: 'allowed_quoted_in_trial',
      reasonCode: 'trial_scope_allowed_quoted',
      reasonText: '当前路径属于试运行允许正式报价范围：高频默认克重 proxy 内托已进入标准化 quoted candidate。',
    })
  }

  if (
    templateId === 'seal_sticker_template'
    && lineQuote.status === 'quoted'
    && material === 'clear_sticker'
    && !hasPositivePrintSignal(item, text)
  ) {
    return createItemGate({
      itemIndex,
      itemType: item.productType,
      itemTitle: title,
      templateId,
      gateStatus: 'allowed_quoted_in_trial',
      reasonCode: 'trial_scope_allowed_quoted',
      reasonText: '当前路径属于试运行允许正式报价范围：标准透明封口贴。',
    })
  }

  if (
    templateId === 'foil_bag_template'
    && lineQuote.status === 'quoted'
    && isStandardPrintedFoilBagQuotedCandidate(item, text)
  ) {
    return createItemGate({
      itemIndex,
      itemType: item.productType,
      itemTitle: title,
      templateId,
      gateStatus: 'allowed_quoted_in_trial',
      reasonCode: 'trial_scope_allowed_quoted',
      reasonText: '当前路径属于试运行允许正式报价范围：标准 8 丝单面四色铝箔袋 quoted candidate。',
    })
  }

  if (
    templateId === 'foil_bag_template'
    && lineQuote.status === 'quoted'
    && !hasPositivePrintSignal(item, text)
  ) {
    return createItemGate({
      itemIndex,
      itemType: item.productType,
      itemTitle: title,
      templateId,
      gateStatus: 'allowed_quoted_in_trial',
      reasonCode: 'trial_scope_allowed_quoted',
      reasonText: '当前路径属于试运行允许正式报价范围：空白铝箔袋。',
    })
  }

  if (
    templateId === 'carton_packaging_template'
    && lineQuote.status === 'quoted'
    && isStandardPrintedCartonQuotedCandidate(item, text)
  ) {
    return createItemGate({
      itemIndex,
      itemType: item.productType,
      itemTitle: title,
      templateId,
      gateStatus: 'allowed_quoted_in_trial',
      reasonCode: 'trial_scope_allowed_quoted_standard_printed_carton',
      reasonText: '当前路径属于试运行允许正式报价范围：标准 K636K 单面四色大外箱 quoted candidate。',
    })
  }

  if (
    templateId === 'carton_packaging_template'
    && lineQuote.status === 'quoted'
    && !hasPositivePrintSignal(item, text)
    && !lineQuote.lineItems.some((line) => line.code === 'carton_printing')
  ) {
    return createItemGate({
      itemIndex,
      itemType: item.productType,
      itemTitle: title,
      templateId,
      gateStatus: 'allowed_quoted_in_trial',
      reasonCode: 'trial_scope_allowed_quoted_simple_carton',
      reasonText: '当前路径属于试运行允许正式报价范围：simple carton packaging。',
    })
  }

  if (templateId === 'leaflet_insert_template' && lineQuote.status === 'estimated') {
    return createItemGate({
      itemIndex,
      itemType: item.productType,
      itemTitle: title,
      templateId,
      gateStatus: 'estimated_only_in_trial',
      reasonCode: 'trial_scope_estimated_only',
      reasonText: '当前路径在试运行内只允许参考报价：generic 说明书只在高频标准化 candidate 内放开，其余路径继续保守。',
    })
  }

  if (templateId === 'box_insert_template') {
    return createItemGate({
      itemIndex,
      itemType: item.productType,
      itemTitle: title,
      templateId,
      gateStatus: 'estimated_only_in_trial',
      reasonCode: 'trial_scope_estimated_only',
      reasonText: '当前路径在试运行内只允许参考报价：内托虽已落入模板，但未进入当前高频标准化或标准 quoted 白名单。',
    })
  }

  if (templateId === 'window_box_template' && isNoFilmWindow(text)) {
    return createItemGate({
      itemIndex,
      itemType: item.productType,
      itemTitle: title,
      templateId,
      gateStatus: 'estimated_only_in_trial',
      reasonCode: 'trial_scope_estimated_only',
      reasonText: '当前路径在试运行内只允许参考报价：开窗不贴胶片路径继续保守 estimated。',
    })
  }

  if (templateId === 'foil_bag_template' && hasPositivePrintSignal(item, text)) {
    return createItemGate({
      itemIndex,
      itemType: item.productType,
      itemTitle: title,
      templateId,
      gateStatus: 'estimated_only_in_trial',
      reasonCode: 'trial_scope_estimated_only',
      reasonText: '当前路径在试运行内只允许参考报价：printed/custom foil bag 当前只放开标准 8 丝单面四色单品，其余路径继续保守。',
    })
  }

  if (templateId === 'carton_packaging_template' && hasPositivePrintSignal(item, text)) {
    return createItemGate({
      itemIndex,
      itemType: item.productType,
      itemTitle: title,
      templateId,
      gateStatus: 'estimated_only_in_trial',
      reasonCode: 'trial_scope_estimated_only',
      reasonText: '当前路径在试运行内只允许参考报价：printed carton packaging 当前只放开标准 K636K 单面四色大外箱单品，其余路径继续保守。',
    })
  }

  return createItemGate({
    itemIndex,
    itemType: item.productType,
    itemTitle: title,
    templateId,
    gateStatus: 'estimated_only_in_trial',
    reasonCode: 'trial_scope_estimated_only',
    reasonText: `当前路径在试运行内只允许参考报价：${title}虽可计算，但还未进入当前 trial 的正式 quoted 白名单。`,
  })
}

function buildQuotedBundleReason(signature: QuotedBundleSignature): string {
  switch (signature) {
    case 'main_plus_standard_leaflet':
      return '当前组合属于试运行允许正式报价范围：标准主盒 + 标准说明书。'
    case 'mailer_plus_standard_insert':
      return '当前组合属于试运行允许正式报价范围：已验证飞机盒 + 标准内托。'
    case 'tuck_end_plus_standard_insert':
      return '当前组合属于试运行允许正式报价范围：标准双插盒 + 标准内托。'
    case 'main_plus_sticker':
      return '当前组合属于试运行允许正式报价范围：标准主盒 + 标准贴纸。'
    case 'main_plus_simple_carton':
      return '当前组合属于试运行允许正式报价范围：标准主盒 + simple carton packaging。'
    case 'blank_foil_bag_plus_carton':
      return '当前组合属于试运行允许正式报价范围：空白铝箔袋 + simple carton packaging。'
    case 'mailer_plus_proxy_insert':
      return '当前组合属于试运行允许正式报价范围：已验证飞机盒 + 高频 proxy 内托。'
    case 'tuck_end_plus_proxy_insert':
      return '当前组合属于试运行允许正式报价范围：标准双插盒 + 高频 proxy 内托。'
    case 'multi_accessory_standard_bundle_quoted':
      return '当前组合属于试运行允许正式报价范围：multi_accessory_standard_bundle_quoted_candidate 当前只放开标准双插盒 / 已验证飞机盒 + 标准说明书 + 标准贴纸、+ 标准内托 + 标准说明书、+ 标准内托 + 标准贴纸、+ 标准说明书 + simple carton packaging。'
    default:
      return '当前组合属于试运行允许正式报价范围。'
  }
}

function buildEstimatedBundleReason(request: ComplexPackagingRequest, itemGates: PricingTrialItemGate[]): string {
  const allSubItemsAllowed = itemGates.slice(1).length > 0 && itemGates.slice(1).every((gate) => gate.gateStatus === 'allowed_quoted_in_trial')
  const extendedMainPlusInsertClassification = classifyExtendedMainPlusInsert(request, itemGates)
  const multiAccessoryClassification = classifyMultiAccessoryStandardBundle(request, itemGates)

  if (request.subItems.length === 1 && request.subItems[0]?.productType === 'box_insert') {
    if (extendedMainPlusInsertClassification === 'extended_main_plus_insert_estimated_only') {
      return '当前组合在试运行内只允许参考报价：extended_main_plus_insert_estimated_only 当前仍覆盖开窗主盒 + 内托等未完成 order-level 放开验证的保守子集；本轮只把已验证飞机盒 + 标准/高频 proxy 内托提升到 quoted candidate。'
    }

    if (itemGates[1]?.gateStatus === 'allowed_quoted_in_trial') {
      return '当前组合在试运行内只允许参考报价：当前只放开标准双插盒与已验证飞机盒的标准/高频 proxy 内托白名单，其余主盒 + 内托组合继续保守。'
    }

    if (itemGates[1]?.gateStatus === 'estimated_only_in_trial') {
      return '当前组合在试运行内只允许参考报价：内托仍存在更宽 proxy、缺关键参数或未进入高频标准化 quoted candidate。'
    }
  }

  if (multiAccessoryClassification === 'multi_accessory_standard_bundle_estimated_only') {
    const hasGenericLeaflet = request.subItems.some((item, index) => item.productType === 'leaflet_insert' && isAllowedQuotedGenericLeafletBundleItem(item, itemGates[index + 1]))
    const hasProxyInsert = request.subItems.some((item, index) => item.productType === 'box_insert' && isAllowedQuotedProxyInsertBundleItem(item, itemGates[index + 1]))

    if (hasGenericLeaflet || hasProxyInsert) {
      return '当前组合在试运行内只允许参考报价：multi_accessory_standard_bundle_estimated_only 当前继续覆盖含 generic leaflet / proxy insert 的多配件标准 bundle；这些组件虽然 individually 可算，但两配件组合仍不放开 quoted。'
    }

    return '当前组合在试运行内只允许参考报价：multi_accessory_standard_bundle_estimated_only 当前只放开标准双插盒 / 已验证飞机盒 + 标准说明书 + 标准贴纸、+ 标准内托 + 标准说明书、+ 标准内托 + 标准贴纸、+ 标准说明书 + simple carton packaging；其余多配件标准组合继续保守。'
  }

  if (request.subItems.length === 1 && request.subItems[0]?.productType === 'leaflet_insert') {
    const leafletItem = request.subItems[0]

    if (isAllowedQuotedGenericLeafletBundleItem(leafletItem, itemGates[1])) {
      return '当前组合在试运行内只允许参考报价：generic leaflet 单品虽然仍保留高频标准化 quoted 能力，但挂到主盒后必须更保守；标准双插盒 + generic 说明书当前仍按 estimated 处理，避免把上下文补全误放大成正式报价。'
    }
  }

  const estimatedTitles = itemGates
    .filter((gate) => gate.gateStatus === 'estimated_only_in_trial')
    .map((gate) => gate.itemTitle)

  if (estimatedTitles.length > 0) {
    return `当前组合在试运行内只允许参考报价：${Array.from(new Set(estimatedTitles)).join('、')}仍在保守路径内。`
  }

  if (allSubItemsAllowed) {
    return '当前组合在试运行内只允许参考报价：当前只放开标准单配件 bundle，以及当前已验证的多配件标准 bundle quoted candidate 白名单。'
  }

  return '当前组合在试运行内只允许参考报价：当前只放开标准主盒 + 单一标准说明书 / 标准贴纸 / simple carton、空白铝箔袋 + simple carton、标准双插盒 / 已验证飞机盒的多配件标准 bundle quoted candidate，以及标准双插盒 / 已验证飞机盒 + 标准或高频 proxy 内托。generic leaflet 挂主盒组合继续保守。'
}

function buildHandoffBundleReason(request: ComplexPackagingRequest, itemGates: PricingTrialItemGate[]): string {
  const extendedMainPlusInsertClassification = classifyExtendedMainPlusInsert(request, itemGates)
  const multiAccessoryClassification = classifyMultiAccessoryStandardBundle(request, itemGates)

  if (extendedMainPlusInsertClassification === 'extended_main_plus_insert_handoff_only') {
    return '当前组合在试运行内只允许人工兜底：extended_main_plus_insert_handoff_only 仍覆盖复杂内托、blocking 术语、特材或文件驱动的主盒 + 内托组合。'
  }

  if (multiAccessoryClassification === 'multi_accessory_standard_bundle_handoff_only') {
    return '当前组合在试运行内只允许人工兜底：multi_accessory_standard_bundle_handoff_only 仍覆盖多配件组合里的复杂内托、blocking 术语、特材、文件驱动或其他明显依赖人工工艺判断的路径。'
  }

  const handoffTitles = itemGates
    .filter((gate) => gate.gateStatus === 'handoff_only_in_trial')
    .map((gate) => gate.itemTitle)

  if (handoffTitles.length > 0) {
    return `当前组合在试运行内只允许人工兜底：${Array.from(new Set(handoffTitles)).join('、')}命中了 handoff-only 路径。`
  }

  return '当前组合在试运行内只允许人工兜底。'
}

export function assessPricingTrialScope(request: ComplexPackagingRequest): PricingTrialScopeAssessment {
  const itemGates = request.allItems.map((item, index) => classifyTrialItemGate(item, index))

  if (request.hasReferenceFile || request.requiresHumanReview) {
    const handoffReasonText = '当前路径在试运行内只允许人工兜底：涉及设计文件、复杂结构或高复杂人工复核信号。'
    return {
      requestGateStatus: 'handoff_only_in_trial',
      requestGateReasonCode: 'trial_scope_handoff_only',
      requestGateReasonText: handoffReasonText,
      bundleGateStatus: request.isBundle ? 'handoff_only_bundle_in_trial' : undefined,
      bundleGateReasonCode: request.isBundle ? 'trial_bundle_handoff_only' : undefined,
      bundleGateReasonText: request.isBundle ? handoffReasonText : undefined,
      itemGates,
    }
  }

  if (!request.isBundle) {
    const mainGate = itemGates[0]
    return {
      requestGateStatus: mainGate.gateStatus,
      requestGateReasonCode: mainGate.reasonCode,
      requestGateReasonText: mainGate.reasonText,
      itemGates,
    }
  }

  if (itemGates.some((gate) => gate.gateStatus === 'handoff_only_in_trial')) {
    const reasonText = buildHandoffBundleReason(request, itemGates)
    return {
      requestGateStatus: 'handoff_only_in_trial',
      requestGateReasonCode: 'trial_bundle_handoff_only',
      requestGateReasonText: reasonText,
      bundleGateStatus: 'handoff_only_bundle_in_trial',
      bundleGateReasonCode: 'trial_bundle_handoff_only',
      bundleGateReasonText: reasonText,
      itemGates,
    }
  }

  const mainGate = itemGates[0]
  const mainAllowed = mainGate?.gateStatus === 'allowed_quoted_in_trial'
  const quotedBundleSignature = getQuotedBundleSignature(request, itemGates)

  if (mainAllowed && quotedBundleSignature) {
    const reasonText = buildQuotedBundleReason(quotedBundleSignature)
    return {
      requestGateStatus: 'allowed_quoted_in_trial',
      requestGateReasonCode: 'trial_standard_bundle_quoted',
      requestGateReasonText: reasonText,
      bundleGateStatus: 'standard_quoted_bundle_in_trial',
      bundleGateReasonCode: 'trial_standard_bundle_quoted',
      bundleGateReasonText: reasonText,
      itemGates,
    }
  }

  const reasonText = buildEstimatedBundleReason(request, itemGates)
  return {
    requestGateStatus: 'estimated_only_in_trial',
    requestGateReasonCode: 'trial_bundle_estimated_only',
    requestGateReasonText: reasonText,
    bundleGateStatus: 'estimated_only_bundle_in_trial',
    bundleGateReasonCode: 'trial_bundle_estimated_only',
    bundleGateReasonText: reasonText,
    itemGates,
  }
}