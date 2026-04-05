import { getSampleFilesByCategory } from '@/lib/sampleFiles'
import { getEstimatedAllowedMissingSets, getFieldLabel, isEstimatedAllowed } from '@/lib/catalog/helpers'
import { hasStrongFileReviewSignal } from '@/server/intent/detectIntent'
import { assessComplexPackagingPricingReview } from '@/server/pricing/complexPackagingQuote'
import type {
  ComplexPackagingConversationSnapshot,
  ComplexPackagingConversationAction,
  ComplexPackagingDecision,
  ComplexPackagingItem,
  ComplexPackagingMissingDetail,
  ComplexPackagingProductType,
  ComplexPackagingRequest,
  ComplexPackagingTurnResolution,
  SizeUnit,
} from './types'

const ITEM_TYPE_TITLES: Record<ComplexPackagingProductType, string> = {
  mailer_box: '飞机盒',
  tuck_end_box: '双插盒',
  window_box: '开窗彩盒',
  leaflet_insert: '说明书',
  box_insert: '内托',
  seal_sticker: '封口贴',
}

const ITEM_ALIASES: Array<{ aliases: string[]; productType: ComplexPackagingProductType; title: string }> = [
  { aliases: ['飞机盒'], productType: 'mailer_box', title: '飞机盒' },
  { aliases: ['双插盒'], productType: 'tuck_end_box', title: '双插盒' },
  { aliases: ['双插开窗彩盒', '双插开窗盒', '开窗双插盒', '开窗彩盒', '开窗盒', '彩盒'], productType: 'window_box', title: '开窗彩盒' },
  { aliases: ['说明书', '折页'], productType: 'leaflet_insert', title: '说明书' },
  { aliases: ['内托'], productType: 'box_insert', title: '内托' },
  { aliases: ['透明贴纸', '封口贴', '贴纸'], productType: 'seal_sticker', title: '封口贴' },
]

const MATERIAL_ALIASES: Array<{ alias: string; normalized: string }> = [
  { alias: '牛纸', normalized: 'kraft' },
  { alias: '牛皮纸', normalized: 'kraft' },
  { alias: '白卡', normalized: 'white_card' },
  { alias: '白卡纸', normalized: 'white_card' },
  { alias: '单铜', normalized: 'single_coated' },
  { alias: '双铜', normalized: 'double_coated' },
  { alias: '特种纸板', normalized: 'specialty_board' },
  { alias: 'web特种纸板', normalized: 'specialty_board' },
  { alias: '透明贴纸', normalized: 'clear_sticker' },
]

const PROCESS_KEYWORDS = ['裱', '啤', '粘', '粘合', '过哑胶', '过光胶', '开窗', '贴胶片', 'uv']
const HUMAN_REVIEW_KEYWORDS = ['异形', '磁吸', '天地盖', '吸塑', 'eva', '木盒', '金属']
const REFERENCE_CONTINUATION_PATTERNS = ['按这个方案报价', '按这个方案', '按你刚才推荐的来', '按你刚才的来', '就按这个做', '就按这个']
const ADD_ITEM_PATTERNS = ['再加', '加一个', '加上', '增加', '补一个']
const REMOVE_ITEM_PATTERNS = ['不要了', '去掉', '删掉', '删除', '取消', '不用了', '不需要了', '先不要', '贴纸不要', '说明书不要']
const UPDATE_ITEM_PATTERNS = ['改成', '改为', '换成', '换为', '数量改']
const PRONOUN_REMOVE_PATTERNS = ['这个不要了', '这个不用了', '这个去掉', '这个删掉', '这个删除']

function toLowerText(text: string): string {
  return text.trim().toLowerCase()
}

function normalizeTitle(rawTitle?: string, fallbackType?: ComplexPackagingProductType): string {
  if (rawTitle && rawTitle.trim()) {
    return rawTitle.trim()
  }

  switch (fallbackType) {
    case 'mailer_box':
      return '飞机盒'
    case 'tuck_end_box':
      return '双插盒'
    case 'window_box':
      return '开窗彩盒'
    case 'leaflet_insert':
      return '说明书'
    case 'box_insert':
      return '内托'
    case 'seal_sticker':
      return '封口贴'
    default:
      return '复杂包装项'
  }
}

function defaultTitleByType(productType: ComplexPackagingProductType): string {
  return ITEM_TYPE_TITLES[productType]
}

function findFirstMatch(text: string, aliases: string[]): string | undefined {
  return aliases.find((alias) => text.includes(alias))
}

