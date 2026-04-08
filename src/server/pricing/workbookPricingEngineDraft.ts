export type WorkbookProductFamilyTemplateId =
  | 'tuck_end_box_template'
  | 'folding_carton_template'
  | 'mailer_box_template'
  | 'window_box_template'
  | 'leaflet_insert_template'
  | 'box_insert_template'
  | 'seal_sticker_template'
  | 'foil_bag_template'
  | 'carton_packaging_template'

export type WorkbookLineItemType =
  | 'ton_price_material'
  | 'area_based_material'
  | 'fixed_fee'
  | 'quantity_based_process'
  | 'subtotal'
  | 'quote_markup'
  | 'tax_markup'

export type WorkbookFormulaTemplateId =
  | 'ton_price_material'
  | 'area_based_material'
  | 'fixed_fee'
  | 'quantity_based_process'
  | 'line_unit_price'
  | 'subtotal'
  | 'quote_markup'
  | 'tax_markup'

export type WorkbookRequiredField =
  | 'actual_quantity'
  | 'charge_quantity'
  | 'basis_weight'
  | 'basis_factor'
  | 'flat_length'
  | 'flat_width'
  | 'ton_price'
  | 'area_unit_price'
  | 'fixed_amount'
  | 'unit_price'
  | 'markup_rate'
  | 'tax_rate'

export type WorkbookLineItemCode =
  | 'face_paper'
  | 'main_paper'
  | 'outer_liner_material'
  | 'inner_liner_material'
  | 'leaflet_paper'
  | 'leaflet_printing'
  | 'leaflet_folding'
  | 'leaflet_die_cut'
  | 'leaflet_setup'
  | 'core_reinforcement'
  | 'lamination'
  | 'mounting'
  | 'printing_fee'
  | 'die_mold'
  | 'die_cut_machine'
  | 'gluing'
  | 'forming'
  | 'special_process'
  | 'shipping'
  | 'outer_carton'
  | 'window_film'
  | 'window_process'
  | 'insert_material'
  | 'insert_printing'
  | 'insert_die_mold'
  | 'insert_forming'
  | 'insert_gluing'
  | 'sticker_material'
  | 'sticker_printing'
  | 'sticker_die_cut'
  | 'sticker_plate'
  | 'sticker_processing'
  | 'foil_bag_material'
  | 'foil_bag_printing'
  | 'foil_bag_forming'
  | 'foil_bag_setup'
  | 'carton_printing'
  | 'carton_die_mold'
  | 'carton_forming'
  | 'carton_packaging_fee'

export type WorkbookEvidenceRef = {
  workbook: string
  sheet: string
  rowHint: string
  observedItem?: string
}

export type WorkbookFormulaTemplateDraft = {
  id: WorkbookFormulaTemplateId
  lineItemType: WorkbookLineItemType | 'derived'
  expression: string
  preservedFields: WorkbookRequiredField[]
  derivedBindings?: string[]
  notes?: string
}

export type WorkbookLineItemTemplateDraft = {
  code: WorkbookLineItemCode
  displayName: string
  lineItemType: Extract<WorkbookLineItemType, 'ton_price_material' | 'area_based_material' | 'fixed_fee' | 'quantity_based_process'>
  formulaTemplateId: Extract<WorkbookFormulaTemplateId, 'ton_price_material' | 'area_based_material' | 'fixed_fee' | 'quantity_based_process'>
  workbookAliases: string[]
  requiredFields: WorkbookRequiredField[]
  optionalFields?: WorkbookRequiredField[]
  requiredForQuoted: boolean
  notes?: string
}

export type WorkbookSummaryLineTemplateDraft = {
  lineItemType: Extract<WorkbookLineItemType, 'subtotal' | 'quote_markup' | 'tax_markup'>
  formulaTemplateId: Extract<WorkbookFormulaTemplateId, 'subtotal' | 'quote_markup' | 'tax_markup'>
  displayName: string
  workbookAliases: string[]
  requiredFields: WorkbookRequiredField[]
  derivedBindings?: string[]
}

export type WorkbookProductFamilyTemplateDraft = {
  id: WorkbookProductFamilyTemplateId
  displayName: string
  workbookEvidence: WorkbookEvidenceRef[]
  workbookColumnBindings: Record<string, string>
  lineItems: WorkbookLineItemTemplateDraft[]
  summaryLines: WorkbookSummaryLineTemplateDraft[]
  quotedRequiredLineItems: WorkbookLineItemCode[]
  estimatedWhen: string[]
  handoffWhen: string[]
}

export const WORKBOOK_QUOTE_CORE_COLUMNS = [
  '项目',
  '材质',
  '基数',
  '长',
  '宽',
  '吨价',
  '数量(+抛纸)',
  '金额',
  '单价',
  '实际数量',
] as const

export const WORKBOOK_REQUIRED_FIELDS: WorkbookRequiredField[] = [
  'actual_quantity',
  'charge_quantity',
  'basis_weight',
  'basis_factor',
  'flat_length',
  'flat_width',
  'ton_price',
  'area_unit_price',
  'fixed_amount',
  'unit_price',
  'markup_rate',
  'tax_rate',
]

