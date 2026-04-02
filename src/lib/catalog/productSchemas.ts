export type ProductType = 'album' | 'flyer' | 'business_card' | 'poster'

export const FIELD_LABELS: Record<string, string> = {
  productType: '产品类型',
  finishedSize: '成品尺寸',
  quantity: '数量',
  coverPaper: '封面纸张',
  coverWeight: '封面克重',
  innerPaper: '内页纸张',
  innerWeight: '内页克重',
  bindingType: '装订方式',
  pageCount: '页数',
  paperType: '纸张类型',
  paperWeight: '纸张克重',
  printSides: '单双面',
  finishType: '表面工艺',
  lamination: '覆膜工艺',
}

export const FIELD_REPLY_EXAMPLES: Record<string, string> = {
  pageCount: '页数 32 页',
  innerWeight: '内页克重 157g',
  printSides: '双面印刷',
  paperWeight: '纸张克重 300g',
  paperType: '纸张类型 铜版纸',
  coverWeight: '封面克重 200g',
  coverPaper: '封面纸张 铜版纸',
  innerPaper: '内页纸张 铜版纸',
  bindingType: '装订方式 骑马钉',
  finishedSize: '成品尺寸 A4',
  quantity: '数量 1000',
  lamination: '覆膜工艺 哑膜',
}

type ProductSchema = {
  productType: ProductType
  nameZh: string
  defaultUnit: string
  supportedFields: string[]
  fieldDisplayOrder: string[]
  requiredFields: string[]
  optionalFields: string[]
  fieldLabels: Record<string, string>
  fieldReplyExamples: Record<string, string>
  estimatedDefaults: Record<string, any>
  estimated: {
    allow: boolean
    allowedMissingFieldSets: string[][]
  }
  statusHints?: {
    estimated?: string
    missingFields?: string
  }
}

const ALBUM_FIELDS = [
  'productType',
  'finishedSize',
  'quantity',
  'coverPaper',
  'coverWeight',
  'innerPaper',
  'innerWeight',
  'bindingType',
  'pageCount',
]

const FLYER_FIELDS = [
  'productType',
  'finishedSize',
  'quantity',
  'paperType',
  'paperWeight',
  'printSides',
]

const BUSINESS_CARD_FIELDS = [
  'productType',
  'finishedSize',
  'quantity',
  'paperType',
  'paperWeight',
  'printSides',
]

const POSTER_FIELDS = [
  'productType',
  'finishedSize',
  'quantity',
  'paperType',
  'paperWeight',
  'lamination',
]

const COMMON_OPTIONAL_FIELDS = ['taxRate', 'shippingRegion']