function detectItemType(text: string): { productType: ComplexPackagingProductType; title: string } | null {
  for (const item of ITEM_ALIASES) {
    const hit = findFirstMatch(text, item.aliases)
    if (hit) {
      return {
        productType: item.productType,
        title: hit,
      }
    }
  }

  return null
}

function extractSegments(text: string): Array<{ rawTitle: string; segment: string; productType: ComplexPackagingProductType }> {
  const matches = ITEM_ALIASES.flatMap((item) =>
    item.aliases.flatMap((alias) => {
      const index = text.indexOf(alias)
      if (index === -1) return []
      return [{ index, alias, productType: item.productType }]
    })
  ).sort((a, b) => a.index - b.index || b.alias.length - a.alias.length)

  if (matches.length === 0) {
    return []
  }

  const deduped = matches.filter((match, idx) => {
    if (idx === 0) {
      return true
    }

    const previous = matches[idx - 1]
    const previousEnd = previous.index + previous.alias.length
    if (match.index < previousEnd) {
      return false
    }

    if (match.productType === previous.productType) {
      const between = text.slice(previousEnd, match.index)
      if (!/[；;\n]/.test(between)) {
        return false
      }
    }

    return true
  })

  return deduped.map((match, idx) => {
    const end = idx + 1 < deduped.length ? deduped[idx + 1].index : text.length
    return {
      rawTitle: match.alias,
      segment: text.slice(match.index, end).trim(),
      productType: match.productType,
    }
  })
}

function extractQuantity(text: string): number | undefined {
  const patterns = [
    /数量\s*(?:改成|改为|到)?\s*[:：]?\s*(\d{2,6})/i,
    /数量\s*[:：]?\s*(\d{2,6})/i,
    /(\d{2,6})\s*(个|张|本|份|pcs|套)(?![a-z0-9])/i,
    /(?:^|[，,；;\s])(\d{2,6})(?=\s*[；;，,])/i,
    /(?:^|[，,；;\s])(\d{2,6})\s*$/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const value = Number(match[1])
      if (Number.isFinite(value)) {
        return value
      }
    }
  }

  return undefined
}

function extractThreeDimensions(text: string): { length: number; width: number; height: number; unit: SizeUnit } | null {
  const match = text.match(/(\d+(?:\.\d+)?)\s*[*xX×]\s*(\d+(?:\.\d+)?)\s*[*xX×]\s*(\d+(?:\.\d+)?)\s*(mm|cm)?/i)
  if (!match) return null

  return {
    length: Number(match[1]),
    width: Number(match[2]),
    height: Number(match[3]),
    unit: (match[4]?.toLowerCase() as SizeUnit) || 'mm',
  }
}

function extractTwoDimensions(text: string): { length: number; width: number; unit: SizeUnit } | null {
  const match = text.match(/(\d+(?:\.\d+)?)\s*[*xX×]\s*(\d+(?:\.\d+)?)\s*(mm|cm)?/i)
  if (!match) return null

  return {
    length: Number(match[1]),
    width: Number(match[2]),
    unit: (match[3]?.toLowerCase() as SizeUnit) || 'mm',
  }
}

function extractWeight(text: string): number | undefined {
  const match = text.match(/(\d+(?:\.\d+)?)\s*克/i)
  if (!match) return undefined
  return Number(match[1])
}

function extractMaterial(text: string): string | undefined {
  const lowered = toLowerText(text)
  return MATERIAL_ALIASES.find((item) => lowered.includes(item.alias.toLowerCase()))?.normalized
}

function extractPrintColor(text: string): string | undefined {
  if (text.includes('双面黑白') || text.includes('正反黑白') || text.includes('黑白')) return 'black'
  if (text.includes('正反四色') || text.includes('双面四色')) return 'double_four_color'
  if (text.includes('四色') && text.includes('专色')) return 'four_color_spot'
  if (text.includes('四色')) return 'four_color'
  if (text.includes('印黑色') || text.includes('黑色')) return 'black'
  if (text.includes('专色')) return 'spot'
  return undefined
}

function extractSurfaceFinish(text: string): string | undefined {
  if (text.includes('过哑胶') || text.includes('哑胶') || text.includes('哑膜')) return 'matte_lamination'
  if (text.includes('过光胶') || text.includes('光胶') || text.includes('光膜')) return 'glossy_lamination'
  if (toLowerText(text).includes('uv')) return 'uv'
  return undefined
}