export const WORKBOOK_FORMULA_TEMPLATES: WorkbookFormulaTemplateDraft[] = [
  {
    id: 'ton_price_material',
    lineItemType: 'ton_price_material',
    expression: 'amount = basis_weight * length * width * ton_price * charge_quantity / 10000000000',
    preservedFields: ['basis_weight', 'flat_length', 'flat_width', 'ton_price', 'charge_quantity', 'actual_quantity'],
  },
  {
    id: 'area_based_material',
    lineItemType: 'area_based_material',
    expression: 'amount = basis_factor * (length / 2.54) * (width / 2.54) * area_unit_price * charge_quantity / 1000',
    preservedFields: ['basis_factor', 'flat_length', 'flat_width', 'area_unit_price', 'charge_quantity', 'actual_quantity'],
  },
  {
    id: 'fixed_fee',
    lineItemType: 'fixed_fee',
    expression: 'amount = fixed_amount',
    preservedFields: ['fixed_amount', 'actual_quantity'],
  },
  {
    id: 'quantity_based_process',
    lineItemType: 'quantity_based_process',
    expression: 'amount = unit_price * charge_quantity',
    preservedFields: ['unit_price', 'charge_quantity', 'actual_quantity'],
  },
  {
    id: 'line_unit_price',
    lineItemType: 'derived',
    expression: 'unit_price = amount / actual_quantity',
    preservedFields: ['actual_quantity'],
  },
  {
    id: 'subtotal',
    lineItemType: 'subtotal',
    expression: 'cost_subtotal = sum(line_item.amount)',
    preservedFields: [],
  },
  {
    id: 'quote_markup',
    lineItemType: 'quote_markup',
    expression: 'quoted_amount = cost_subtotal * quote_markup',
    preservedFields: ['markup_rate'],
    derivedBindings: ['quote_markup = 1 + markup_rate'],
    notes: 'Workbook evidence uses values such as 报价*1.2倍, so runtime keeps markup_rate and derives quote_markup as a multiplier.',
  },
  {
    id: 'tax_markup',
    lineItemType: 'tax_markup',
    expression: 'final_amount = quoted_amount * tax_multiplier',
    preservedFields: ['tax_rate'],
    derivedBindings: ['tax_multiplier = 1 + tax_rate'],
    notes: 'Workbook evidence includes tax-inclusive multipliers such as 含税含运*1.15.',
  },
] as const

const COMMON_WORKBOOK_COLUMN_BINDINGS = {
  '项目': 'display_name',
  '材质': 'material_label',
  '基数': 'basis_weight_or_basis_factor',
  '长': 'flat_length',
  '宽': 'flat_width',
  '吨价': 'ton_price_or_area_unit_price_or_fixed_amount_or_unit_price',
  '数量(+抛纸)': 'charge_quantity',
  '金额': 'amount',
  '单价': 'line_unit_price',
  '实际数量': 'actual_quantity',
} as const

const BOX_SUMMARY_LINES: WorkbookSummaryLineTemplateDraft[] = [
  {
    lineItemType: 'subtotal',
    formulaTemplateId: 'subtotal',
    displayName: '成本小计',
    workbookAliases: ['合计'],
    requiredFields: [],
  },
  {
    lineItemType: 'quote_markup',
    formulaTemplateId: 'quote_markup',
    displayName: '报价加成',
    workbookAliases: ['报价*1.2倍'],
    requiredFields: ['markup_rate'],
    derivedBindings: ['quote_markup = 1 + markup_rate'],
  },
  {
    lineItemType: 'tax_markup',
    formulaTemplateId: 'tax_markup',
    displayName: '税费加成',
    workbookAliases: ['含税含运*1.15', '含税'],
    requiredFields: ['tax_rate'],
    derivedBindings: ['tax_multiplier = 1 + tax_rate'],
  },
] as const

const TON_PRICE_FIELDS: WorkbookRequiredField[] = [
  'basis_weight',
  'flat_length',
  'flat_width',
  'ton_price',
  'charge_quantity',
  'actual_quantity',
]

const AREA_FIELDS: WorkbookRequiredField[] = [
  'basis_factor',
  'flat_length',
  'flat_width',
  'area_unit_price',
  'charge_quantity',
  'actual_quantity',
]

const FIXED_FIELDS: WorkbookRequiredField[] = ['fixed_amount', 'actual_quantity']
const QUANTITY_FIELDS: WorkbookRequiredField[] = ['unit_price', 'charge_quantity', 'actual_quantity']

