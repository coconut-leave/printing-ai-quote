export type ProductType =
  | 'album'
  | 'flyer'
  | 'business_card'
  | 'poster'
  | 'mailer_box'
  | 'tuck_end_box'
  | 'window_box'
  | 'leaflet_insert'
  | 'box_insert'
  | 'seal_sticker'
  | 'foil_bag'
  | 'carton_packaging'

export const SIMPLE_PRODUCT_TYPES: ProductType[] = ['album', 'flyer', 'business_card', 'poster']

export const COMPLEX_PACKAGING_PRODUCT_TYPES: ProductType[] = [
  'mailer_box',
  'tuck_end_box',
  'window_box',
  'leaflet_insert',
  'box_insert',
  'seal_sticker',
  'foil_bag',
  'carton_packaging',
]

export const ACTIVE_AUTO_QUOTE_PRODUCT_TYPES: ProductType[] = [...COMPLEX_PACKAGING_PRODUCT_TYPES]

export function isComplexPackagingProductType(value?: string): value is ProductType {
  return COMPLEX_PACKAGING_PRODUCT_TYPES.includes(value as ProductType)
}

export function isActiveAutoQuoteProductType(value?: string): value is ProductType {
  return ACTIVE_AUTO_QUOTE_PRODUCT_TYPES.includes(value as ProductType)
}

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
  material: '材质',
  weight: '克重',
  printColor: '印色',
  surfaceFinish: '表面处理',
  processes: '工艺',
  notes: '备注',
  boxStyle: '盒型',
  length: '长',
  width: '宽',
  height: '高',
  sizeUnit: '尺寸单位',
  mounting: '裱',
  dieCut: '啤',
  gluing: '粘',
  laminationType: '过胶类型',
  spotColorCount: '专色数量',
  pantoneCodes: 'Pantone 色号',
  hasWindow: '是否开窗',
  windowFilmThickness: '胶片厚度',
  windowSizeLength: '窗长',
  windowSizeWidth: '窗宽',
  foldType: '折页方式',
  foldCount: '折数',
  insertType: '内托类型',
  insertMaterial: '内托材质',
  insertLength: '内托长',
  insertWidth: '内托宽',
  stickerType: '贴纸类型',
  stickerMaterial: '贴纸材质',
  stickerLength: '贴纸长',
  stickerWidth: '贴纸宽',
  hasReferenceFile: '参考文件',
  referenceFileCategory: '参考文件类别',
  requiresHumanReview: '人工复核',
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
  material: '材质 350克白卡',
  printColor: '印色 正反四色 + 专色',
  length: '长 365mm',
  width: '宽 270mm',
  height: '高 53mm',
  windowFilmThickness: '胶片厚度 0.2mm',
  windowSizeLength: '窗长 23.5cm',
  windowSizeWidth: '窗宽 14cm',
  foldCount: '折数 3折',
  insertLength: '内托长 20cm',
  stickerLength: '贴纸长 2.4cm',
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

const PACKAGING_COMMON_FIELDS = [
  'productType',
  'quantity',
  'material',
  'weight',
  'printColor',
  'surfaceFinish',
  'processes',
  'notes',
  'hasReferenceFile',
  'referenceFileCategory',
  'requiresHumanReview',
]

const BOX_FIELDS = [
  ...PACKAGING_COMMON_FIELDS,
  'boxStyle',
  'length',
  'width',
  'height',
  'sizeUnit',
  'mounting',
  'dieCut',
  'gluing',
  'laminationType',
  'spotColorCount',
  'pantoneCodes',
]

const WINDOW_BOX_FIELDS = [
  ...BOX_FIELDS,
  'hasWindow',
  'windowFilmThickness',
  'windowSizeLength',
  'windowSizeWidth',
]

const LEAFLET_FIELDS = [
  ...PACKAGING_COMMON_FIELDS,
  'length',
  'width',
  'sizeUnit',
  'paperType',
  'paperWeight',
  'printSides',
  'foldType',
  'foldCount',
]

const INSERT_FIELDS = [
  ...PACKAGING_COMMON_FIELDS,
  'insertType',
  'insertMaterial',
  'insertLength',
  'insertWidth',
  'sizeUnit',
]

const STICKER_FIELDS = [
  ...PACKAGING_COMMON_FIELDS,
  'stickerType',
  'stickerMaterial',
  'stickerLength',
  'stickerWidth',
  'sizeUnit',
]