function extractProcesses(text: string): string[] {
  return PROCESS_KEYWORDS.filter((keyword) => toLowerText(text).includes(keyword.toLowerCase()))
}

function extractSpotColorCount(text: string): number {
  const explicit = text.match(/(\d+)\s*个?专色/)
  if (explicit) {
    return Number(explicit[1])
  }
  return text.includes('专色') ? 1 : 0
}

function extractWindowFilmThickness(text: string): number | undefined {
  const match = text.match(/(\d+(?:\.\d+)?)\s*厚胶片/i)
  if (!match) return undefined
  return Number(match[1])
}

function extractWindowSize(text: string): { length: number; width: number } | null {
  const match = text.match(/胶片\s*(\d+(?:\.\d+)?)\s*[*xX×]\s*(\d+(?:\.\d+)?)\s*(mm|cm)?/i)
  if (!match) return null

  return {
    length: Number(match[1]),
    width: Number(match[2]),
  }
}

function extractFoldCount(text: string): number | undefined {
  const match = text.match(/折\s*(\d+)\s*折|(?:(\d+)\s*折)/)
  if (!match) return undefined
  return Number(match[1] || match[2])
}

function extractPantoneCodes(text: string): string[] {
  const matches = text.match(/pantone\s*[a-z0-9-]+/gi)
  return matches || []
}

function inferReferenceFileCategory(text: string) {
  if (text.includes('刀模')) return 'dieline_pdf' as const
  if (hasStrongFileReviewSignal(text)) return 'design_file' as const
  return undefined
}

function buildReferenceFiles(text: string) {
  const category = inferReferenceFileCategory(text)
  if (!category) {
    return {
      hasReferenceFile: false,
      referenceFileCategory: undefined,
      referenceFiles: [],
    }
  }

  return {
    hasReferenceFile: true,
    referenceFileCategory: category,
    referenceFiles: getSampleFilesByCategory(category),
  }
}

function cloneItem(item: ComplexPackagingItem): ComplexPackagingItem {
  return {
    ...item,
    processes: item.processes ? [...item.processes] : undefined,
    notes: item.notes ? [...item.notes] : undefined,
    pantoneCodes: item.pantoneCodes ? [...item.pantoneCodes] : undefined,
  }
}

function cloneRequest(request: ComplexPackagingRequest): ComplexPackagingRequest {
  const items = request.allItems.map((item) => cloneItem(item))
  return {
    isBundle: items.length > 1,
    mainItem: items[0],
    subItems: items.slice(1),
    allItems: items,
    hasReferenceFile: request.hasReferenceFile,
    referenceFileCategory: request.referenceFileCategory,
    referenceFiles: [...request.referenceFiles],
    requiresHumanReview: request.requiresHumanReview,
    notes: [...request.notes],
  }
}

function hasMeaningfulItemFields(item: ComplexPackagingItem | null | undefined): boolean {
  if (!item) {
    return false
  }

  const nonSignalKeys = new Set(['productType', 'title', 'boxStyle', 'hasWindow', 'insertType', 'stickerType'])

  const keys = Object.entries(item)
    .filter(([key, value]) => !nonSignalKeys.has(key) && value !== undefined && value !== null)

  return keys.some(([, value]) => {
    if (Array.isArray(value)) {
      return value.length > 0
    }
    if (typeof value === 'string') {
      return value.trim().length > 0
    }
    return true
  })
}

function mergeStringArray(base: string[] | undefined, patch: string[] | undefined): string[] | undefined {
  if (!patch || patch.length === 0) {
    return base
  }

  if (!base || base.length === 0) {
    return [...patch]
  }

  return Array.from(new Set([...base, ...patch]))
}

function mergeComplexPackagingItem(base: ComplexPackagingItem, patch: ComplexPackagingItem): ComplexPackagingItem {
  const merged: ComplexPackagingItem = cloneItem(base)

  Object.entries(patch).forEach(([key, value]) => {
    if (key === 'productType' || key === 'title') {
      return
    }

    if (value === undefined || value === null) {
      return
    }

    if (key === 'processes' || key === 'notes' || key === 'pantoneCodes') {
      ;(merged as Record<string, any>)[key] = mergeStringArray((merged as Record<string, any>)[key], value as string[])
      return
    }

    ;(merged as Record<string, any>)[key] = value
  })

  merged.title = merged.title || defaultTitleByType(merged.productType)
  return merged
}