const FOLDING_CARTON_BOX_LINES: WorkbookLineItemTemplateDraft[] = [
  {
    code: 'face_paper',
    displayName: '面纸',
    lineItemType: 'ton_price_material',
    formulaTemplateId: 'ton_price_material',
    workbookAliases: ['面纸'],
    requiredFields: TON_PRICE_FIELDS,
    requiredForQuoted: true,
  },
  {
    code: 'core_reinforcement',
    displayName: '芯材/加强芯',
    lineItemType: 'ton_price_material',
    formulaTemplateId: 'ton_price_material',
    workbookAliases: ['坑纸', '芯纸', '加强芯', '材质'],
    requiredFields: TON_PRICE_FIELDS,
    requiredForQuoted: false,
    notes: 'Only required when workbook evidence shows corrugation, WE/W9/A9/AE/E/AF, or explicit reinforcement layers.',
  },
  {
    code: 'lamination',
    displayName: '覆膜',
    lineItemType: 'area_based_material',
    formulaTemplateId: 'area_based_material',
    workbookAliases: ['哑胶', '光胶', '过哑胶', '过光胶', '覆膜'],
    requiredFields: AREA_FIELDS,
    requiredForQuoted: false,
  },
  {
    code: 'mounting',
    displayName: '裱纸',
    lineItemType: 'area_based_material',
    formulaTemplateId: 'area_based_material',
    workbookAliases: ['裱坑/纸', '裱纸', '对裱'],
    requiredFields: AREA_FIELDS,
    requiredForQuoted: false,
  },
  {
    code: 'printing_fee',
    displayName: '印刷费',
    lineItemType: 'quantity_based_process',
    formulaTemplateId: 'quantity_based_process',
    workbookAliases: ['印刷费', '外发印'],
    requiredFields: QUANTITY_FIELDS,
    requiredForQuoted: true,
  },
  {
    code: 'die_mold',
    displayName: '刀模',
    lineItemType: 'fixed_fee',
    formulaTemplateId: 'fixed_fee',
    workbookAliases: ['刀模'],
    requiredFields: FIXED_FIELDS,
    requiredForQuoted: true,
  },
  {
    code: 'die_cut_machine',
    displayName: '啤机',
    lineItemType: 'quantity_based_process',
    formulaTemplateId: 'quantity_based_process',
    workbookAliases: ['啤机'],
    requiredFields: QUANTITY_FIELDS,
    requiredForQuoted: true,
  },
  {
    code: 'gluing',
    displayName: '粘盒',
    lineItemType: 'quantity_based_process',
    formulaTemplateId: 'quantity_based_process',
    workbookAliases: ['粘盒', '粘合'],
    requiredFields: QUANTITY_FIELDS,
    requiredForQuoted: true,
  },
  {
    code: 'special_process',
    displayName: '特殊工艺',
    lineItemType: 'quantity_based_process',
    formulaTemplateId: 'quantity_based_process',
    workbookAliases: ['驳接', '贴双面胶', '贴易撕线', 'UV', '激凸', '局部UV'],
    requiredFields: QUANTITY_FIELDS,
    optionalFields: ['fixed_amount'],
    requiredForQuoted: false,
  },
  {
    code: 'shipping',
    displayName: '运费',
    lineItemType: 'fixed_fee',
    formulaTemplateId: 'fixed_fee',
    workbookAliases: ['运费', '含运'],
    requiredFields: FIXED_FIELDS,
    requiredForQuoted: false,
  },
  {
    code: 'outer_carton',
    displayName: '纸箱',
    lineItemType: 'quantity_based_process',
    formulaTemplateId: 'quantity_based_process',
    workbookAliases: ['纸箱', '纸箱+包装费', '空白箱'],
    requiredFields: QUANTITY_FIELDS,
    requiredForQuoted: false,
  },
] as const