export const PRODUCT_SCHEMAS: Record<ProductType, ProductSchema> = {
  album: {
    productType: 'album',
    nameZh: '画册',
    defaultUnit: '本',
    supportedFields: [...ALBUM_FIELDS, ...COMMON_OPTIONAL_FIELDS],
    fieldDisplayOrder: ALBUM_FIELDS,
    requiredFields: ALBUM_FIELDS,
    optionalFields: COMMON_OPTIONAL_FIELDS,
    fieldLabels: Object.fromEntries(ALBUM_FIELDS.map((f) => [f, FIELD_LABELS[f] || f])),
    fieldReplyExamples: Object.fromEntries(
      Object.entries(FIELD_REPLY_EXAMPLES).filter(([k]) => [...ALBUM_FIELDS, ...COMMON_OPTIONAL_FIELDS].includes(k))
    ),
    estimatedDefaults: {
      pageCount: { minimal: 24, common: 32 },
      innerWeight: { light: 128, common: 157 },
    },
    estimated: {
      allow: true,
      allowedMissingFieldSets: [['pageCount'], ['innerWeight']],
    },
    statusHints: {
      estimated: '当前为参考报价，补齐参数后可生成更准确报价。',
    },
  },
  flyer: {
    productType: 'flyer',
    nameZh: '传单',
    defaultUnit: '份',
    supportedFields: [...FLYER_FIELDS, ...COMMON_OPTIONAL_FIELDS],
    fieldDisplayOrder: FLYER_FIELDS,
    requiredFields: FLYER_FIELDS,
    optionalFields: COMMON_OPTIONAL_FIELDS,
    fieldLabels: Object.fromEntries(FLYER_FIELDS.map((f) => [f, FIELD_LABELS[f] || f])),
    fieldReplyExamples: Object.fromEntries(
      Object.entries(FIELD_REPLY_EXAMPLES).filter(([k]) => [...FLYER_FIELDS, ...COMMON_OPTIONAL_FIELDS].includes(k))
    ),
    estimatedDefaults: {
      printSides: { lowQuantity: 'single', common: 'double' },
    },
    estimated: {
      allow: true,
      allowedMissingFieldSets: [['printSides']],
    },
    statusHints: {
      estimated: '单双面未确认，已按常见印刷方式提供参考价。',
    },
  },
  business_card: {
    productType: 'business_card',
    nameZh: '名片',
    defaultUnit: '张',
    supportedFields: [...BUSINESS_CARD_FIELDS, 'finishType', ...COMMON_OPTIONAL_FIELDS],
    fieldDisplayOrder: [...BUSINESS_CARD_FIELDS, 'finishType'],
    requiredFields: BUSINESS_CARD_FIELDS,
    optionalFields: ['finishType', 'taxRate', 'shippingRegion'],
    fieldLabels: Object.fromEntries(BUSINESS_CARD_FIELDS.map((f) => [f, FIELD_LABELS[f] || f])),
    fieldReplyExamples: Object.fromEntries(
      Object.entries(FIELD_REPLY_EXAMPLES).filter(([k]) => [...BUSINESS_CARD_FIELDS, 'finishType', ...COMMON_OPTIONAL_FIELDS].includes(k))
    ),
    estimatedDefaults: {
      paperWeight: { standard: 250, common: 300, premium: 350 },
      paperType: 'coated',
    },
    estimated: {
      allow: true,
      allowedMissingFieldSets: [['paperWeight'], ['paperType'], ['paperType', 'paperWeight']],
    },
    statusHints: {
      estimated: '材质或克重未确认，已按常见名片规格估算。',
    },
  },
  poster: {
    productType: 'poster',
    nameZh: '海报',
    defaultUnit: '张',
    supportedFields: [...POSTER_FIELDS, ...COMMON_OPTIONAL_FIELDS],
    fieldDisplayOrder: POSTER_FIELDS,
    requiredFields: ['productType', 'finishedSize', 'quantity', 'paperType', 'paperWeight'],
    optionalFields: ['lamination', ...COMMON_OPTIONAL_FIELDS],
    fieldLabels: Object.fromEntries(POSTER_FIELDS.map((f) => [f, FIELD_LABELS[f] || f])),
    fieldReplyExamples: Object.fromEntries(
      Object.entries(FIELD_REPLY_EXAMPLES).filter(([k]) => [...POSTER_FIELDS, ...COMMON_OPTIONAL_FIELDS].includes(k))
    ),
    estimatedDefaults: {
      paperWeight: 157,
      lamination: 'none',
    },
    estimated: {
      allow: true,
      allowedMissingFieldSets: [['paperWeight']],
    },
    statusHints: {
      estimated: '海报克重未确认，已按常见 157g 提供参考价。',
      missingFields: '海报标准报价需提供尺寸、数量、纸张类型和克重。',
    },
  },
}

export function normalizeProductType(value?: string): ProductType {
  if (value === 'flyer' || value === 'business_card' || value === 'poster' || value === 'album') {
    return value
  }
  return 'album'
}

export function getProductSchema(value?: string): ProductSchema {
  const productType = normalizeProductType(value)
  return PRODUCT_SCHEMAS[productType]
}

export function toChineseFieldList(fields: string[]): string {
  return fields.map((f) => FIELD_LABELS[f] || f).join('、')
}