function buildRequestFromItems(
  items: ComplexPackagingItem[],
  message: string,
  previous?: ComplexPackagingRequest | null,
): ComplexPackagingRequest | null {
  if (items.length === 0) {
    return null
  }

  const lowered = toLowerText(message)
  const references = buildReferenceFiles(lowered)
  const referenceFiles = references.hasReferenceFile
    ? references.referenceFiles
    : previous?.referenceFiles
      ? [...previous.referenceFiles]
      : []
  const referenceFileCategory = references.referenceFileCategory || previous?.referenceFileCategory
  const hasReferenceFile = referenceFiles.length > 0
  const requiresHumanReview = hasReferenceFile
    || HUMAN_REVIEW_KEYWORDS.some((keyword) => lowered.includes(keyword))
    || items.length > 1

  return {
    isBundle: items.length > 1,
    mainItem: items[0],
    subItems: items.slice(1),
    allItems: items,
    hasReferenceFile,
    referenceFileCategory,
    referenceFiles,
    requiresHumanReview,
    notes: requiresHumanReview ? ['组合件或文件参考存在，结果默认为预报价并建议人工复核。'] : [],
  }
}

function inferDefaultQuantity(previous: ComplexPackagingRequest | null | undefined): number | undefined {
  return previous?.mainItem.quantity || previous?.allItems.find((item) => item.quantity)?.quantity
}

function normalizeAddedItem(item: ComplexPackagingItem, previous: ComplexPackagingRequest): ComplexPackagingItem {
  const normalized = cloneItem(item)
  normalized.title = normalized.title || defaultTitleByType(normalized.productType)

  if (!normalized.quantity) {
    normalized.quantity = inferDefaultQuantity(previous)
  }

  return normalized
}

function hasReferenceContinuationIntent(text: string): boolean {
  return REFERENCE_CONTINUATION_PATTERNS.some((pattern) => text.includes(pattern))
}

function hasAddItemIntent(text: string): boolean {
  return ADD_ITEM_PATTERNS.some((pattern) => text.includes(pattern))
}

function hasRemoveItemIntent(text: string): boolean {
  return REMOVE_ITEM_PATTERNS.some((pattern) => text.includes(pattern))
}

function hasUpdateItemIntent(text: string): boolean {
  return UPDATE_ITEM_PATTERNS.some((pattern) => text.includes(pattern))
}

function resolveMentionedItemType(text: string): ComplexPackagingProductType | null {
  return detectItemType(text)?.productType || null
}

function findItemIndex(request: ComplexPackagingRequest, productType: ComplexPackagingProductType): number {
  return request.allItems.findIndex((item) => item.productType === productType)
}

function classifyPatchAction(previousState: ComplexPackagingRequest, itemIndex: number): ComplexPackagingConversationAction {
  const previousItem = previousState.allItems[itemIndex]
  return collectMissingFields(previousItem).length > 0 ? 'supplement_params' : 'modify_existing_item'
}

function inferRemovalItemType(text: string, previousState: ComplexPackagingRequest): ComplexPackagingProductType | null {
  const explicitlyMentioned = resolveMentionedItemType(text)
  if (explicitlyMentioned) {
    return explicitlyMentioned
  }

  if (PRONOUN_REMOVE_PATTERNS.some((pattern) => text.includes(pattern)) && previousState.subItems.length > 0) {
    return previousState.subItems[previousState.subItems.length - 1].productType
  }

  if (previousState.subItems.length === 1 && hasRemoveItemIntent(text)) {
    return previousState.subItems[0].productType
  }

  return null
}

function buildTurnResolution(
  request: ComplexPackagingRequest | null,
  action: ComplexPackagingConversationAction | null,
  targetItem?: ComplexPackagingItem | null,
): ComplexPackagingTurnResolution {
  return {
    request,
    action,
    targetItemType: targetItem?.productType,
    targetItemTitle: targetItem ? normalizeTitle(targetItem.title, targetItem.productType) : undefined,
  }
}

function buildItemPatch(message: string, productType: ComplexPackagingProductType): ComplexPackagingItem | null {
  const patch = normalizeItem(message, productType, defaultTitleByType(productType))
  return hasMeaningfulItemFields(patch) ? patch : null
}

function removeItemFromRequest(request: ComplexPackagingRequest, itemIndex: number, message: string): ComplexPackagingRequest | null {
  const items = request.allItems
    .filter((_, index) => index !== itemIndex)
    .map((item) => cloneItem(item))

  return buildRequestFromItems(items, message, request)
}