export const WORKBOOK_PRODUCT_FAMILY_TEMPLATES: WorkbookProductFamilyTemplateDraft[] = [
  {
    id: 'tuck_end_box_template',
    displayName: '双插盒模板',
    workbookEvidence: [
      {
        workbook: '1688报价---王小姐2026.4月.xlsx',
        sheet: '2026.3,.31旺旺耐心点',
        rowHint: 'row 7',
        observedItem: '双插盒',
      },
      {
        workbook: '1688报价2026-4月-黄娟.xlsx',
        sheet: '0401广州麦柯黎雅化妆品工厂',
        rowHint: 'rows 6-7',
        observedItem: '中盒 / 彩盒',
      },
    ],
    workbookColumnBindings: COMMON_WORKBOOK_COLUMN_BINDINGS,
    lineItems: FOLDING_CARTON_BOX_LINES,
    summaryLines: BOX_SUMMARY_LINES,
    quotedRequiredLineItems: ['face_paper', 'printing_fee', 'die_mold', 'die_cut_machine', 'gluing'],
    estimatedWhen: [
      '芯材/加强芯存在但材质或吨价无法稳定归一时，只能 estimated。',
      '特殊工艺存在但只拿到业务描述，没有稳定费率时，只能 estimated。',
    ],
    handoffWhen: [
      '主材、印刷费、刀模、啤机、粘盒这些关键 line-item 任一无法确定时，不得 quoted。',
      '未知坑型、未知板材、未知特材代码影响成本判断时，直接 handoff_required。',
    ],
  },
  {
    id: 'folding_carton_template',
    displayName: '彩盒模板',
    workbookEvidence: [
      {
        workbook: '1688报价---王小姐2026.4月.xlsx',
        sheet: '2026.4.1谢先生-毛绒定制',
        rowHint: 'rows 7-9',
        observedItem: '彩盒 / 纸箱+包装费',
      },
      {
        workbook: '1688报价2026-4月-黄娟.xlsx',
        sheet: '0403鸽士锋',
        rowHint: 'rows 6-12',
        observedItem: '挂钩彩盒 / 内彩盒 / 大外箱',
      },
    ],
    workbookColumnBindings: COMMON_WORKBOOK_COLUMN_BINDINGS,
    lineItems: FOLDING_CARTON_BOX_LINES,
    summaryLines: BOX_SUMMARY_LINES,
    quotedRequiredLineItems: ['face_paper', 'printing_fee', 'die_mold', 'die_cut_machine', 'gluing'],
    estimatedWhen: [
      '归一到彩盒主族但具体盒型仍不稳时，可作为 folding_carton_template estimated。',
      '存在挂钩、配内卡等 companion items 时，可先保守 estimated。',
    ],
    handoffWhen: [
      '结构属于开窗、扣底、天地盖或依赖刀线图时，不能用 folding_carton_template 强行 quoted。',
    ],
  },
  {
    id: 'mailer_box_template',
    displayName: '飞机盒模板',
    workbookEvidence: [
      {
        workbook: '1688报价---王小姐2026.4月.xlsx',
        sheet: '2026.4.1 JACK  叶先生',
        rowHint: 'row 7',
        observedItem: '飞机盒',
      },
      {
        workbook: '1688报价2026-4月-黄娟.xlsx',
        sheet: '0401江苏维凯',
        rowHint: 'rows 6-9',
        observedItem: 'Dexas飞机彩盒',
      },
      {
        workbook: '1688报价2026-4月-黄娟.xlsx',
        sheet: '0402欣梦创想',
        rowHint: 'rows 6-10',
        observedItem: '密胺麻将飞机盒',
      },
    ],
    workbookColumnBindings: COMMON_WORKBOOK_COLUMN_BINDINGS,
    lineItems: [
      {
        code: 'outer_liner_material',
        displayName: '外层纸材',
        lineItemType: 'ton_price_material',
        formulaTemplateId: 'ton_price_material',
        workbookAliases: ['面纸', '白板纸', '白卡'],
        requiredFields: TON_PRICE_FIELDS,
        requiredForQuoted: true,
      },
      {
        code: 'inner_liner_material',
        displayName: '内层纸材（如存在）',
        lineItemType: 'ton_price_material',
        formulaTemplateId: 'ton_price_material',
        workbookAliases: ['面纸', '背纸', '白板纸', '白卡'],
        requiredFields: TON_PRICE_FIELDS,
        requiredForQuoted: false,
      },
      {
        code: 'core_reinforcement',
        displayName: '芯材/加强芯',
        lineItemType: 'ton_price_material',
        formulaTemplateId: 'ton_price_material',
        workbookAliases: ['坑纸', '芯纸', '加强芯', 'WE', 'W9', 'A9', 'AE'],
        requiredFields: TON_PRICE_FIELDS,
        requiredForQuoted: false,
      },
      {
        code: 'lamination',
        displayName: '覆膜',
        lineItemType: 'area_based_material',
        formulaTemplateId: 'area_based_material',
        workbookAliases: ['哑胶', '光胶', '过哑胶', '过光胶'],
        requiredFields: AREA_FIELDS,
        requiredForQuoted: false,
      },
      {
        code: 'mounting',
        displayName: '裱纸',
        lineItemType: 'area_based_material',
        formulaTemplateId: 'area_based_material',
        workbookAliases: ['裱坑/纸', '裱'],
        requiredFields: AREA_FIELDS,
        requiredForQuoted: false,
      },
      {
        code: 'printing_fee',
        displayName: '印刷费',
        lineItemType: 'quantity_based_process',
        formulaTemplateId: 'quantity_based_process',
        workbookAliases: ['印刷费'],
        requiredFields: QUANTITY_FIELDS,
        requiredForQuoted: true,
      },
      {
        code: 'die_mold',
        displayName: '刀模',
        lineItemType: 'fixed_fee',
        formulaTemplateId: 'fixed_fee',
        workbookAliases: ['刀模'],
        requiredFields: FIXED_FIELDS,
        requiredForQuoted: true,
      },
      {
        code: 'die_cut_machine',
        displayName: '啤机',
        lineItemType: 'quantity_based_process',
        formulaTemplateId: 'quantity_based_process',
        workbookAliases: ['啤机'],
        requiredFields: QUANTITY_FIELDS,
        requiredForQuoted: true,
      },
      {
        code: 'forming',
        displayName: '粘盒/成型',
        lineItemType: 'quantity_based_process',
        formulaTemplateId: 'quantity_based_process',
        workbookAliases: ['粘盒', '成型'],
        requiredFields: QUANTITY_FIELDS,
        requiredForQuoted: false,
      },
      {
        code: 'shipping',
        displayName: '运费',
        lineItemType: 'fixed_fee',
        formulaTemplateId: 'fixed_fee',
        workbookAliases: ['运费', '含运'],
        requiredFields: FIXED_FIELDS,
        requiredForQuoted: false,
      },
      {
        code: 'outer_carton',
        displayName: '纸箱',
        lineItemType: 'quantity_based_process',
        formulaTemplateId: 'quantity_based_process',
        workbookAliases: ['纸箱', '空白箱'],
        requiredFields: QUANTITY_FIELDS,
        requiredForQuoted: false,
      },
    ],
    summaryLines: BOX_SUMMARY_LINES,
    quotedRequiredLineItems: ['outer_liner_material', 'printing_fee', 'die_mold', 'die_cut_machine'],
    estimatedWhen: [
      '内层纸材或加强芯存在但只拿到口语描述、没有稳定材料层分解时，可先 estimated。',
    ],
    handoffWhen: [
      '飞机盒关键材料层无法拆成外层纸材 / 芯材 / 内层纸材时，不得 quoted。',
    ],
  },
  {
    id: 'window_box_template',
    displayName: '开窗彩盒模板',
    workbookEvidence: [
      {
        workbook: '1688报价---王小姐2026.4月.xlsx',
        sheet: '2026..4.2黄小姐-毛绒定制',
        rowHint: 'row 7',
        observedItem: '开窗彩盒',
      },
      {
        workbook: '1688报价2026-4月-黄娟.xlsx',
        sheet: '0402鸽士锋',
        rowHint: 'row 6',
        observedItem: '挂钩彩盒 + 胶片0.2APET10x10cm',
      },
    ],
    workbookColumnBindings: COMMON_WORKBOOK_COLUMN_BINDINGS,
    lineItems: [
      {
        code: 'main_paper',
        displayName: '主纸材',
        lineItemType: 'ton_price_material',
        formulaTemplateId: 'ton_price_material',
        workbookAliases: ['面纸', '主纸材'],
        requiredFields: TON_PRICE_FIELDS,
        requiredForQuoted: true,
      },
      {
        code: 'lamination',
        displayName: '覆膜',
        lineItemType: 'area_based_material',
        formulaTemplateId: 'area_based_material',
        workbookAliases: ['哑胶', '光胶', '过哑胶', '过光胶'],
        requiredFields: AREA_FIELDS,
        requiredForQuoted: false,
      },
      {
        code: 'mounting',
        displayName: '裱纸',
        lineItemType: 'area_based_material',
        formulaTemplateId: 'area_based_material',
        workbookAliases: ['裱坑/纸', '裱纸', '裱'],
        requiredFields: AREA_FIELDS,
        requiredForQuoted: false,
      },
      {
        code: 'printing_fee',
        displayName: '印刷费',
        lineItemType: 'quantity_based_process',
        formulaTemplateId: 'quantity_based_process',
        workbookAliases: ['印刷费'],
        requiredFields: QUANTITY_FIELDS,
        requiredForQuoted: true,
      },
      {
        code: 'die_mold',
        displayName: '刀模',
        lineItemType: 'fixed_fee',
        formulaTemplateId: 'fixed_fee',
        workbookAliases: ['刀模'],
        requiredFields: FIXED_FIELDS,
        requiredForQuoted: true,
      },
      {
        code: 'die_cut_machine',
        displayName: '啤机',
        lineItemType: 'quantity_based_process',
        formulaTemplateId: 'quantity_based_process',
        workbookAliases: ['啤机'],
        requiredFields: QUANTITY_FIELDS,
        requiredForQuoted: true,
      },
      {
        code: 'gluing',
        displayName: '粘盒',
        lineItemType: 'quantity_based_process',
        formulaTemplateId: 'quantity_based_process',
        workbookAliases: ['粘盒', '粘合'],
        requiredFields: QUANTITY_FIELDS,
        requiredForQuoted: true,
      },
      {
        code: 'window_film',
        displayName: '胶片',
        lineItemType: 'area_based_material',
        formulaTemplateId: 'area_based_material',
        workbookAliases: ['胶片', '开窗贴0.2厚胶片', 'APET'],
        requiredFields: AREA_FIELDS,
        optionalFields: ['basis_weight'],
        requiredForQuoted: true,
      },
      {
        code: 'window_process',
        displayName: '开窗相关工艺',
        lineItemType: 'quantity_based_process',
        formulaTemplateId: 'quantity_based_process',
        workbookAliases: ['开窗', '贴窗口片'],
        requiredFields: QUANTITY_FIELDS,
        requiredForQuoted: true,
      },
      {
        code: 'shipping',
        displayName: '运费',
        lineItemType: 'fixed_fee',
        formulaTemplateId: 'fixed_fee',
        workbookAliases: ['运费', '含运'],
        requiredFields: FIXED_FIELDS,
        requiredForQuoted: false,
      },
      {
        code: 'outer_carton',
        displayName: '纸箱',
        lineItemType: 'quantity_based_process',
        formulaTemplateId: 'quantity_based_process',
        workbookAliases: ['纸箱', '空白箱'],
        requiredFields: QUANTITY_FIELDS,
        requiredForQuoted: false,
      },
    ],
    summaryLines: BOX_SUMMARY_LINES,
    quotedRequiredLineItems: ['main_paper', 'printing_fee', 'die_mold', 'die_cut_machine', 'gluing', 'window_film', 'window_process'],
    estimatedWhen: [
      '窗口尺寸或胶片单价缺失，但主盒 line-items 基本完整时，可先 estimated。',
    ],
    handoffWhen: [
      '窗口片材质、厚度、窗位尺寸或开窗后道任一缺失时，不能 quoted。',
    ],
  },
  {
    id: 'leaflet_insert_template',
    displayName: '说明书模板',
    workbookEvidence: [
      {
        workbook: '1688报价---王小姐2026.4月.xlsx',
        sheet: '2026.3,.31旺旺耐心点',
        rowHint: 'row 9',
        observedItem: '说明书',
      },
      {
        workbook: '1688报价2026-4月-黄娟.xlsx',
        sheet: '0401广州麦柯黎雅化妆品工厂',
        rowHint: 'row 11',
        observedItem: '说明书',
      },
    ],
    workbookColumnBindings: COMMON_WORKBOOK_COLUMN_BINDINGS,
    lineItems: [
      {
        code: 'leaflet_paper',
        displayName: '说明书纸材',
        lineItemType: 'ton_price_material',
        formulaTemplateId: 'ton_price_material',
        workbookAliases: ['面纸', '纸材'],
        requiredFields: TON_PRICE_FIELDS,
        requiredForQuoted: true,
      },
      {
        code: 'leaflet_printing',
        displayName: '说明书印刷费',
        lineItemType: 'fixed_fee',
        formulaTemplateId: 'fixed_fee',
        workbookAliases: ['印刷费'],
        requiredFields: FIXED_FIELDS,
        requiredForQuoted: true,
      },
      {
        code: 'leaflet_setup',
        displayName: '固定开机费',
        lineItemType: 'fixed_fee',
        formulaTemplateId: 'fixed_fee',
        workbookAliases: ['开机费', '版费'],
        requiredFields: FIXED_FIELDS,
        requiredForQuoted: false,
      },
      {
        code: 'leaflet_folding',
        displayName: '折页',
        lineItemType: 'quantity_based_process',
        formulaTemplateId: 'quantity_based_process',
        workbookAliases: ['折3折', '折页'],
        requiredFields: QUANTITY_FIELDS,
        requiredForQuoted: false,
      },
      {
        code: 'leaflet_die_cut',
        displayName: '裁切/刀模',
        lineItemType: 'quantity_based_process',
        formulaTemplateId: 'quantity_based_process',
        workbookAliases: ['裁切', '刀模', '模切'],
        requiredFields: QUANTITY_FIELDS,
        requiredForQuoted: false,
      },
      {
        code: 'shipping',
        displayName: '运费',
        lineItemType: 'fixed_fee',
        formulaTemplateId: 'fixed_fee',
        workbookAliases: ['运费'],
        requiredFields: FIXED_FIELDS,
        requiredForQuoted: false,
      },
    ],
    summaryLines: BOX_SUMMARY_LINES,
    quotedRequiredLineItems: ['leaflet_paper', 'leaflet_printing'],
    estimatedWhen: ['折页数不稳或单双面不稳时，可先 estimated。'],
    handoffWhen: ['纸材和印刷费都无法稳定落表时，不能 quoted。'],
  },
  {
    id: 'box_insert_template',
    displayName: '内托模板',
    workbookEvidence: [
      {
        workbook: '1688报价---王小姐2026.4月.xlsx',
        sheet: '2026.3,.31旺旺耐心点',
        rowHint: 'row 8',
        observedItem: '内托',
      },
      {
        workbook: '1688报价2026-4月-黄娟.xlsx',
        sheet: '0401广州麦柯黎雅化妆品工厂',
        rowHint: 'row 8',
        observedItem: '纸内托',
      },
    ],
    workbookColumnBindings: COMMON_WORKBOOK_COLUMN_BINDINGS,
    lineItems: [
      {
        code: 'insert_material',
        displayName: '内托材质',
        lineItemType: 'ton_price_material',
        formulaTemplateId: 'ton_price_material',
        workbookAliases: ['面纸', '已对裱', '特种纸板'],
        requiredFields: TON_PRICE_FIELDS,
        requiredForQuoted: true,
      },
      {
        code: 'insert_printing',
        displayName: '内托印刷费',
        lineItemType: 'fixed_fee',
        formulaTemplateId: 'fixed_fee',
        workbookAliases: ['印刷费', '专色', '外发印'],
        requiredFields: FIXED_FIELDS,
        requiredForQuoted: false,
      },
      {
        code: 'insert_die_mold',
        displayName: '刀模',
        lineItemType: 'fixed_fee',
        formulaTemplateId: 'fixed_fee',
        workbookAliases: ['刀模'],
        requiredFields: FIXED_FIELDS,
        requiredForQuoted: true,
      },
      {
        code: 'insert_forming',
        displayName: '啤机/成型',
        lineItemType: 'quantity_based_process',
        formulaTemplateId: 'quantity_based_process',
        workbookAliases: ['啤机', '成型'],
        requiredFields: QUANTITY_FIELDS,
        requiredForQuoted: true,
      },
      {
        code: 'insert_gluing',
        displayName: '贴合/粘位',
        lineItemType: 'quantity_based_process',
        formulaTemplateId: 'quantity_based_process',
        workbookAliases: ['贴合', '粘位', '裱'],
        requiredFields: QUANTITY_FIELDS,
        requiredForQuoted: false,
      },
      {
        code: 'shipping',
        displayName: '运费',
        lineItemType: 'fixed_fee',
        formulaTemplateId: 'fixed_fee',
        workbookAliases: ['运费'],
        requiredFields: FIXED_FIELDS,
        requiredForQuoted: false,
      },
    ],
    summaryLines: BOX_SUMMARY_LINES,
    quotedRequiredLineItems: ['insert_material', 'insert_die_mold', 'insert_forming'],
    estimatedWhen: ['内托类型可识别但材质层仍模糊时，可先 estimated。'],
    handoffWhen: ['内托材质和成型路径都无法稳定时，不能 quoted。'],
  },
  {
    id: 'seal_sticker_template',
    displayName: '封口贴模板',
    workbookEvidence: [
      {
        workbook: '1688报价---王小姐2026.4月.xlsx',
        sheet: '2026.3,.31旺旺耐心点',
        rowHint: 'row 10',
        observedItem: '透明贴纸',
      },
    ],
    workbookColumnBindings: COMMON_WORKBOOK_COLUMN_BINDINGS,
    lineItems: [
      {
        code: 'sticker_material',
        displayName: '贴纸材质',
        lineItemType: 'area_based_material',
        formulaTemplateId: 'area_based_material',
        workbookAliases: ['透明贴纸', '封口贴'],
        requiredFields: AREA_FIELDS,
        requiredForQuoted: true,
      },
      {
        code: 'sticker_printing',
        displayName: '贴纸印刷费',
        lineItemType: 'fixed_fee',
        formulaTemplateId: 'fixed_fee',
        workbookAliases: ['印刷费'],
        requiredFields: FIXED_FIELDS,
        requiredForQuoted: false,
      },
      {
        code: 'sticker_plate',
        displayName: '版费/刀模费',
        lineItemType: 'fixed_fee',
        formulaTemplateId: 'fixed_fee',
        workbookAliases: ['版费', '刀模费'],
        requiredFields: FIXED_FIELDS,
        requiredForQuoted: false,
      },
      {
        code: 'sticker_die_cut',
        displayName: '贴纸模切',
        lineItemType: 'quantity_based_process',
        formulaTemplateId: 'quantity_based_process',
        workbookAliases: ['刀模', '啤机', '模切'],
        requiredFields: QUANTITY_FIELDS,
        requiredForQuoted: true,
      },
      {
        code: 'sticker_processing',
        displayName: '数量型加工费',
        lineItemType: 'quantity_based_process',
        formulaTemplateId: 'quantity_based_process',
        workbookAliases: ['半穿', '排废', '加工费'],
        requiredFields: QUANTITY_FIELDS,
        requiredForQuoted: true,
      },
      {
        code: 'shipping',
        displayName: '运费',
        lineItemType: 'fixed_fee',
        formulaTemplateId: 'fixed_fee',
        workbookAliases: ['运费'],
        requiredFields: FIXED_FIELDS,
        requiredForQuoted: false,
      },
    ],
    summaryLines: BOX_SUMMARY_LINES,
    quotedRequiredLineItems: ['sticker_material', 'sticker_die_cut', 'sticker_processing'],
    estimatedWhen: ['封口贴只拿到尺寸和数量、没有明确材质或是否印刷时，可先 estimated。'],
    handoffWhen: ['材质、模切方式和核心尺寸都不稳时，不能 quoted。'],
  },
  {
    id: 'foil_bag_template',
    displayName: '铝箔袋模板',
    workbookEvidence: [
      {
        workbook: '1688报价---王小姐2026.4月.xlsx',
        sheet: '2026.4.1谢先生-毛绒定制',
        rowHint: 'row 8',
        observedItem: '铝铂袋 / 8丝空白铝铂袋',
      },
    ],
    workbookColumnBindings: COMMON_WORKBOOK_COLUMN_BINDINGS,
    lineItems: [
      {
        code: 'foil_bag_material',
        displayName: '袋材',
        lineItemType: 'area_based_material',
        formulaTemplateId: 'area_based_material',
        workbookAliases: ['铝箔袋', '铝铂袋', '空白铝箔袋'],
        requiredFields: AREA_FIELDS,
        requiredForQuoted: true,
      },
      {
        code: 'foil_bag_printing',
        displayName: '袋面印刷费',
        lineItemType: 'fixed_fee',
        formulaTemplateId: 'fixed_fee',
        workbookAliases: ['印刷费', '印刷'],
        requiredFields: FIXED_FIELDS,
        requiredForQuoted: false,
      },
      {
        code: 'foil_bag_setup',
        displayName: '打样/开机费',
        lineItemType: 'fixed_fee',
        formulaTemplateId: 'fixed_fee',
        workbookAliases: ['打数码样', '数码样', '打样'],
        requiredFields: FIXED_FIELDS,
        requiredForQuoted: false,
      },
      {
        code: 'foil_bag_forming',
        displayName: '制袋',
        lineItemType: 'quantity_based_process',
        formulaTemplateId: 'quantity_based_process',
        workbookAliases: ['制袋', '制袋费', '成袋'],
        requiredFields: QUANTITY_FIELDS,
        requiredForQuoted: true,
      },
    ],
    summaryLines: BOX_SUMMARY_LINES,
    quotedRequiredLineItems: ['foil_bag_material', 'foil_bag_forming'],
    estimatedWhen: [
      '铝箔袋只有尺寸和数量、材质厚度按常见 8 丝空白袋兜底时，可先 estimated。',
      '铝箔袋出现定制印刷、打样或特殊袋型时，先按 estimated。',
    ],
    handoffWhen: ['铝箔袋涉及拉链、自立嘴、复合结构或核心袋材无法识别时，不能 quoted。'],
  },
  {
    id: 'carton_packaging_template',
    displayName: '纸箱包装模板',
    workbookEvidence: [
      {
        workbook: '1688报价---王小姐2026.4月.xlsx',
        sheet: '2026.4.1谢先生-毛绒定制',
        rowHint: 'row 9',
        observedItem: '纸箱+包装费',
      },
      {
        workbook: '1688报价2026-4月-黄娟.xlsx',
        sheet: '0403鸽士锋',
        rowHint: 'row 12',
        observedItem: '大外箱 / K636K,空白箱',
      },
    ],
    workbookColumnBindings: COMMON_WORKBOOK_COLUMN_BINDINGS,
    lineItems: [
      {
        code: 'outer_carton',
        displayName: '纸箱/大外箱',
        lineItemType: 'quantity_based_process',
        formulaTemplateId: 'quantity_based_process',
        workbookAliases: ['纸箱+包装费', '纸箱', '大外箱', '外箱', '空白箱'],
        requiredFields: QUANTITY_FIELDS,
        requiredForQuoted: true,
      },
      {
        code: 'carton_printing',
        displayName: '外箱印刷费',
        lineItemType: 'fixed_fee',
        formulaTemplateId: 'fixed_fee',
        workbookAliases: ['印刷费'],
        requiredFields: FIXED_FIELDS,
        requiredForQuoted: false,
      },
      {
        code: 'carton_die_mold',
        displayName: '外箱刀模',
        lineItemType: 'fixed_fee',
        formulaTemplateId: 'fixed_fee',
        workbookAliases: ['刀模'],
        requiredFields: FIXED_FIELDS,
        requiredForQuoted: false,
      },
      {
        code: 'carton_forming',
        displayName: '成箱/粘箱',
        lineItemType: 'quantity_based_process',
        formulaTemplateId: 'quantity_based_process',
        workbookAliases: ['啤机', '粘盒', '成型', '成箱'],
        requiredFields: QUANTITY_FIELDS,
        requiredForQuoted: false,
      },
      {
        code: 'carton_packaging_fee',
        displayName: '包装费',
        lineItemType: 'quantity_based_process',
        formulaTemplateId: 'quantity_based_process',
        workbookAliases: ['包装费', '装箱费'],
        requiredFields: QUANTITY_FIELDS,
        requiredForQuoted: false,
      },
    ],
    summaryLines: BOX_SUMMARY_LINES,
    quotedRequiredLineItems: ['outer_carton'],
    estimatedWhen: [
      '纸箱包装只落到外箱基础费，但附带印刷或包装工描述仍较模糊时，可先 estimated。',
      '纸箱材质只识别到空白箱/外箱，没有更细板材层信息时，可先按简单模板估算。',
    ],
    handoffWhen: ['纸箱包装涉及异常板材、复杂刀线结构或与物流规则强耦合时，不能 quoted。'],
  },
] as const

export const WORKBOOK_DECISION_BOUNDARY_DRAFT = {
  quoted: 'Only quoted when all quotedRequiredLineItems are deterministically resolved for the selected product template.',
  estimated: 'Use estimated when the product template is stable but one or more non-critical line-items still rely on fallback assumptions.',
  handoff_required: 'Use handoff_required when any critical line-item cannot be resolved, or workbook-equivalent structure/material terms remain blocking.',
} as const

export function getWorkbookProductFamilyTemplate(
  templateId: WorkbookProductFamilyTemplateId
): WorkbookProductFamilyTemplateDraft | undefined {
  return WORKBOOK_PRODUCT_FAMILY_TEMPLATES.find((template) => template.id === templateId)
}

export function canTemplateBeQuoted(
  template: WorkbookProductFamilyTemplateDraft,
  resolvedLineItems: WorkbookLineItemCode[]
): boolean {
  const resolved = new Set(resolvedLineItems)
  return template.quotedRequiredLineItems.every((code) => resolved.has(code))
}