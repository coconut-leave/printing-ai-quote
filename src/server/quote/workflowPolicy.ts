import {
  getEstimatedAllowedMissingSets,
  getRequiredFields,
  isEstimatedAllowed,
} from '@/lib/catalog/helpers'
import { normalizeProductType, ProductType } from '@/lib/catalog/productSchemas'

export type QuotePathStatus = 'quoted' | 'estimated' | 'handoff_required' | 'missing_fields'

export type WorkflowDecision = {
  status: QuotePathStatus
  reason: string
}

const FILE_BASED_KEYWORDS = [
  'pdf', 'ai', 'cdr', 'psd', 'zip',
  '附件', '设计稿', '文件发你了', '按文件报价', '审稿',
]

// MVP outside standard categories or complex packaging/material requests.
const OUT_OF_SCOPE_KEYWORDS = [
  '礼盒', '包装盒', '天地盖', '异形盒', '吸塑',
  '塑料', '金属', '木盒', '布料', '皮革', '亚克力',
]

function matchMissing(missingFields: string[], expected: string[]): boolean {
  return missingFields.length === expected.length && expected.every((f) => missingFields.includes(f))
}

export function isFileBasedInquiry(message: string): boolean {
  const lower = message.toLowerCase()
  return FILE_BASED_KEYWORDS.some((keyword) => lower.includes(keyword))
}

export function isOutOfScopeInquiry(message: string): boolean {
  const lower = message.toLowerCase()
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
  const productTypes: ProductType[] = ['album', 'flyer', 'business_card', 'poster']
  return productTypes.map((productType) => ({
    productType,
    requiredFields: getRequiredFields(productType),
    estimatedAllowedMissingFieldSets: getEstimatedAllowedMissingSets(productType),
  }))
}