function coerceItem(raw: any): ComplexPackagingItem | null {
  if (!raw || typeof raw !== 'object' || typeof raw.productType !== 'string') {
    return null
  }

  return cloneItem(raw as ComplexPackagingItem)
}

function coerceRequest(raw: any): ComplexPackagingRequest | null {
  if (!raw || typeof raw !== 'object') {
    return null
  }

  const allItemsSource = Array.isArray(raw.allItems)
    ? raw.allItems
    : [raw.mainItem, ...(Array.isArray(raw.subItems) ? raw.subItems : [])]

  const allItems = allItemsSource
    .map((item: unknown) => coerceItem(item))
    .filter((item: ComplexPackagingItem | null): item is ComplexPackagingItem => Boolean(item))

  if (allItems.length === 0) {
    return null
  }

  return {
    isBundle: allItems.length > 1,
    mainItem: allItems[0],
    subItems: allItems.slice(1),
    allItems,
    hasReferenceFile: Boolean(raw.hasReferenceFile),
    referenceFileCategory: raw.referenceFileCategory,
    referenceFiles: Array.isArray(raw.referenceFiles) ? raw.referenceFiles : [],
    requiresHumanReview: Boolean(raw.requiresHumanReview) || allItems.length > 1,
    notes: Array.isArray(raw.notes) ? raw.notes.filter((note: unknown): note is string => typeof note === 'string') : [],
  }
}

function normalizeItem(segment: string, fallbackType?: ComplexPackagingProductType, title?: string): ComplexPackagingItem | null {
  const typeInfo = fallbackType ? { productType: fallbackType, title: normalizeTitle(title, fallbackType) } : detectItemType(segment)
  if (!typeInfo) {
    return null
  }

  const item: ComplexPackagingItem = {
    productType: typeInfo.productType,
    title: normalizeTitle(title || typeInfo.title, typeInfo.productType),
    quantity: extractQuantity(segment),
    material: extractMaterial(segment),
    weight: extractWeight(segment),
    printColor: extractPrintColor(segment),
    surfaceFinish: extractSurfaceFinish(segment),
    processes: undefined,
    notes: undefined,
  }

  const processes = extractProcesses(segment)
  if (processes.length > 0) {
    item.processes = processes
  }

  const pantoneCodes = extractPantoneCodes(segment)
  if (pantoneCodes.length > 0) {
    item.pantoneCodes = pantoneCodes
  }

  const spotColorCount = extractSpotColorCount(segment)
  if (spotColorCount > 0) {
    item.spotColorCount = spotColorCount
  }

  if (segment.includes('a/e加强芯') || segment.includes('A/E加强芯')) {
    item.notes = ['A/E加强芯']
  }

  if (item.productType === 'mailer_box' || item.productType === 'tuck_end_box' || item.productType === 'window_box') {
    const dimensions = extractThreeDimensions(segment)
    if (dimensions) {
      item.length = dimensions.length
      item.width = dimensions.width
      item.height = dimensions.height
      item.sizeUnit = dimensions.unit
    }

    item.boxStyle = item.productType
    if (segment.includes('裱')) item.mounting = true
    if (segment.includes('啤')) item.dieCut = true
    if (segment.includes('粘')) item.gluing = true
    if (segment.includes('哑胶') || segment.includes('哑膜')) item.laminationType = 'matte'
    if (segment.includes('光胶') || segment.includes('光膜')) item.laminationType = 'glossy'
  }

  if (item.productType === 'window_box') {
    item.hasWindow = true
    item.windowFilmThickness = extractWindowFilmThickness(segment)
    const windowSize = extractWindowSize(segment)
    if (windowSize) {
      item.windowSizeLength = windowSize.length
      item.windowSizeWidth = windowSize.width
    }
  }

  if (item.productType === 'leaflet_insert') {
    const dimensions = extractTwoDimensions(segment)
    if (dimensions) {
      item.length = dimensions.length
      item.width = dimensions.width
      item.sizeUnit = dimensions.unit
    }

    item.paperType = item.material
    item.paperWeight = item.weight
    item.printSides = segment.includes('双面') ? 'double' : segment.includes('单面') ? 'single' : undefined
    item.foldCount = extractFoldCount(segment)
    item.foldType = item.foldCount && item.foldCount >= 3 ? 'tri_fold' : item.foldCount === 2 ? 'bi_fold' : undefined
  }

  if (item.productType === 'box_insert') {
    const dimensions = extractTwoDimensions(segment)
    if (dimensions) {
      item.insertLength = dimensions.length
      item.insertWidth = dimensions.width
      item.sizeUnit = dimensions.unit
    }
    item.insertType = 'paper_board'
    item.insertMaterial = item.material
  }

  if (item.productType === 'seal_sticker') {
    const dimensions = extractTwoDimensions(segment)
    if (dimensions) {
      item.stickerLength = dimensions.length
      item.stickerWidth = dimensions.width
      item.sizeUnit = dimensions.unit
    }
    item.stickerType = 'seal_sticker'
    item.stickerMaterial = item.material
  }

  return item
}

