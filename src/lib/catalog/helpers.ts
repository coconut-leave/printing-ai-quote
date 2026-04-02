import {
  FIELD_LABELS,
  FIELD_REPLY_EXAMPLES,
  getProductSchema,
  normalizeProductType,
  ProductType,
} from './productSchemas'

export function getCatalogProductType(value?: string): ProductType {
  return normalizeProductType(value)
}

export function getFieldLabel(productType: string | undefined, field: string): string {
  const schema = getProductSchema(productType)
  return schema.fieldLabels[field] || FIELD_LABELS[field] || field
}

export function getFieldDisplayOrder(productType?: string): string[] {
  const schema = getProductSchema(productType)
  return schema.fieldDisplayOrder
}

export function getRequiredFields(productType?: string): string[] {
  return getProductSchema(productType).requiredFields
}

export function getMissingFieldsChineseText(productType: string | undefined, missingFields: string[]): string {
  return missingFields.map((f) => getFieldLabel(productType, f)).join('、')
}

export function getEstimatedDefaults(productType?: string): Record<string, any> {
  return getProductSchema(productType).estimatedDefaults
}

export function getEstimatedAllowedMissingSets(productType?: string): string[][] {
  return getProductSchema(productType).estimated.allowedMissingFieldSets
}

export function isEstimatedAllowed(productType?: string): boolean {
  return getProductSchema(productType).estimated.allow
}

export function getProductUnit(productType?: string): string {
  return getProductSchema(productType).defaultUnit
}

export function getReplyExample(field: string): string | undefined {
  return FIELD_REPLY_EXAMPLES[field]
}

export function formatParamsByProduct(productType: string | undefined, params: Record<string, any>): string {
  const order = getFieldDisplayOrder(productType)
  const keySet = new Set(order)
  const orderedPairs: Array<[string, any]> = []

  order.forEach((key) => {
    const value = params[key]
    if (value !== null && value !== undefined && value !== '') {
      orderedPairs.push([key, value])
    }
  })

  Object.entries(params).forEach(([key, value]) => {
    if (!keySet.has(key) && value !== null && value !== undefined && value !== '') {
      orderedPairs.push([key, value])
    }
  })

  return orderedPairs
    .map(([key, value]) => `${getFieldLabel(productType, key)}: ${value}`)
    .join('，')
}

function formatEnumValue(field: string, value: string): string {
  const valueMap: Record<string, Record<string, string>> = {
    productType: {
      album: '画册',
      flyer: '传单',
      business_card: '名片',
      poster: '海报',
    },
    coverPaper: {
      coated: '铜版纸',
      matte: '哑粉纸',
      art: '艺术纸',
      standard: '标准纸',
    },
    innerPaper: {
      coated: '铜版纸',
      matte: '哑粉纸',
      art: '艺术纸',
      standard: '标准纸',
    },
    paperType: {
      coated: '铜版纸',
      matte: '哑粉纸',
      art: '艺术纸',
      standard: '标准纸',
    },
    bindingType: {
      saddle_stitch: '骑马钉',
      perfect_bind: '胶装',
      perfect_binding: '胶装',
    },
    printSides: {
      single: '单面',
      double: '双面',
    },
    finishType: {
      none: '无工艺',
      glossy: '光膜',
      matte: '哑膜',
      uv: 'UV上光',
      embossed: '击凸',
    },
    lamination: {
      none: '不覆膜',
      glossy: '光膜',
      matte: '哑膜',
    },
  }

  return valueMap[field]?.[value] || value
}

export function formatParamValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === '') {
    return ''
  }

  if (typeof value === 'string') {
    return formatEnumValue(field, value)
  }

  return String(value)
}

export function getDisplayParamEntries(productType: string | undefined, params: Record<string, any>): Array<{ field: string; label: string; value: string }> {
  const order = getFieldDisplayOrder(productType)
  const keySet = new Set(order)
  const orderedPairs: Array<[string, any]> = []

  order.forEach((key) => {
    const value = params[key]
    if (value !== null && value !== undefined && value !== '') {
      orderedPairs.push([key, value])
    }
  })

  Object.entries(params).forEach(([key, value]) => {
    if (!keySet.has(key) && value !== null && value !== undefined && value !== '') {
      orderedPairs.push([key, value])
    }
  })

  return orderedPairs.map(([field, value]) => ({
    field,
    label: getFieldLabel(productType, field),
    value: formatParamValue(field, value),
  }))
}
