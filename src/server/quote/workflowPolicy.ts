import {
  getEstimatedAllowedMissingSets,
  getRequiredFields,
  isEstimatedAllowed,
} from '@/lib/catalog/helpers'
import {
  ACTIVE_AUTO_QUOTE_PRODUCT_TYPES,
  COMPLEX_PACKAGING_PRODUCT_TYPES,
  normalizeProductType,
  ProductType,
  SIMPLE_PRODUCT_TYPES,
} from '@/lib/catalog/productSchemas'
import { hasStrongFileReviewSignal } from '@/server/intent/detectIntent'

export type QuotePathStatus = 'quoted' | 'estimated' | 'handoff_required' | 'missing_fields'

export type WorkflowDecision = {
  status: QuotePathStatus
  reason: string
}

const OUT_OF_SCOPE_KEYWORDS = [
  '礼盒', '天地盖', '异形盒', '吸塑',
  '塑料', '金属', '木盒', '布料', '皮革', '亚克力',
]

const SUPPORTED_COMPLEX_PACKAGING_KEYWORDS = [
  '飞机盒',
  '双插盒',
  '开窗彩盒',
  '说明书',
  '内托',
  '封口贴',
  '透明贴纸',
  '包装盒',
  '彩盒',
]

function matchMissing(missingFields: string[], expected: string[]): boolean {
  return missingFields.length === expected.length && expected.every((f) => missingFields.includes(f))
}

export function isFileBasedInquiry(message: string): boolean {
  return hasStrongFileReviewSignal(message)
}

export function isOutOfScopeInquiry(message: string): boolean {
  const lower = message.toLowerCase()
  if (SUPPORTED_COMPLEX_PACKAGING_KEYWORDS.some((keyword) => lower.includes(keyword))) {
    return false
  }
  return OUT_OF_SCOPE_KEYWORDS.some((keyword) => lower.includes(keyword))
}

export function isMissingSetAllowed(productType: string, missingFields: string[]): boolean {
  const sets = getEstimatedAllowedMissingSets(productType)
  return sets.some((expected) => matchMissing(missingFields, expected))
}

export function decideQuotePath(input: {
  message: string
  productType?: string
  missingFields: string[]
}): WorkflowDecision {
  if (isFileBasedInquiry(input.message)) {
    return { status: 'handoff_required', reason: 'file_based_inquiry' }
  }

  if (isOutOfScopeInquiry(input.message)) {
    return { status: 'handoff_required', reason: 'out_of_scope_inquiry' }
  }

  if (input.productType && SIMPLE_PRODUCT_TYPES.includes(input.productType as ProductType)) {
    return { status: 'handoff_required', reason: 'simple_product_auto_quote_deactivated' }
  }

  if (!input.productType) {
    return { status: 'missing_fields', reason: 'product_type_missing' }
  }

  const productType = normalizeProductType(input.productType)

  if (input.missingFields.length === 0) {
    return { status: 'quoted', reason: 'all_required_fields_present' }
  }

  if (isEstimatedAllowed(productType) && isMissingSetAllowed(productType, input.missingFields)) {
    return { status: 'estimated', reason: 'allowed_estimated_missing_set' }
  }

  return { status: 'missing_fields', reason: 'required_fields_missing' }
}

export function getWorkflowRulesSnapshot(): Array<{
  productType: ProductType
  requiredFields: string[]
  estimatedAllowedMissingFieldSets: string[][]
}> {
  const productTypes: ProductType[] = [...ACTIVE_AUTO_QUOTE_PRODUCT_TYPES]
  return productTypes.map((productType) => ({
    productType,
    requiredFields: getRequiredFields(productType),
    estimatedAllowedMissingFieldSets: getEstimatedAllowedMissingSets(productType),
  }))
}