export function extractComplexPackagingQuoteRequest(message: string): ComplexPackagingRequest | null {
  const text = message.trim()
  const lowered = toLowerText(text)
  const segments = extractSegments(text)

  if (segments.length === 0) {
    const detected = detectItemType(lowered)
    if (!detected) {
      return null
    }

    const singleItem = normalizeItem(text, detected.productType, detected.title)
    if (!singleItem) {
      return null
    }

    const references = buildReferenceFiles(lowered)
    const requiresHumanReview = references.hasReferenceFile || HUMAN_REVIEW_KEYWORDS.some((keyword) => lowered.includes(keyword))
    return {
      isBundle: false,
      mainItem: singleItem,
      subItems: [],
      allItems: [singleItem],
      hasReferenceFile: references.hasReferenceFile,
      referenceFileCategory: references.referenceFileCategory,
      referenceFiles: references.referenceFiles,
      requiresHumanReview,
      notes: requiresHumanReview ? ['复杂结构或文件参考存在，建议人工复核。'] : [],
    }
  }

  const items = segments
    .map(({ segment, productType, rawTitle }) => normalizeItem(segment, productType, rawTitle))
    .filter((item): item is ComplexPackagingItem => Boolean(item))

  if (items.length === 0) {
    return null
  }

  const references = buildReferenceFiles(lowered)
  const requiresHumanReview = references.hasReferenceFile
    || HUMAN_REVIEW_KEYWORDS.some((keyword) => lowered.includes(keyword))
    || items.length > 1

  return {
    isBundle: items.length > 1,
    mainItem: items[0],
    subItems: items.slice(1),
    allItems: items,
    hasReferenceFile: references.hasReferenceFile,
    referenceFileCategory: references.referenceFileCategory,
    referenceFiles: references.referenceFiles,
    requiresHumanReview,
    notes: requiresHumanReview ? ['组合件或文件参考存在，结果默认为预报价并建议人工复核。'] : [],
  }
}

export function getLatestComplexPackagingState(
  conversation?: ComplexPackagingConversationSnapshot | null,
): ComplexPackagingRequest | null {
  if (!conversation) {
    return null
  }

  const assistantMessages = [...(conversation.messages || [])]
    .reverse()
    .filter((message) => message.sender === 'ASSISTANT' && message.metadata && typeof message.metadata === 'object')

  for (const message of assistantMessages) {
    const metadata = message.metadata as Record<string, any>
    const candidate = metadata.complexPackagingState
      || metadata.complexPackagingRequest
      || (
        metadata.quoteParams?.mainItem || metadata.estimatedData?.mainItem
          ? {
              mainItem: metadata.quoteParams?.mainItem || metadata.estimatedData?.mainItem?.normalizedParams,
              subItems: metadata.quoteParams?.subItems || metadata.estimatedData?.subItems?.map((item: any) => item.normalizedParams),
              hasReferenceFile: Boolean(metadata.referenceFiles?.length),
              referenceFiles: metadata.referenceFiles || metadata.estimatedData?.referenceFiles || [],
              requiresHumanReview: metadata.requiresHumanReview,
            }
          : null
      )

    const request = coerceRequest(candidate)
    if (request) {
      return request
    }
  }

  const latestQuote = conversation.quotes?.find((quote) => Boolean(quote?.parameters))
  const quoteParams = latestQuote?.parameters as Record<string, any> | undefined
  if (!quoteParams) {
    return null
  }

  return coerceRequest({
    mainItem: quoteParams.mainItem,
    subItems: quoteParams.subItems,
    hasReferenceFile: Boolean(Array.isArray(quoteParams.referenceFiles) && quoteParams.referenceFiles.length > 0),
    referenceFiles: Array.isArray(quoteParams.referenceFiles) ? quoteParams.referenceFiles : [],
    requiresHumanReview: Boolean(quoteParams.requiresHumanReview),
  })
}

