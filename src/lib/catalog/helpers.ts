import {
  COMPLEX_PACKAGING_PRODUCT_TYPES,
  FIELD_LABELS,
  FIELD_REPLY_EXAMPLES,
  getProductSchema,
  isComplexPackagingProductType,
  normalizeProductType,
  ProductType,
  SIMPLE_PRODUCT_TYPES,
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
      mailer_box: '飞机盒',
      tuck_end_box: '双插盒',
      window_box: '开窗彩盒',
      leaflet_insert: '说明书',
      box_insert: '内托',
      seal_sticker: '封口贴',
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
      kraft: '牛皮纸',
      white_card: '白卡纸',
      single_coated: '单铜纸',
      double_coated: '双铜纸',
      specialty_board: '特种纸板',
      clear_sticker: '透明贴纸',
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
    printColor: {
      black: '印黑色',
      four_color: '四色',
      double_four_color: '正反四色',
      double_four_color_print: '双面四色印',
      four_color_spot: '四色 + 专色',
      spot: '专色',
    },
    surfaceFinish: {
      none: '无表面处理',
      matte_lamination: '过哑胶',
      glossy_lamination: '过光胶',
      uv: 'UV',
    },
    laminationType: {
      none: '无过胶',
      matte: '哑胶',
      glossy: '光胶',
    },
    foldType: {
      tri_fold: '三折',
      bi_fold: '二折',
      z_fold: 'Z 折',
      none: '不折',
    },
    referenceFileCategory: {
      knowledge_reference: '知识参考 PDF',
      design_file: '设计文件样例',
      dieline_pdf: '刀模 PDF 样例',
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

  if (typeof value === 'boolean') {
    return value ? '是' : '否'
  }

  if (Array.isArray(value)) {
    return value.map((item) => formatParamValue(field, item)).join('、')
  }

  return String(value)
}

export function getAllSupportedProductTypes(): ProductType[] {
  return [...SIMPLE_PRODUCT_TYPES, ...COMPLEX_PACKAGING_PRODUCT_TYPES]
}

export function isSimpleProductType(value?: string): value is ProductType {
  return SIMPLE_PRODUCT_TYPES.includes(value as ProductType)
}

export function isPackagingProductType(value?: string): value is ProductType {
  return isComplexPackagingProductType(value)
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