const FOIL_BAG_FIELDS = [
  ...PACKAGING_COMMON_FIELDS,
  'length',
  'width',
  'sizeUnit',
]

const CARTON_PACKAGING_FIELDS = [
  ...PACKAGING_COMMON_FIELDS,
  'length',
  'width',
  'height',
  'sizeUnit',
]

const COMMON_OPTIONAL_FIELDS = ['taxRate', 'shippingRegion']

function buildFieldLabels(fields: string[]) {
  return Object.fromEntries(fields.map((field) => [field, FIELD_LABELS[field] || field]))
}

function buildFieldReplyExamples(fields: string[]) {
  return Object.fromEntries(
    Object.entries(FIELD_REPLY_EXAMPLES).filter(([key]) => fields.includes(key))
  )
}

export const PRODUCT_SCHEMAS: Record<ProductType, ProductSchema> = {
  album: {
    productType: 'album',
    nameZh: '画册',
    defaultUnit: '本',
    supportedFields: [...ALBUM_FIELDS, ...COMMON_OPTIONAL_FIELDS],
    fieldDisplayOrder: ALBUM_FIELDS,
    requiredFields: ALBUM_FIELDS,
    optionalFields: COMMON_OPTIONAL_FIELDS,
    fieldLabels: buildFieldLabels(ALBUM_FIELDS),
    fieldReplyExamples: buildFieldReplyExamples([...ALBUM_FIELDS, ...COMMON_OPTIONAL_FIELDS]),
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
    fieldLabels: buildFieldLabels(FLYER_FIELDS),
    fieldReplyExamples: buildFieldReplyExamples([...FLYER_FIELDS, ...COMMON_OPTIONAL_FIELDS]),
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
    fieldLabels: buildFieldLabels([...BUSINESS_CARD_FIELDS, 'finishType']),
    fieldReplyExamples: buildFieldReplyExamples([...BUSINESS_CARD_FIELDS, 'finishType', ...COMMON_OPTIONAL_FIELDS]),
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
    fieldLabels: buildFieldLabels(POSTER_FIELDS),
    fieldReplyExamples: buildFieldReplyExamples([...POSTER_FIELDS, ...COMMON_OPTIONAL_FIELDS]),
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
  mailer_box: {
    productType: 'mailer_box',
    nameZh: '飞机盒',
    defaultUnit: '个',
    supportedFields: [...BOX_FIELDS, ...COMMON_OPTIONAL_FIELDS],
    fieldDisplayOrder: BOX_FIELDS,
    requiredFields: ['productType', 'quantity', 'material', 'weight', 'printColor', 'length', 'width', 'height'],
    optionalFields: ['surfaceFinish', 'processes', 'notes', 'boxStyle', 'sizeUnit', 'mounting', 'dieCut', 'gluing', 'laminationType', 'spotColorCount', 'pantoneCodes', 'hasReferenceFile', 'referenceFileCategory', 'requiresHumanReview', ...COMMON_OPTIONAL_FIELDS],
    fieldLabels: buildFieldLabels(BOX_FIELDS),
    fieldReplyExamples: buildFieldReplyExamples([...BOX_FIELDS, ...COMMON_OPTIONAL_FIELDS]),
    estimatedDefaults: {
      processes: ['裱', '啤'],
    },
    estimated: {
      allow: true,
      allowedMissingFieldSets: [['surfaceFinish'], ['processes']],
    },
    statusHints: {
      estimated: '飞机盒一期可先生成结构化预报价，复杂结构仍建议人工复核。',
      missingFields: '飞机盒预报价建议至少提供长宽高、数量、材质、克重和印色。',
    },
  },
  tuck_end_box: {
    productType: 'tuck_end_box',
    nameZh: '双插盒',
    defaultUnit: '个',
    supportedFields: [...BOX_FIELDS, ...COMMON_OPTIONAL_FIELDS],
    fieldDisplayOrder: BOX_FIELDS,
    requiredFields: ['productType', 'quantity', 'material', 'weight', 'printColor', 'length', 'width', 'height'],
    optionalFields: ['surfaceFinish', 'processes', 'notes', 'boxStyle', 'sizeUnit', 'mounting', 'dieCut', 'gluing', 'laminationType', 'spotColorCount', 'pantoneCodes', 'hasReferenceFile', 'referenceFileCategory', 'requiresHumanReview', ...COMMON_OPTIONAL_FIELDS],
    fieldLabels: buildFieldLabels(BOX_FIELDS),
    fieldReplyExamples: buildFieldReplyExamples([...BOX_FIELDS, ...COMMON_OPTIONAL_FIELDS]),
    estimatedDefaults: {
      processes: ['啤', '粘'],
    },
    estimated: {
      allow: true,
      allowedMissingFieldSets: [['surfaceFinish'], ['processes']],
    },
    statusHints: {
      estimated: '双插盒一期可先按常见盒型工艺给出预报价。',
      missingFields: '双插盒预报价建议至少提供长宽高、数量、材质、克重和印色。',
    },
  },
  window_box: {
    productType: 'window_box',
    nameZh: '开窗彩盒',
    defaultUnit: '个',
    supportedFields: [...WINDOW_BOX_FIELDS, ...COMMON_OPTIONAL_FIELDS],
    fieldDisplayOrder: WINDOW_BOX_FIELDS,
    requiredFields: ['productType', 'quantity', 'material', 'weight', 'printColor', 'length', 'width', 'height', 'windowFilmThickness', 'windowSizeLength', 'windowSizeWidth'],
    optionalFields: ['surfaceFinish', 'processes', 'notes', 'boxStyle', 'sizeUnit', 'mounting', 'dieCut', 'gluing', 'laminationType', 'spotColorCount', 'pantoneCodes', 'hasWindow', 'hasReferenceFile', 'referenceFileCategory', 'requiresHumanReview', ...COMMON_OPTIONAL_FIELDS],
    fieldLabels: buildFieldLabels(WINDOW_BOX_FIELDS),
    fieldReplyExamples: buildFieldReplyExamples([...WINDOW_BOX_FIELDS, ...COMMON_OPTIONAL_FIELDS]),
    estimatedDefaults: {
      hasWindow: true,
    },
    estimated: {
      allow: true,
      allowedMissingFieldSets: [
        ['windowFilmThickness'],
        ['windowSizeLength', 'windowSizeWidth'],
        ['windowFilmThickness', 'windowSizeLength', 'windowSizeWidth'],
      ],
    },
    statusHints: {
      estimated: '开窗参数不完整时，一期先给结构化预报价并建议人工复核。',
      missingFields: '开窗彩盒除基础盒型参数外，建议补充胶片厚度和开窗尺寸。',
    },
  },
  leaflet_insert: {
    productType: 'leaflet_insert',
    nameZh: '说明书',
    defaultUnit: '张',
    supportedFields: [...LEAFLET_FIELDS, ...COMMON_OPTIONAL_FIELDS],
    fieldDisplayOrder: LEAFLET_FIELDS,
    requiredFields: ['productType', 'quantity', 'length', 'width', 'paperType', 'paperWeight', 'printColor'],
    optionalFields: ['material', 'weight', 'surfaceFinish', 'processes', 'notes', 'sizeUnit', 'printSides', 'foldType', 'foldCount', 'hasReferenceFile', 'referenceFileCategory', 'requiresHumanReview', ...COMMON_OPTIONAL_FIELDS],
    fieldLabels: buildFieldLabels(LEAFLET_FIELDS),
    fieldReplyExamples: buildFieldReplyExamples([...LEAFLET_FIELDS, ...COMMON_OPTIONAL_FIELDS]),
    estimatedDefaults: {
      printSides: 'double',
      foldCount: 0,
    },
    estimated: {
      allow: true,
      allowedMissingFieldSets: [['printSides'], ['foldType'], ['foldCount'], ['foldType', 'foldCount']],
    },
    statusHints: {
      estimated: '说明书折页方式未确认时，可先按常见方式给参考价。',
    },
  },
  box_insert: {
    productType: 'box_insert',
    nameZh: '内托',
    defaultUnit: '个',
    supportedFields: [...INSERT_FIELDS, ...COMMON_OPTIONAL_FIELDS],
    fieldDisplayOrder: INSERT_FIELDS,
    requiredFields: ['productType', 'quantity', 'insertMaterial', 'insertLength', 'insertWidth'],
    optionalFields: ['material', 'weight', 'printColor', 'surfaceFinish', 'processes', 'notes', 'insertType', 'sizeUnit', 'hasReferenceFile', 'referenceFileCategory', 'requiresHumanReview', ...COMMON_OPTIONAL_FIELDS],
    fieldLabels: buildFieldLabels(INSERT_FIELDS),
    fieldReplyExamples: buildFieldReplyExamples([...INSERT_FIELDS, ...COMMON_OPTIONAL_FIELDS]),
    estimatedDefaults: {
      insertType: 'paper_board',
    },
    estimated: {
      allow: true,
      allowedMissingFieldSets: [['insertType']],
    },
    statusHints: {
      estimated: '内托类型未确认时，已按常见纸板内托预估。',
    },
  },
  seal_sticker: {
    productType: 'seal_sticker',
    nameZh: '封口贴',
    defaultUnit: '张',
    supportedFields: [...STICKER_FIELDS, ...COMMON_OPTIONAL_FIELDS],
    fieldDisplayOrder: STICKER_FIELDS,
    requiredFields: ['productType', 'quantity', 'stickerMaterial', 'stickerLength', 'stickerWidth'],
    optionalFields: ['material', 'weight', 'printColor', 'surfaceFinish', 'processes', 'notes', 'stickerType', 'sizeUnit', 'hasReferenceFile', 'referenceFileCategory', 'requiresHumanReview', ...COMMON_OPTIONAL_FIELDS],
    fieldLabels: buildFieldLabels(STICKER_FIELDS),
    fieldReplyExamples: buildFieldReplyExamples([...STICKER_FIELDS, ...COMMON_OPTIONAL_FIELDS]),
    estimatedDefaults: {
      stickerType: 'seal_sticker',
    },
    estimated: {
      allow: true,
      allowedMissingFieldSets: [['printColor'], ['stickerType']],
    },
    statusHints: {
      estimated: '封口贴印色或类型未确认时，可先按常见透明封口贴估算。',
    },
  },
  foil_bag: {
    productType: 'foil_bag',
    nameZh: '铝箔袋',
    defaultUnit: '个',
    supportedFields: [...FOIL_BAG_FIELDS, ...COMMON_OPTIONAL_FIELDS],
    fieldDisplayOrder: FOIL_BAG_FIELDS,
    requiredFields: ['productType', 'quantity', 'length', 'width'],
    optionalFields: ['material', 'printColor', 'surfaceFinish', 'processes', 'notes', 'sizeUnit', 'hasReferenceFile', 'referenceFileCategory', 'requiresHumanReview', ...COMMON_OPTIONAL_FIELDS],
    fieldLabels: buildFieldLabels(FOIL_BAG_FIELDS),
    fieldReplyExamples: buildFieldReplyExamples([...FOIL_BAG_FIELDS, ...COMMON_OPTIONAL_FIELDS]),
    estimatedDefaults: {
      material: 'foil_bag',
      printColor: 'none',
    },
    estimated: {
      allow: true,
      allowedMissingFieldSets: [['material'], ['printColor'], ['material', 'printColor']],
    },
    statusHints: {
      estimated: '铝箔袋若仅拿到袋型尺寸或默认空白袋信息，可先按保守模板预估。',
    },
  },
  carton_packaging: {
    productType: 'carton_packaging',
    nameZh: '纸箱包装',
    defaultUnit: '套',
    supportedFields: [...CARTON_PACKAGING_FIELDS, ...COMMON_OPTIONAL_FIELDS],
    fieldDisplayOrder: CARTON_PACKAGING_FIELDS,
    requiredFields: ['productType', 'quantity', 'length', 'width', 'height'],
    optionalFields: ['material', 'printColor', 'surfaceFinish', 'processes', 'notes', 'sizeUnit', 'hasReferenceFile', 'referenceFileCategory', 'requiresHumanReview', ...COMMON_OPTIONAL_FIELDS],
    fieldLabels: buildFieldLabels(CARTON_PACKAGING_FIELDS),
    fieldReplyExamples: buildFieldReplyExamples([...CARTON_PACKAGING_FIELDS, ...COMMON_OPTIONAL_FIELDS]),
    estimatedDefaults: {
      material: 'corrugated_carton',
      printColor: 'none',
    },
    estimated: {
      allow: true,
      allowedMissingFieldSets: [['material'], ['printColor'], ['material', 'printColor']],
    },
    statusHints: {
      estimated: '纸箱包装如果先按外箱/包装费模板起报，可在补充材质印刷后再收敛。',
    },
  },
}

export function normalizeProductType(value?: string): ProductType {
  if (
    value === 'flyer' ||
    value === 'business_card' ||
    value === 'poster' ||
    value === 'album' ||
    value === 'mailer_box' ||
    value === 'tuck_end_box' ||
    value === 'window_box' ||
    value === 'leaflet_insert' ||
    value === 'box_insert' ||
    value === 'seal_sticker' ||
    value === 'foil_bag' ||
    value === 'carton_packaging'
  ) {
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