export function resolveComplexPackagingConversationTurn(
  message: string,
  previousState?: ComplexPackagingRequest | null,
): ComplexPackagingTurnResolution {
  const currentRequest = extractComplexPackagingQuoteRequest(message)

  if (!previousState) {
    return buildTurnResolution(currentRequest, currentRequest ? 'new_request' : null, currentRequest?.mainItem)
  }

  const text = toLowerText(message)
  const referenceContinuation = hasReferenceContinuationIntent(text)
  const addItemIntent = hasAddItemIntent(text)
  const removeItemIntent = hasRemoveItemIntent(text)
  const updateItemIntent = hasUpdateItemIntent(text)
  const mentionedItemType = resolveMentionedItemType(text)

  if (referenceContinuation && !currentRequest) {
    return buildTurnResolution(cloneRequest(previousState), 'view_existing_quote', previousState.mainItem)
  }

  if (removeItemIntent) {
    const removalItemType = inferRemovalItemType(text, previousState)
    const itemIndex = removalItemType ? findItemIndex(previousState, removalItemType) : -1
    if (itemIndex >= 0) {
      return buildTurnResolution(
        removeItemFromRequest(previousState, itemIndex, message),
        'remove_sub_item',
        previousState.allItems[itemIndex],
      )
    }
  }

  if (addItemIntent) {
    const itemsToAdd = (currentRequest?.allItems || [])
      .map((item) => normalizeAddedItem(item, previousState))

    if (itemsToAdd.length > 0) {
      return buildTurnResolution(
        buildRequestFromItems([
          ...previousState.allItems.map((item) => cloneItem(item)),
          ...itemsToAdd,
        ], message, previousState),
        'add_sub_item',
        itemsToAdd[0],
      )
    }
  }

  if (currentRequest?.isBundle) {
    return buildTurnResolution(currentRequest, 'new_request', currentRequest.mainItem)
  }

  if (mentionedItemType) {
    const itemIndex = findItemIndex(previousState, mentionedItemType)
    const patch = buildItemPatch(message, mentionedItemType) || currentRequest?.mainItem || null
    if (itemIndex >= 0 && patch) {
      const items = previousState.allItems.map((item) => cloneItem(item))
      items[itemIndex] = mergeComplexPackagingItem(items[itemIndex], patch)
      return buildTurnResolution(
        buildRequestFromItems(items, message, previousState),
        classifyPatchAction(previousState, itemIndex),
        items[itemIndex],
      )
    }
  }

  if (currentRequest) {
    if (currentRequest.mainItem.productType === previousState.mainItem.productType) {
      const items = previousState.allItems.map((item) => cloneItem(item))
      items[0] = mergeComplexPackagingItem(items[0], currentRequest.mainItem)
      return buildTurnResolution(
        buildRequestFromItems(items, message, previousState),
        classifyPatchAction(previousState, 0),
        items[0],
      )
    }

    const existingItemIndex = findItemIndex(previousState, currentRequest.mainItem.productType)
    if (existingItemIndex >= 0 && (updateItemIntent || previousState.isBundle)) {
      const items = previousState.allItems.map((item) => cloneItem(item))
      items[existingItemIndex] = mergeComplexPackagingItem(items[existingItemIndex], currentRequest.mainItem)
      return buildTurnResolution(
        buildRequestFromItems(items, message, previousState),
        classifyPatchAction(previousState, existingItemIndex),
        items[existingItemIndex],
      )
    }

    return buildTurnResolution(currentRequest, 'new_request', currentRequest.mainItem)
  }

  const fallbackTargetType = mentionedItemType || previousState.mainItem.productType
  const fallbackItemIndex = findItemIndex(previousState, fallbackTargetType)
  if (fallbackItemIndex >= 0) {
    const patch = buildItemPatch(message, fallbackTargetType)
    if (patch && (updateItemIntent || hasMeaningfulItemFields(patch))) {
      const items = previousState.allItems.map((item) => cloneItem(item))
      items[fallbackItemIndex] = mergeComplexPackagingItem(items[fallbackItemIndex], patch)
      return buildTurnResolution(
        buildRequestFromItems(items, message, previousState),
        classifyPatchAction(previousState, fallbackItemIndex),
        items[fallbackItemIndex],
      )
    }
  }

  if (referenceContinuation) {
    return buildTurnResolution(cloneRequest(previousState), 'view_existing_quote', previousState.mainItem)
  }

  return buildTurnResolution(null, null, null)
}

function collectMissingFields(item: ComplexPackagingItem): string[] {
  const requiredFields = getRequiredFieldsForPackagingItem(item)
  return requiredFields.filter((field) => {
    const value = (item as Record<string, unknown>)[field]
    if (value === undefined || value === null) return true
    if (typeof value === 'string' && value.trim() === '') return true
    return false
  })
}

function getRequiredFieldsForPackagingItem(item: ComplexPackagingItem): string[] {
  switch (item.productType) {
    case 'window_box':
      return ['quantity', 'material', 'weight', 'printColor', 'length', 'width', 'height', 'windowFilmThickness', 'windowSizeLength', 'windowSizeWidth']
    case 'mailer_box':
    case 'tuck_end_box':
      return ['quantity', 'material', 'weight', 'printColor', 'length', 'width', 'height']
    case 'leaflet_insert':
      return ['quantity', 'length', 'width', 'paperType', 'paperWeight', 'printColor']
    case 'box_insert':
      return ['quantity', 'insertMaterial', 'insertLength', 'insertWidth']
    case 'seal_sticker':
      return ['quantity', 'stickerMaterial', 'stickerLength', 'stickerWidth']
    default:
      return []
  }
}

function flattenMissingDetails(details: ComplexPackagingMissingDetail[]): string[] {
  return details.flatMap((detail) =>
    detail.fields.map((field) => `${detail.itemLabel}${getFieldLabel(detail.productType, field)}`)
  )
}

function isAllowedEstimatedSet(item: ComplexPackagingItem, missingFields: string[]): boolean {
  if (!isEstimatedAllowed(item.productType)) {
    return false
  }

  const allowedSets = getEstimatedAllowedMissingSets(item.productType)
  return allowedSets.some((expected) =>
    missingFields.length === expected.length && expected.every((field) => missingFields.includes(field))
  )
}

export function decideComplexPackagingQuotePath(request: ComplexPackagingRequest): ComplexPackagingDecision {
  const pricingReview = assessComplexPackagingPricingReview(request)
  const missingDetails: ComplexPackagingMissingDetail[] = request.allItems
    .map((item, itemIndex) => ({
      itemIndex,
      itemLabel: normalizeTitle(item.title, item.productType),
      productType: item.productType,
      fields: collectMissingFields(item),
    }))
    .filter((detail) => detail.fields.length > 0)

  const missingFields = flattenMissingDetails(missingDetails)

  if (request.hasReferenceFile && missingDetails.length > 0) {
    return {
      status: 'handoff_required',
      reason: 'reference_file_with_missing_fields',
      missingDetails,
      missingFields,
    }
  }

  if (missingDetails.length === 0) {
    if (request.isBundle || request.requiresHumanReview || pricingReview.requiresHumanReview) {
      return {
        status: 'estimated',
        reason: request.isBundle
          ? 'bundle_prequote'
          : request.requiresHumanReview
            ? 'requires_human_review'
            : 'pricing_uncertainty_requires_review',
        missingDetails,
        missingFields,
      }
    }

    return {
      status: 'quoted',
      reason: 'all_packaging_fields_present',
      missingDetails,
      missingFields,
    }
  }

  if (missingDetails.length === 1) {
    const detail = missingDetails[0]
    const item = request.allItems[detail.itemIndex]

    if (item && isAllowedEstimatedSet(item, detail.fields)) {
      return {
        status: 'estimated',
        reason: 'allowed_packaging_estimated_missing_set',
        missingDetails,
        missingFields,
      }
    }
  }

  if (request.isBundle && missingDetails.length > 0) {
    return {
      status: 'missing_fields',
      reason: 'bundle_item_fields_missing',
      missingDetails,
      missingFields,
    }
  }

  return {
    status: 'missing_fields',
    reason: 'packaging_required_fields_missing',
    missingDetails,
    missingFields,
  }
}

export function formatComplexPackagingMissingReply(details: ComplexPackagingMissingDetail[]): string {
  if (details.length === 0) {
    return '这边看下来，当前一期复杂包装信息已经够了，可以继续往预报价走。'
  }

  const parts = details.map((detail) => {
    const fieldText = detail.fields.map((field) => getFieldLabel(detail.productType, field)).join('、')
    return `${detail.itemLabel}还缺：${fieldText}`
  })

  return `这边先帮您对了一下，想继续往下预估，还差这些信息：${parts.join('；')}。您直接把缺的参数补给我就行；如果有些数值还没定，也可以先告诉我用途或大概范围，我先按常见做法帮您估一版。`
}