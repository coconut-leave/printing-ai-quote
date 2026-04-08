import type {
  ComplexPackagingItem,
  ComplexPackagingLineItemCode,
  ComplexPackagingLineQuote,
  ComplexPackagingPriceLineItem,
  ComplexPackagingProductType,
  ComplexPackagingRequest,
  ComplexPackagingTemplateId,
} from '@/server/packaging/types'
import {
  canTemplateBeQuoted,
  getWorkbookProductFamilyTemplate,
  type WorkbookProductFamilyTemplateId,
} from './workbookPricingEngineDraft'

const round2 = (value: number) => Math.round(value * 100) / 100

type WorkbookSupportedProductType = Extract<ComplexPackagingProductType, 'tuck_end_box' | 'mailer_box' | 'window_box' | 'leaflet_insert' | 'box_insert' | 'seal_sticker' | 'foil_bag' | 'carton_packaging'>

type QuantityLadderConfig = {
  minQuantity: number
  spoilageQuantity: number
  printingFee: number
  setupFee?: number
  dieMoldFee?: number
  dieCutUnitPrice?: number
  gluingUnitPrice?: number
  finishingExtraUnits?: number
  outerCartonUnitPrice?: number
  outerCartonPackSize?: number
  foldingUnitPrice?: number
  trimUnitPrice?: number
  plateFee?: number
  processUnitPrice?: number
}

type TemplateRuntimeConfig = {
  templateId: Extract<ComplexPackagingTemplateId, 'tuck_end_box_template' | 'mailer_box_template' | 'window_box_template' | 'leaflet_insert_template' | 'box_insert_template' | 'seal_sticker_template' | 'foil_bag_template' | 'carton_packaging_template'>
  productType: WorkbookSupportedProductType
  chargeMode: 'sheet_count' | 'unit_count'
  pressSheets?: Array<{ length: number; width: number }>
  derivedAspectRatio: number
  boxAreaMultiplier: number
  markupRate: number
  ladders: QuantityLadderConfig[]
}

type FlatDimensions = {
  length: number
  width: number
}

type ItemAssessment = {
  supported: boolean
  status: 'quoted' | 'estimated' | 'handoff_required'
  templateId?: TemplateRuntimeConfig['templateId']
  reasons: string[]
  blockingReasons: string[]
}

type PricingContext = {
  templateId: TemplateRuntimeConfig['templateId']
  productType: WorkbookSupportedProductType
  templateRuntime: TemplateRuntimeConfig
  actualQuantity: number
  flatLength: number
  flatWidth: number
  chargeMode: TemplateRuntimeConfig['chargeMode']
  impositionCount: number
  chargeQuantity: number
  spoilageQuantity: number
  ladder: QuantityLadderConfig
  materialLayers: Array<{ material?: string; weight?: number }>
  coreCode?: string
  coreWeight?: number
  surfaceText: string
  printPassLabel: string
  windowLength?: number
  windowWidth?: number
  windowThickness?: number
  taxMultiplier: number
}

type BuildResult = {
  lineQuote: ComplexPackagingLineQuote
  status: ItemAssessment['status']
  reasons: string[]
  blockingReasons: string[]
}

const TEMPLATE_BY_PRODUCT_TYPE: Record<WorkbookSupportedProductType, TemplateRuntimeConfig> = {
  tuck_end_box: {
    templateId: 'tuck_end_box_template',
    productType: 'tuck_end_box',
    chargeMode: 'sheet_count',
    pressSheets: [
      { length: 75, width: 44 },
      { length: 66, width: 47 },
    ],
    derivedAspectRatio: 1.62,
    boxAreaMultiplier: 1.36,
    markupRate: 0.1,
    ladders: [
      { minQuantity: 10000, spoilageQuantity: 220, printingFee: 850, dieMoldFee: 180, dieCutUnitPrice: 0.08, gluingUnitPrice: 0.04, finishingExtraUnits: 120, outerCartonUnitPrice: 3.2, outerCartonPackSize: 120 },
      { minQuantity: 5000, spoilageQuantity: 200, printingFee: 850, dieMoldFee: 160, dieCutUnitPrice: 0.16, gluingUnitPrice: 0.09, finishingExtraUnits: 100, outerCartonUnitPrice: 3.3, outerCartonPackSize: 100 },
      { minQuantity: 3000, spoilageQuantity: 180, printingFee: 900, dieMoldFee: 180, dieCutUnitPrice: 0.17, gluingUnitPrice: 0.095, finishingExtraUnits: 80, outerCartonUnitPrice: 3.6, outerCartonPackSize: 80 },
      { minQuantity: 2000, spoilageQuantity: 180, printingFee: 900, dieMoldFee: 200, dieCutUnitPrice: 0.18, gluingUnitPrice: 0.1, finishingExtraUnits: 80, outerCartonUnitPrice: 3.8, outerCartonPackSize: 70 },
      { minQuantity: 1000, spoilageQuantity: 200, printingFee: 700, dieMoldFee: 200, dieCutUnitPrice: 0.22, gluingUnitPrice: 0.1, finishingExtraUnits: 60, outerCartonUnitPrice: 4.2, outerCartonPackSize: 60 },
      { minQuantity: 500, spoilageQuantity: 220, printingFee: 600, dieMoldFee: 200, dieCutUnitPrice: 0.24, gluingUnitPrice: 0.07, finishingExtraUnits: 50, outerCartonUnitPrice: 4.5, outerCartonPackSize: 50 },
      { minQuantity: 0, spoilageQuantity: 240, printingFee: 650, dieMoldFee: 220, dieCutUnitPrice: 0.28, gluingUnitPrice: 0.08, finishingExtraUnits: 40, outerCartonUnitPrice: 4.8, outerCartonPackSize: 40 },
    ],
  },
  mailer_box: {
    templateId: 'mailer_box_template',
    productType: 'mailer_box',
    chargeMode: 'sheet_count',
    pressSheets: [
      { length: 55, width: 54 },
      { length: 59, width: 70 },
    ],
    derivedAspectRatio: 1.02,
    boxAreaMultiplier: 1.55,
    markupRate: 0.1,
    ladders: [
      { minQuantity: 10000, spoilageQuantity: 220, printingFee: 760, dieMoldFee: 180, dieCutUnitPrice: 0.08, gluingUnitPrice: 0.03, finishingExtraUnits: 80, outerCartonUnitPrice: 3.8, outerCartonPackSize: 80 },
      { minQuantity: 5000, spoilageQuantity: 200, printingFee: 780, dieMoldFee: 200, dieCutUnitPrice: 0.09, gluingUnitPrice: 0.03, finishingExtraUnits: 70, outerCartonUnitPrice: 4.1, outerCartonPackSize: 70 },
      { minQuantity: 3000, spoilageQuantity: 180, printingFee: 800, dieMoldFee: 200, dieCutUnitPrice: 0.095, gluingUnitPrice: 0.03, finishingExtraUnits: 60, outerCartonUnitPrice: 4.3, outerCartonPackSize: 60 },
      { minQuantity: 2000, spoilageQuantity: 180, printingFee: 820, dieMoldFee: 200, dieCutUnitPrice: 0.105, gluingUnitPrice: 0.03, finishingExtraUnits: 60, outerCartonUnitPrice: 4.5, outerCartonPackSize: 60 },
      { minQuantity: 1000, spoilageQuantity: 200, printingFee: 650, dieMoldFee: 200, dieCutUnitPrice: 0.1, gluingUnitPrice: 0.02, finishingExtraUnits: 50, outerCartonUnitPrice: 4.8, outerCartonPackSize: 50 },
      { minQuantity: 500, spoilageQuantity: 220, printingFee: 700, dieMoldFee: 220, dieCutUnitPrice: 0.12, gluingUnitPrice: 0.02, finishingExtraUnits: 40, outerCartonUnitPrice: 5.2, outerCartonPackSize: 40 },
      { minQuantity: 0, spoilageQuantity: 240, printingFee: 760, dieMoldFee: 240, dieCutUnitPrice: 0.14, gluingUnitPrice: 0.02, finishingExtraUnits: 30, outerCartonUnitPrice: 5.6, outerCartonPackSize: 30 },
    ],
  },
  window_box: {
    templateId: 'window_box_template',
    productType: 'window_box',
    chargeMode: 'sheet_count',
    pressSheets: [
      { length: 66, width: 47 },
      { length: 70, width: 64 },
      { length: 109, width: 79 },
    ],
    derivedAspectRatio: 1.4,
    boxAreaMultiplier: 1.42,
    markupRate: 0.1,
    ladders: [
      { minQuantity: 10000, spoilageQuantity: 220, printingFee: 800, dieMoldFee: 200, dieCutUnitPrice: 0.09, gluingUnitPrice: 0.045, finishingExtraUnits: 100, outerCartonUnitPrice: 3.5, outerCartonPackSize: 100 },
      { minQuantity: 5000, spoilageQuantity: 200, printingFee: 900, dieMoldFee: 200, dieCutUnitPrice: 0.1, gluingUnitPrice: 0.05, finishingExtraUnits: 80, outerCartonUnitPrice: 3.8, outerCartonPackSize: 90 },
      { minQuantity: 3000, spoilageQuantity: 200, printingFee: 900, dieMoldFee: 200, dieCutUnitPrice: 0.12, gluingUnitPrice: 0.055, finishingExtraUnits: 80, outerCartonUnitPrice: 4.0, outerCartonPackSize: 80 },
      { minQuantity: 2000, spoilageQuantity: 200, printingFee: 800, dieMoldFee: 200, dieCutUnitPrice: 0.12, gluingUnitPrice: 0.055, finishingExtraUnits: 80, outerCartonUnitPrice: 4.2, outerCartonPackSize: 70 },
      { minQuantity: 1000, spoilageQuantity: 200, printingFee: 600, dieMoldFee: 200, dieCutUnitPrice: 0.2, gluingUnitPrice: 0.06, finishingExtraUnits: 60, outerCartonUnitPrice: 4.5, outerCartonPackSize: 60 },
      { minQuantity: 500, spoilageQuantity: 220, printingFee: 1200, dieMoldFee: 200, dieCutUnitPrice: 0.24, gluingUnitPrice: 0.07, finishingExtraUnits: 50, outerCartonUnitPrice: 4.8, outerCartonPackSize: 50 },
      { minQuantity: 0, spoilageQuantity: 240, printingFee: 700, dieMoldFee: 220, dieCutUnitPrice: 0.28, gluingUnitPrice: 0.08, finishingExtraUnits: 40, outerCartonUnitPrice: 5.2, outerCartonPackSize: 40 },
    ],
  },
  leaflet_insert: {
    templateId: 'leaflet_insert_template',
    productType: 'leaflet_insert',
    chargeMode: 'unit_count',
    derivedAspectRatio: 2.4,
    boxAreaMultiplier: 1,
    markupRate: 0.2,
    ladders: [
      { minQuantity: 20000, spoilageQuantity: 400, printingFee: 320, setupFee: 40, foldingUnitPrice: 0.028, trimUnitPrice: 0.01 },
      { minQuantity: 10000, spoilageQuantity: 250, printingFee: 280, setupFee: 35, foldingUnitPrice: 0.03, trimUnitPrice: 0.011 },
      { minQuantity: 5000, spoilageQuantity: 150, printingFee: 240, setupFee: 20, foldingUnitPrice: 0.034, trimUnitPrice: 0.012 },
      { minQuantity: 2000, spoilageQuantity: 100, printingFee: 220, setupFee: 30, foldingUnitPrice: 0.04, trimUnitPrice: 0.014 },
      { minQuantity: 1000, spoilageQuantity: 80, printingFee: 200, setupFee: 25, foldingUnitPrice: 0.045, trimUnitPrice: 0.015 },
      { minQuantity: 0, spoilageQuantity: 60, printingFee: 180, setupFee: 25, foldingUnitPrice: 0.05, trimUnitPrice: 0.016 },
    ],
  },
  box_insert: {
    templateId: 'box_insert_template',
    productType: 'box_insert',
    chargeMode: 'unit_count',
    derivedAspectRatio: 1.35,
    boxAreaMultiplier: 1.35,
    markupRate: 0.2,
    ladders: [
      { minQuantity: 10000, spoilageQuantity: 260, printingFee: 200, setupFee: 35, dieMoldFee: 120, dieCutUnitPrice: 0.16, gluingUnitPrice: 0.04 },
      { minQuantity: 5000, spoilageQuantity: 180, printingFee: 180, setupFee: 30, dieMoldFee: 100, dieCutUnitPrice: 0.2, gluingUnitPrice: 0.045 },
      { minQuantity: 2000, spoilageQuantity: 120, printingFee: 160, setupFee: 25, dieMoldFee: 90, dieCutUnitPrice: 0.22, gluingUnitPrice: 0.05 },
      { minQuantity: 1000, spoilageQuantity: 100, printingFee: 140, setupFee: 20, dieMoldFee: 90, dieCutUnitPrice: 0.24, gluingUnitPrice: 0.055 },
      { minQuantity: 0, spoilageQuantity: 80, printingFee: 120, setupFee: 20, dieMoldFee: 80, dieCutUnitPrice: 0.26, gluingUnitPrice: 0.06 },
    ],
  },
  seal_sticker: {
    templateId: 'seal_sticker_template',
    productType: 'seal_sticker',
    chargeMode: 'unit_count',
    derivedAspectRatio: 1.1,
    boxAreaMultiplier: 1,
    markupRate: 0.2,
    ladders: [
      { minQuantity: 50000, spoilageQuantity: 1200, printingFee: 180, setupFee: 20, plateFee: 40, dieCutUnitPrice: 0.0012, processUnitPrice: 0.0009 },
      { minQuantity: 20000, spoilageQuantity: 600, printingFee: 160, setupFee: 20, plateFee: 35, dieCutUnitPrice: 0.0013, processUnitPrice: 0.001 },
      { minQuantity: 10000, spoilageQuantity: 350, printingFee: 140, setupFee: 18, plateFee: 30, dieCutUnitPrice: 0.0014, processUnitPrice: 0.0011 },
      { minQuantity: 5000, spoilageQuantity: 220, printingFee: 120, setupFee: 15, plateFee: 12, dieCutUnitPrice: 0.0016, processUnitPrice: 0.0009 },
      { minQuantity: 1000, spoilageQuantity: 100, printingFee: 100, setupFee: 15, plateFee: 20, dieCutUnitPrice: 0.002, processUnitPrice: 0.0015 },
      { minQuantity: 0, spoilageQuantity: 60, printingFee: 80, setupFee: 12, plateFee: 20, dieCutUnitPrice: 0.0024, processUnitPrice: 0.0018 },
    ],
  },
  foil_bag: {
    templateId: 'foil_bag_template',
    productType: 'foil_bag',
    chargeMode: 'unit_count',
    derivedAspectRatio: 1,
    boxAreaMultiplier: 1,
    markupRate: 0.12,
    ladders: [
      { minQuantity: 20000, spoilageQuantity: 450, printingFee: 260, setupFee: 180, processUnitPrice: 0.38 },
      { minQuantity: 10000, spoilageQuantity: 350, printingFee: 300, setupFee: 220, processUnitPrice: 0.44 },
      { minQuantity: 5000, spoilageQuantity: 220, printingFee: 320, setupFee: 240, processUnitPrice: 0.52 },
      { minQuantity: 2000, spoilageQuantity: 150, printingFee: 340, setupFee: 260, processUnitPrice: 0.6 },
      { minQuantity: 1000, spoilageQuantity: 120, printingFee: 360, setupFee: 280, processUnitPrice: 0.7 },
      { minQuantity: 0, spoilageQuantity: 80, printingFee: 380, setupFee: 300, processUnitPrice: 0.82 },
    ],
  },
  carton_packaging: {
    templateId: 'carton_packaging_template',
    productType: 'carton_packaging',
    chargeMode: 'unit_count',
    derivedAspectRatio: 1.3,
    boxAreaMultiplier: 1.08,
    markupRate: 0.1,
    ladders: [
      { minQuantity: 10000, spoilageQuantity: 180, printingFee: 280, dieMoldFee: 120, gluingUnitPrice: 0.08, outerCartonUnitPrice: 0.33, processUnitPrice: 0.03 },
      { minQuantity: 5000, spoilageQuantity: 120, printingFee: 300, dieMoldFee: 140, gluingUnitPrice: 0.1, outerCartonUnitPrice: 0.4, processUnitPrice: 0.04 },
      { minQuantity: 2000, spoilageQuantity: 100, printingFee: 320, dieMoldFee: 160, gluingUnitPrice: 0.12, outerCartonUnitPrice: 0.65, processUnitPrice: 0.05 },
      { minQuantity: 500, spoilageQuantity: 80, printingFee: 360, dieMoldFee: 180, gluingUnitPrice: 0.18, outerCartonUnitPrice: 1.25, processUnitPrice: 0.07 },
      { minQuantity: 200, spoilageQuantity: 40, printingFee: 400, dieMoldFee: 200, gluingUnitPrice: 0.24, outerCartonUnitPrice: 2.25, processUnitPrice: 0.08 },
      { minQuantity: 0, spoilageQuantity: 10, printingFee: 420, dieMoldFee: 220, gluingUnitPrice: 0.3, outerCartonUnitPrice: 2.56, processUnitPrice: 0.1 },
    ],
  },
}

const TON_PRICE_BY_MATERIAL: Record<string, number> = {
  kraft: 3500,
  white_card: 3600,
  single_coated: 3000,
  double_coated: 3200,
  offset_paper: 2800,
  specialty_board: 4500,
  paper_sticker: 3200,
  laser_sticker: 5200,
  clear_sticker: 4800,
  corrugated_carton: 2600,
}

const STICKER_AREA_PRICE_BY_MATERIAL: Record<string, number> = {
  clear_sticker: 18,
  paper_sticker: 14,
  laser_sticker: 24,
  single_coated: 14,
  white_card: 15,
}

const FOIL_BAG_AREA_PRICE_BY_GAUGE: Record<number, number> = {
  6: 9.8,
  7: 10.6,
  8: 11.5,
  9: 12.2,
  10: 13,
}

const CORE_AREA_PRICE_BY_CODE: Record<string, number> = {
  WE: 0.75,
  W9: 0.7,
  A9: 0.78,
  AE: 0.82,
  AF: 0.8,
  E: 0.72,
  D9: 0.7,
  K9: 0.82,
}

const BLOCKING_TERMS = ['Q9', 'EVA', '磁吸', '天地盖', '灰板', '木盒', '金属', 'V槽']
const DEFERRED_SPECIAL_TERMS = ['逆向UV', '激凸', '击凸', '烫金', '烫银']
const SPECIAL_PROCESS_TERMS = ['局部UV', 'UV', '易撕线', '贴易撕线', '提手', '珍珠棉']
const FOIL_BAG_BLOCKING_TERMS = ['拉链', '自立', '吸嘴', '真空', '异形袋', '八边封']
const CARTON_BLOCKING_TERMS = ['蜂窝箱', '木箱', '托盘', '围板箱']
const GENERIC_LEAFLET_ESTIMATED_REASON = '说明书只识别到通用印刷信号，未细化到具体印色，先按 estimated 处理。'
const PROXY_INSERT_ESTIMATED_REASON = '内托已识别材质，但克重采用模板默认值，先按 estimated 处理。'
const NO_FILM_WINDOW_ESTIMATED_REASON = '开窗路径明确但明确不贴胶片，当前先按保守 window 边界 estimated。'
const PRINTED_FOIL_BAG_ESTIMATED_REASON = '铝箔袋存在定制印刷或打样信号，先按 estimated 处理。'
const PRINTED_CARTON_ESTIMATED_REASON = '纸箱包装包含印刷描述，先按保守 carton 模板 estimated。'

type HighFrequencyEstimatedUpgradeClass = 'generic_leaflet' | 'proxy_insert' | 'standard_no_film_window' | 'standard_printed_foil_bag' | 'standard_printed_carton'

function toCm(value: number | undefined, unit: 'mm' | 'cm' | undefined): number {
  if (!value) return 0
  return unit === 'mm' ? value / 10 : value
}

function getWorkbookTemplateRuntime(item: ComplexPackagingItem): TemplateRuntimeConfig | null {
  if (!(item.productType in TEMPLATE_BY_PRODUCT_TYPE)) {
    return null
  }

  return TEMPLATE_BY_PRODUCT_TYPE[item.productType as WorkbookSupportedProductType]
}

function normalizeText(item: ComplexPackagingItem): string {
  return (item.sourceText || [item.title, item.material, item.surfaceFinish, ...(item.processes || []), ...(item.notes || [])].filter(Boolean).join(' ')).trim()
}

function getMaterialLayers(item: ComplexPackagingItem, text: string): Array<{ material?: string; weight?: number }> {
  const layers: Array<{ material?: string; weight?: number }> = []

  if (item.outerMaterial || item.outerWeight || item.material || item.weight) {
    layers.push({
      material: item.outerMaterial || item.material,
      weight: item.outerWeight || item.weight,
    })
  }

  if (item.innerMaterial || item.innerWeight) {
    layers.push({
      material: item.innerMaterial,
      weight: item.innerWeight,
    })
  }

  if (layers.length > 0) {
    return layers.filter((layer) => layer.material || layer.weight)
  }

  const matches = Array.from(text.matchAll(/(\d+(?:\.\d+)?)\s*(?:克|g)?\s*(牛纸|牛皮纸|白卡纸|白卡|白板纸|白板|单铜|双铜|特种纸板|web特种纸板)/gi))
  return matches.map((match) => ({
    material: normalizeMaterialTerm(match[2]),
    weight: Number(match[1]),
  }))
}

function normalizeMaterialTerm(raw?: string): string | undefined {
  if (!raw) return undefined
  const lowered = raw.toLowerCase()
  if (lowered.includes('牛')) return 'kraft'
  if (lowered.includes('白卡') || lowered.includes('白板')) return 'white_card'
  if (lowered.includes('双胶')) return 'offset_paper'
  if (lowered.includes('单铜')) return 'single_coated'
  if (lowered.includes('双铜')) return 'double_coated'
  if (lowered.includes('镭射')) return 'laser_sticker'
  if (lowered.includes('纸贴')) return 'paper_sticker'
  if (lowered.includes('透明贴')) return 'clear_sticker'
  if (lowered.includes('特种')) return 'specialty_board'
  if (lowered.includes('透明贴纸')) return 'clear_sticker'
  if (lowered.includes('铝箔袋') || lowered.includes('铝铂袋')) return 'foil_bag'
  if (lowered.includes('空白箱') || /^k\d/.test(lowered)) return 'corrugated_carton'
  return undefined
}

function getPrimaryLayer(item: ComplexPackagingItem): { material?: string; weight?: number } {
  if (item.productType === 'leaflet_insert') {
    return {
      material: item.paperType || item.material,
      weight: item.paperWeight || item.weight,
    }
  }

  if (item.productType === 'box_insert') {
    return {
      material: item.insertMaterial || item.material,
      weight: item.weight,
    }
  }

  if (item.productType === 'seal_sticker') {
    return {
      material: item.stickerMaterial || item.material,
      weight: item.weight,
    }
  }

  if (item.productType === 'foil_bag' || item.productType === 'carton_packaging') {
    return {
      material: item.material,
      weight: item.weight,
    }
  }

  return {
    material: item.outerMaterial || item.material,
    weight: item.outerWeight || item.weight,
  }
}

function getDefaultAccessoryWeight(item: ComplexPackagingItem, material?: string): number | undefined {
  if (item.productType !== 'box_insert' || !material) {
    return undefined
  }

  switch (material) {
    case 'specialty_board':
      return 260
    case 'white_card':
      return 350
    case 'single_coated':
    case 'double_coated':
      return 300
    case 'kraft':
      return 350
    default:
      return undefined
  }
}

function hasExplicitNoPrint(text: string): boolean {
  return /无印刷|不印刷|不印|无印/i.test(text)
}

function hasPrintingSignal(item: ComplexPackagingItem, text: string): boolean {
  if (hasExplicitNoPrint(text)) {
    return false
  }

  if (item.printColor && item.printColor !== 'none') {
    return true
  }

  return /印|四色|专色|黑色|pantone/i.test(text)
}

function hasDieCutSignal(item: ComplexPackagingItem, text: string): boolean {
  return Boolean(item.dieCut || /啤|模切|半穿|刀模/i.test(text))
}

function hasGluingSignal(item: ComplexPackagingItem, text: string): boolean {
  return Boolean(item.gluing || /粘|贴合|驳接|糊盒/i.test(text))
}

function getCoreCode(item: ComplexPackagingItem, text: string): string | undefined {
  if (item.coreMaterialCode) {
    return item.coreMaterialCode.replace(/\+/g, '').toUpperCase()
  }

  const match = text.match(/(A\/?E|WE|W9\+?|A9\+?|AE|AF|E|D9\+?|K9\+?)/i)
  if (!match) return undefined
  return match[1].replace(/\+/g, '').replace('/', '').toUpperCase()
}

function getCoreWeight(item: ComplexPackagingItem, text: string): number | undefined {
  if (item.coreMaterialWeight) return item.coreMaterialWeight

  const explicit = text.match(/K9\+?\s*(\d+(?:\.\d+)?)\s*(?:克|g)/i)
  if (explicit) return Number(explicit[1])

  const generic = text.match(/(\d+(?:\.\d+)?)\s*(?:克|g)\s*(?:芯|加强芯)/i)
  if (!generic) return undefined
  return Number(generic[1])
}

function getWindowDimensions(item: ComplexPackagingItem): { length: number; width: number } | null {
  const length = toCm(item.windowSizeLength, item.sizeUnit)
  const width = toCm(item.windowSizeWidth, item.sizeUnit)
  if (!length || !width) return null

  return { length, width }
}

function getBoxBlankAreaCm2(item: ComplexPackagingItem, runtime: TemplateRuntimeConfig): number {
  const length = toCm(item.length, item.sizeUnit)
  const width = toCm(item.width, item.sizeUnit)
  const height = toCm(item.height, item.sizeUnit)

  if (!length || !width) return 0
  if (!height) return round2(Math.max(length * width * runtime.boxAreaMultiplier, length * width))

  const surfaceArea = 2 * (length * width + length * height + width * height)
  return round2(surfaceArea * runtime.boxAreaMultiplier)
}

function deriveTuckEndFlatDimensions(item: ComplexPackagingItem): FlatDimensions | null {
  const length = toCm(item.length, item.sizeUnit)
  const width = toCm(item.width, item.sizeUnit)
  const height = toCm(item.height, item.sizeUnit)
  if (!length || !width || !height) {
    return null
  }

  return {
    length: round2(2 * length + 2 * height + 2),
    width: round2(width + 2 * height + 1),
  }
}

function deriveMailerFlatDimensions(item: ComplexPackagingItem): FlatDimensions | null {
  const length = toCm(item.length, item.sizeUnit)
  const width = toCm(item.width, item.sizeUnit)
  const height = toCm(item.height, item.sizeUnit)
  if (!length || !width || !height) {
    return null
  }

  const shortSide = Math.min(length, width)
  const longSide = Math.max(length, width)
  const hasCore = Boolean(item.coreMaterialCode)
  const hasDualLiner = Boolean(item.innerMaterial)

  let lengthAllowance = 4
  let widthAllowance = 2.5

  if (hasCore && hasDualLiner) {
    lengthAllowance = 2.5
    widthAllowance = 1
  } else if (hasCore) {
    lengthAllowance = 1.2
    widthAllowance = 3.2
  }

  return {
    length: round2(2 * shortSide + 3 * height + lengthAllowance),
    width: round2(longSide + 4 * height + widthAllowance),
  }
}

function getLeafletFlatDimensions(item: ComplexPackagingItem): { length: number; width: number } | null {
  const explicitLength = toCm(item.flatLength, item.sizeUnit)
  const explicitWidth = toCm(item.flatWidth, item.sizeUnit)
  if (explicitLength && explicitWidth) {
    return { length: explicitLength, width: explicitWidth }
  }

  const length = toCm(item.length, item.sizeUnit)
  const width = toCm(item.width, item.sizeUnit)
  if (!length || !width) return null

  if ((item.foldCount || 0) > 1) {
    return length >= width
      ? { length, width: round2(width * (item.foldCount || 1)) }
      : { length: round2(length * (item.foldCount || 1)), width }
  }

  return { length, width }
}

function getAccessoryFlatDimensions(item: ComplexPackagingItem, runtime: TemplateRuntimeConfig): { length: number; width: number } | null {
  const explicitLength = toCm(item.flatLength, item.sizeUnit)
  const explicitWidth = toCm(item.flatWidth, item.sizeUnit)
  if (explicitLength && explicitWidth) {
    return { length: explicitLength, width: explicitWidth }
  }

  if (item.productType === 'leaflet_insert') {
    return getLeafletFlatDimensions(item)
  }

  if (item.productType === 'box_insert') {
    const length = toCm(item.insertLength || item.length, item.sizeUnit)
    const width = toCm(item.insertWidth || item.width, item.sizeUnit)
    if (!length || !width) return null

    const area = length * width * runtime.boxAreaMultiplier
    const derivedWidth = Math.sqrt(area / runtime.derivedAspectRatio)
    const derivedLength = area / derivedWidth
    return {
      length: round2(derivedLength),
      width: round2(derivedWidth),
    }
  }

  if (item.productType === 'seal_sticker') {
    const length = toCm(item.stickerLength || item.length, item.sizeUnit)
    const width = toCm(item.stickerWidth || item.width, item.sizeUnit)
    if (!length || !width) return null
    return { length, width }
  }

  if (item.productType === 'foil_bag') {
    const length = toCm(item.length, item.sizeUnit)
    const width = toCm(item.width, item.sizeUnit)
    if (!length || !width) return null
    return { length, width }
  }

  return null
}

function getFlatDimensions(item: ComplexPackagingItem, runtime: TemplateRuntimeConfig): { length: number; width: number } | null {
  if (runtime.productType === 'leaflet_insert' || runtime.productType === 'box_insert' || runtime.productType === 'seal_sticker' || runtime.productType === 'foil_bag') {
    return getAccessoryFlatDimensions(item, runtime)
  }

  const explicitLength = toCm(item.flatLength, item.sizeUnit)
  const explicitWidth = toCm(item.flatWidth, item.sizeUnit)
  if (explicitLength && explicitWidth) {
    return { length: explicitLength, width: explicitWidth }
  }

  if (runtime.productType === 'tuck_end_box') {
    const structural = deriveTuckEndFlatDimensions(item)
    if (structural) {
      return structural
    }
  }

  if (runtime.productType === 'mailer_box') {
    const structural = deriveMailerFlatDimensions(item)
    if (structural) {
      return structural
    }
  }

  const area = getBoxBlankAreaCm2(item, runtime)
  if (!area) return null
  const width = Math.sqrt(area / runtime.derivedAspectRatio)
  const length = area / width

  return {
    length: round2(length),
    width: round2(width),
  }
}

function getImpositionCount(runtime: TemplateRuntimeConfig, flatLength: number, flatWidth: number): number {
  if (!runtime.pressSheets || runtime.pressSheets.length === 0) {
    return 1
  }

  const counts = runtime.pressSheets.flatMap((sheet) => {
    const normal = Math.floor(sheet.length / flatLength) * Math.floor(sheet.width / flatWidth)
    const rotated = Math.floor(sheet.length / flatWidth) * Math.floor(sheet.width / flatLength)
    return [normal, rotated]
  })

  return Math.max(1, ...counts)
}

function getLadder(runtime: TemplateRuntimeConfig, actualQuantity: number): QuantityLadderConfig {
  return runtime.ladders.find((entry) => actualQuantity >= entry.minQuantity) || runtime.ladders[runtime.ladders.length - 1]
}

function getTaxMultiplier(text: string): number {
  return /含税|开票/i.test(text) ? 1.08 : 1
}

function getLaminationSideCount(text: string, item: ComplexPackagingItem): number {
  const normalized = text.toLowerCase()
  const explicitFrontBack = (normalized.match(/正面过哑胶|正面过光胶|反面过哑胶|反面过光胶/g) || []).length
  if (explicitFrontBack >= 2) return 2
  const repeatedMentions = (normalized.match(/过哑胶|过光胶|哑膜|光膜/g) || []).length
  if (repeatedMentions >= 2) return 2
  if (normalized.includes('正反') && (normalized.includes('哑胶') || normalized.includes('光胶') || normalized.includes('uv'))) return 2
  if (item.printColor === 'double_four_color') return 2
  return 1
}

function getPrintingPassLabel(item: ComplexPackagingItem, text: string): string {
  const normalized = text.toLowerCase()
  const spotCount = Math.max(item.spotColorCount || 0, item.pantoneCodes?.length || 0)
  if (normalized.includes('正反四色') || normalized.includes('双面四色')) {
    return spotCount > 0 ? `正反四色+${spotCount}专色` : '正反四色'
  }
  if ((normalized.includes('四色') || item.printColor === 'four_color') && spotCount > 0) {
    return `四色+${spotCount}专色`
  }
  if (item.printColor === 'black') return '黑色'
  if (item.printColor === 'spot') return `${Math.max(spotCount, 1)}专色`
  if (item.printColor === 'four_color') return '四色'
  return item.printColor || '默认印刷'
}

function getPrintingFeeMultiplier(item: ComplexPackagingItem, text: string): number {
  const normalized = text.toLowerCase()
  const spotCount = Math.max(item.spotColorCount || 0, item.pantoneCodes?.length || 0)

  if (normalized.includes('正反四色') || normalized.includes('双面四色') || item.printColor === 'double_four_color') {
    return round2(1.4 + spotCount * 0.12)
  }

  if (item.printColor === 'four_color') {
    return round2(1 + spotCount * 0.1)
  }

  if (item.printColor === 'four_color_spot') {
    return round2(1.12 + Math.max(spotCount, 1) * 0.1)
  }

  if (item.printColor === 'spot') {
    return round2(0.8 + Math.max(spotCount, 1) * 0.1)
  }

  if (item.printColor === 'black') {
    return normalized.includes('双面') ? 0.75 : 0.6
  }

  return 1
}

function getAccessoryPrintingFeeMultiplier(
  code: Extract<ComplexPackagingLineItemCode, 'leaflet_printing' | 'insert_printing' | 'sticker_printing'>,
  item: ComplexPackagingItem,
  text: string,
): number {
  const baseMultiplier = getPrintingFeeMultiplier(item, text)
  const normalized = text.toLowerCase()
  const spotCount = Math.max(item.spotColorCount || 0, item.pantoneCodes?.length || 0)

  if (code === 'leaflet_printing' && (normalized.includes('正反四色') || normalized.includes('双面四色') || item.printColor === 'double_four_color')) {
    return round2(1.12 + spotCount * 0.08)
  }

  if (code === 'leaflet_printing' && item.printColor === 'generic_print') {
    return normalized.includes('双面') ? 1 : 0.98
  }

  return baseMultiplier
}

function getLeafletSetupFee(context: PricingContext): number {
  const baseSetupFee = context.ladder.setupFee || 0
  if (baseSetupFee <= 0) {
    return 0
  }

  if (context.productType === 'leaflet_insert' && context.ladder.minQuantity === 5000) {
    return 10
  }

  return baseSetupFee
}

function getStructurePrintingMultiplier(context: PricingContext): number {
  if (context.productType !== 'mailer_box') {
    return 1
  }

  if (context.materialLayers.length > 1 && context.coreCode) {
    return 1.2
  }

  if (context.coreCode) {
    return 1.1
  }

  return 1
}

function getQuoteMarkupRate(context: PricingContext): number {
  if (context.productType === 'tuck_end_box') {
    return context.actualQuantity >= 1000 ? 0.2 : 0.16
  }

  if (context.productType === 'mailer_box') {
    if (context.materialLayers.length > 1 && context.coreCode) {
      return 0.22
    }

    return 0.15
  }

  if (context.productType === 'window_box') {
    return /不贴胶片|无胶片/i.test(context.surfaceText) ? 0.08 : context.templateRuntime.markupRate
  }

  return context.templateRuntime.markupRate
}

function extractFoilBagGauge(text: string): number | undefined {
  const match = text.match(/(\d+(?:\.\d+)?)\s*丝/i)
  if (!match) return undefined
  const gauge = Number(match[1])
  return Number.isFinite(gauge) ? gauge : undefined
}

function getFoilBagAreaUnitPrice(gauge?: number): number {
  if (!gauge) return FOIL_BAG_AREA_PRICE_BY_GAUGE[8]
  return FOIL_BAG_AREA_PRICE_BY_GAUGE[gauge] || round2(FOIL_BAG_AREA_PRICE_BY_GAUGE[8] + Math.max(gauge - 8, 0) * 0.8)
}

function getCartonSizeMultiplier(item: ComplexPackagingItem): number {
  const length = toCm(item.length, item.sizeUnit)
  const width = toCm(item.width, item.sizeUnit)
  const height = toCm(item.height, item.sizeUnit)
  if (!length || !width || !height) {
    return 1
  }

  const volume = length * width * height
  return round2(Math.min(1.6, Math.max(0.75, Math.cbrt(volume / 25000))))
}

function getCartonMaterialMultiplier(text: string): number {
  if (/k\d+[a-z]?\d*k/i.test(text)) {
    return 1.05
  }

  if (/空白箱|无印/i.test(text)) {
    return 1
  }

  return 1.02
}

function getBlockingReasons(item: ComplexPackagingItem, text: string): string[] {
  const reasons: string[] = []
  const normalized = text.toUpperCase()
  const explicitNoWindowFilm = /不贴胶片|无胶片/i.test(text)

  for (const term of BLOCKING_TERMS) {
    if (normalized.includes(term.toUpperCase())) {
      reasons.push(`存在当前未进入首批模板的关键术语：${term}`)
    }
  }

  if (item.productType === 'window_box' && /胶片|APET/i.test(text) && !explicitNoWindowFilm) {
    if (!item.windowFilmThickness || !item.windowSizeLength || !item.windowSizeWidth) {
      reasons.push('开窗彩盒缺少胶片厚度或窗位尺寸，关键 line-item 无法稳定计算。')
    }
  }

  const coreMatch = normalized.match(/\b([A-Z](?:\/[A-Z]|\d\+?)|WE|AE|AF)\b(?=\s*(?:坑|芯|加强芯))/)
  if (coreMatch) {
    const coreCode = getCoreCode(item, text)
    if (!coreCode || !CORE_AREA_PRICE_BY_CODE[coreCode]) {
      reasons.push(`未识别的坑型/芯材代号：${coreMatch[1]}`)
    }
  }

  for (const term of DEFERRED_SPECIAL_TERMS) {
    if (normalized.includes(term.toUpperCase())) {
      reasons.push(`存在高复杂特殊工艺：${term}`)
    }
  }

  if (item.productType === 'foil_bag') {
    for (const term of FOIL_BAG_BLOCKING_TERMS) {
      if (text.includes(term)) {
        reasons.push(`铝箔袋存在当前未进入 2.5 模板的袋型要素：${term}`)
      }
    }
  }

  if (item.productType === 'carton_packaging') {
    for (const term of CARTON_BLOCKING_TERMS) {
      if (text.includes(term)) {
        reasons.push(`纸箱包装存在当前未进入 2.5 模板的结构要素：${term}`)
      }
    }
  }

  return reasons
}

function getEstimatedReasons(item: ComplexPackagingItem, text: string): string[] {
  const reasons: string[] = []
  const normalized = text.toUpperCase()
  const primaryLayer = getPrimaryLayer(item)

  if (item.productType === 'mailer_box' && /裱/i.test(text) && /(裱坑|坑|加强芯)/i.test(text) && !getCoreCode(item, text) && getMaterialLayers(item, text).length < 2) {
    reasons.push('飞机盒提到裱纸/加强路径，但材料层拆分不完整，先按保守模板 estimated。')
  }

  if (item.productType === 'window_box' && /不贴胶片|无胶片/i.test(text)) {
    reasons.push(NO_FILM_WINDOW_ESTIMATED_REASON)
  }

  if (item.productType === 'leaflet_insert' && item.printColor === 'generic_print') {
    reasons.push(GENERIC_LEAFLET_ESTIMATED_REASON)
  }

  if (item.productType === 'box_insert' && primaryLayer.material && !primaryLayer.weight) {
    reasons.push(PROXY_INSERT_ESTIMATED_REASON)
  }

  if (item.productType === 'foil_bag') {
    if (!extractFoilBagGauge(text)) {
      reasons.push('铝箔袋袋材厚度未明确，先按常见 8 丝空白袋保守 estimated。')
    }

    if (hasPrintingSignal(item, text) && !hasExplicitNoPrint(text)) {
      reasons.push(PRINTED_FOIL_BAG_ESTIMATED_REASON)
    }
  }

  if (item.productType === 'carton_packaging') {
    const simpleCarton = /纸箱\+包装费|大外箱|空白箱|外箱/i.test(text)
    if (!simpleCarton && !item.material) {
      reasons.push('纸箱包装未明确落到外箱/空白箱基础路径，先按 estimated 处理。')
    }

    if (hasPrintingSignal(item, text) && !hasExplicitNoPrint(text)) {
      reasons.push(PRINTED_CARTON_ESTIMATED_REASON)
    }
  }

  if (SPECIAL_PROCESS_TERMS.some((term) => normalized.includes(term.toUpperCase())) && !/易撕线|局部UV|UV|提手|珍珠棉/i.test(text)) {
    reasons.push('存在额外工艺描述，但费率模板尚未完全覆盖，先按 estimated 处理。')
  }

  return reasons
}

function hasHighFrequencyGenericLeafletQuotedCandidate(item: ComplexPackagingItem, text: string): boolean {
  return item.productType === 'leaflet_insert'
    && item.printColor === 'generic_print'
    && Boolean(item.length && item.width)
    && Boolean(item.paperType || item.material)
    && Boolean(item.weight)
    && hasPrintingSignal(item, text)
    && !hasExplicitNoPrint(text)
}

function hasHighFrequencyProxyInsertQuotedCandidate(item: ComplexPackagingItem): boolean {
  const material = item.insertMaterial || item.material
  return item.productType === 'box_insert'
    && !item.weight
    && Boolean(item.insertLength || item.length)
    && Boolean(item.insertWidth || item.width)
    && Boolean(material)
    && Boolean(getDefaultAccessoryWeight(item, material))
}

function hasHighFrequencyStandardNoFilmWindowQuotedCandidate(item: ComplexPackagingItem, text: string): boolean {
  const primaryLayer = getPrimaryLayer(item)
  const spotCount = Math.max(item.spotColorCount || 0, item.pantoneCodes?.length || 0)

  return item.productType === 'window_box'
    && /不贴胶片|无胶片/i.test(text)
    && item.laminationType === 'glossy'
    && Boolean(item.length && item.width && item.height)
    && Boolean(primaryLayer.weight)
    && ['white_card', 'single_coated'].includes(primaryLayer.material || '')
    && hasPrintingSignal(item, text)
    && !hasExplicitNoPrint(text)
    && spotCount === 0
    && !item.mounting
    && !/裱/i.test(text)
    && !SPECIAL_PROCESS_TERMS.some((term) => text.toUpperCase().includes(term.toUpperCase()))
    && !DEFERRED_SPECIAL_TERMS.some((term) => text.toUpperCase().includes(term.toUpperCase()))
}

function hasHighFrequencyStandardPrintedFoilBagQuotedCandidate(item: ComplexPackagingItem, text: string): boolean {
  const gauge = extractFoilBagGauge(text)
  const spotCount = Math.max(item.spotColorCount || 0, item.pantoneCodes?.length || 0)
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
    && !SPECIAL_PROCESS_TERMS.some((term) => normalized.includes(term.toUpperCase()))
    && !DEFERRED_SPECIAL_TERMS.some((term) => normalized.includes(term.toUpperCase()))
}

function hasHighFrequencyStandardPrintedCartonQuotedCandidate(item: ComplexPackagingItem, text: string): boolean {
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
    && !SPECIAL_PROCESS_TERMS.some((term) => normalized.includes(term.toUpperCase()))
    && !DEFERRED_SPECIAL_TERMS.some((term) => normalized.includes(term.toUpperCase()))
}

function getHighFrequencyEstimatedUpgradeClass(
  item: ComplexPackagingItem,
  text: string,
  estimatedReasons: string[],
): HighFrequencyEstimatedUpgradeClass | undefined {
  if (
    hasHighFrequencyGenericLeafletQuotedCandidate(item, text)
    && estimatedReasons.length > 0
    && estimatedReasons.every((reason) => reason === GENERIC_LEAFLET_ESTIMATED_REASON)
  ) {
    return 'generic_leaflet'
  }

  if (
    hasHighFrequencyProxyInsertQuotedCandidate(item)
    && estimatedReasons.length > 0
    && estimatedReasons.every((reason) => reason === PROXY_INSERT_ESTIMATED_REASON)
  ) {
    return 'proxy_insert'
  }

  if (
    hasHighFrequencyStandardNoFilmWindowQuotedCandidate(item, text)
    && estimatedReasons.length > 0
    && estimatedReasons.every((reason) => reason === NO_FILM_WINDOW_ESTIMATED_REASON)
  ) {
    return 'standard_no_film_window'
  }

  if (
    hasHighFrequencyStandardPrintedFoilBagQuotedCandidate(item, text)
    && estimatedReasons.length > 0
    && estimatedReasons.every((reason) => reason === PRINTED_FOIL_BAG_ESTIMATED_REASON)
  ) {
    return 'standard_printed_foil_bag'
  }

  if (
    hasHighFrequencyStandardPrintedCartonQuotedCandidate(item, text)
    && estimatedReasons.length > 0
    && estimatedReasons.every((reason) => reason === PRINTED_CARTON_ESTIMATED_REASON)
  ) {
    return 'standard_printed_carton'
  }

  return undefined
}

function createTonPriceLineItem(input: {
  code: ComplexPackagingLineItemCode
  displayName: string
  actualQuantity: number
  chargeQuantity: number
  spoilageQuantity: number
  basisWeight: number
  flatLength: number
  flatWidth: number
  tonPrice: number
  requiredForQuoted: boolean
  notes?: string[]
}): ComplexPackagingPriceLineItem {
  const amount = round2(input.basisWeight * input.flatLength * input.flatWidth * input.tonPrice * input.chargeQuantity / 10000000000)

  return {
    code: input.code,
    displayName: input.displayName,
    lineItemType: 'ton_price_material',
    formulaTemplateId: 'ton_price_material',
    amount,
    unitPrice: input.actualQuantity > 0 ? round2(amount / input.actualQuantity) : 0,
    actualQuantity: input.actualQuantity,
    chargeQuantity: input.chargeQuantity,
    spoilageQuantity: input.spoilageQuantity,
    basisWeight: input.basisWeight,
    flatLength: input.flatLength,
    flatWidth: input.flatWidth,
    tonPrice: input.tonPrice,
    notes: input.notes || [],
    requiredForQuoted: input.requiredForQuoted,
  }
}

function createAreaLineItem(input: {
  code: ComplexPackagingLineItemCode
  displayName: string
  actualQuantity: number
  chargeQuantity: number
  spoilageQuantity: number
  basisFactor: number
  flatLength: number
  flatWidth: number
  areaUnitPrice: number
  requiredForQuoted: boolean
  notes?: string[]
}): ComplexPackagingPriceLineItem {
  const amount = round2(input.basisFactor * (input.flatLength / 2.54) * (input.flatWidth / 2.54) * input.areaUnitPrice * input.chargeQuantity / 1000)

  return {
    code: input.code,
    displayName: input.displayName,
    lineItemType: 'area_based_material',
    formulaTemplateId: 'area_based_material',
    amount,
    unitPrice: input.actualQuantity > 0 ? round2(amount / input.actualQuantity) : 0,
    actualQuantity: input.actualQuantity,
    chargeQuantity: input.chargeQuantity,
    spoilageQuantity: input.spoilageQuantity,
    basisFactor: input.basisFactor,
    flatLength: input.flatLength,
    flatWidth: input.flatWidth,
    areaUnitPrice: input.areaUnitPrice,
    notes: input.notes || [],
    requiredForQuoted: input.requiredForQuoted,
  }
}

function createFixedLineItem(input: {
  code: ComplexPackagingLineItemCode
  displayName: string
  actualQuantity: number
  fixedAmount: number
  requiredForQuoted: boolean
  notes?: string[]
}): ComplexPackagingPriceLineItem {
  return {
    code: input.code,
    displayName: input.displayName,
    lineItemType: 'fixed_fee',
    formulaTemplateId: 'fixed_fee',
    amount: round2(input.fixedAmount),
    unitPrice: input.actualQuantity > 0 ? round2(input.fixedAmount / input.actualQuantity) : 0,
    actualQuantity: input.actualQuantity,
    chargeQuantity: input.actualQuantity,
    spoilageQuantity: 0,
    fixedAmount: round2(input.fixedAmount),
    notes: input.notes || [],
    requiredForQuoted: input.requiredForQuoted,
  }
}

function createQuantityLineItem(input: {
  code: ComplexPackagingLineItemCode
  displayName: string
  actualQuantity: number
  chargeQuantity: number
  spoilageQuantity: number
  unitPrice: number
  requiredForQuoted: boolean
  notes?: string[]
}): ComplexPackagingPriceLineItem {
  const amount = round2(input.unitPrice * input.chargeQuantity)

  return {
    code: input.code,
    displayName: input.displayName,
    lineItemType: 'quantity_based_process',
    formulaTemplateId: 'quantity_based_process',
    amount,
    unitPrice: input.actualQuantity > 0 ? round2(amount / input.actualQuantity) : 0,
    formulaUnitPrice: input.unitPrice,
    actualQuantity: input.actualQuantity,
    chargeQuantity: input.chargeQuantity,
    spoilageQuantity: input.spoilageQuantity,
    notes: input.notes || [],
    requiredForQuoted: input.requiredForQuoted,
  }
}

function buildPricingContext(item: ComplexPackagingItem): PricingContext | null {
  const runtime = getWorkbookTemplateRuntime(item)
  if (!runtime) return null

  const actualQuantity = item.quantity || 0
  const text = normalizeText(item)
  const flat = getFlatDimensions(item, runtime)
  if (!actualQuantity || !flat) return null

  const ladder = getLadder(runtime, actualQuantity)
  const impositionCount = runtime.chargeMode === 'sheet_count' ? getImpositionCount(runtime, flat.length, flat.width) : 1
  const chargeQuantity = runtime.chargeMode === 'sheet_count'
    ? Math.ceil(actualQuantity / impositionCount) + ladder.spoilageQuantity
    : actualQuantity + ladder.spoilageQuantity

  return {
    templateId: runtime.templateId,
    productType: runtime.productType,
    templateRuntime: runtime,
    actualQuantity,
    flatLength: flat.length,
    flatWidth: flat.width,
    chargeMode: runtime.chargeMode,
    impositionCount,
    chargeQuantity,
    spoilageQuantity: ladder.spoilageQuantity,
    ladder,
    materialLayers: getMaterialLayers(item, text),
    coreCode: getCoreCode(item, text),
    coreWeight: getCoreWeight(item, text),
    surfaceText: text,
    printPassLabel: getPrintingPassLabel(item, text),
    windowLength: getWindowDimensions(item)?.length,
    windowWidth: getWindowDimensions(item)?.width,
    windowThickness: item.windowFilmThickness,
    taxMultiplier: getTaxMultiplier(text),
  }
}

function createAccessoryPrintingLine(
  code: Extract<ComplexPackagingLineItemCode, 'leaflet_printing' | 'insert_printing' | 'sticker_printing'>,
  displayName: string,
  item: ComplexPackagingItem,
  context: PricingContext,
  requiredForQuoted: boolean,
): ComplexPackagingPriceLineItem | null {
  const printSignal = hasPrintingSignal(item, context.surfaceText)
  if (!printSignal && !hasExplicitNoPrint(context.surfaceText)) {
    return null
  }

  return createFixedLineItem({
    code,
    displayName,
    actualQuantity: context.actualQuantity,
    fixedAmount: printSignal ? round2(context.ladder.printingFee * getAccessoryPrintingFeeMultiplier(code, item, context.surfaceText)) : 0,
    requiredForQuoted,
    notes: [printSignal ? '按印刷固定费计。' : '显式无印刷，印刷费记为 0。'],
  })
}

function buildLeafletLineItems(item: ComplexPackagingItem, context: PricingContext): ComplexPackagingPriceLineItem[] {
  const lineItems: ComplexPackagingPriceLineItem[] = []
  const primaryLayer = getPrimaryLayer(item)
  const tonPrice = TON_PRICE_BY_MATERIAL[primaryLayer.material || 'double_coated'] || TON_PRICE_BY_MATERIAL.double_coated
  const hasExplicitTrim = hasDieCutSignal(item, context.surfaceText)
  const leafletSetupFee = getLeafletSetupFee(context)

  if (primaryLayer.weight) {
    lineItems.push(createTonPriceLineItem({
      code: 'leaflet_paper',
      displayName: '纸材',
      actualQuantity: context.actualQuantity,
      chargeQuantity: context.chargeQuantity,
      spoilageQuantity: context.spoilageQuantity,
      basisWeight: primaryLayer.weight,
      flatLength: context.flatLength,
      flatWidth: context.flatWidth,
      tonPrice,
      requiredForQuoted: true,
      notes: [`${primaryLayer.weight}g ${primaryLayer.material || '说明书纸材'} 按吨价公式计。`],
    }))
  }

  const printingLine = createAccessoryPrintingLine('leaflet_printing', '印刷费', item, context, true)
  if (printingLine) {
    lineItems.push(printingLine)
  }

  if (leafletSetupFee > 0) {
    lineItems.push(createFixedLineItem({
      code: 'leaflet_setup',
      displayName: '固定开机费',
      actualQuantity: context.actualQuantity,
      fixedAmount: leafletSetupFee,
      requiredForQuoted: false,
      notes: [
        context.ladder.minQuantity === 5000
          ? '说明书 5000 档开机费已按更保守的 fixed-fee 摊销收窄。'
          : '说明书开机费按固定费用计。',
      ],
    }))
  }

  if ((item.foldCount || 0) > 0 && (context.ladder.foldingUnitPrice || 0) > 0) {
    lineItems.push(createQuantityLineItem({
      code: 'leaflet_folding',
      displayName: '折页/折工',
      actualQuantity: context.actualQuantity,
      chargeQuantity: context.chargeQuantity,
      spoilageQuantity: context.spoilageQuantity,
      unitPrice: round2((context.ladder.foldingUnitPrice || 0) * Math.max(item.foldCount || 1, 1)),
      requiredForQuoted: false,
      notes: [`按 ${item.foldCount} 折折页工计。`],
    }))
  }

  if (hasExplicitTrim && (context.ladder.trimUnitPrice || 0) > 0) {
    lineItems.push(createQuantityLineItem({
      code: 'leaflet_die_cut',
      displayName: '裁切/刀模',
      actualQuantity: context.actualQuantity,
      chargeQuantity: context.chargeQuantity,
      spoilageQuantity: context.spoilageQuantity,
      unitPrice: context.ladder.trimUnitPrice || 0,
      requiredForQuoted: false,
      notes: ['说明书裁切按数量型工序计。'],
    }))
  }

  if (/运费|包邮|含运/i.test(context.surfaceText)) {
    lineItems.push(createFixedLineItem({
      code: 'shipping',
      displayName: '运费',
      actualQuantity: context.actualQuantity,
      fixedAmount: 40,
      requiredForQuoted: false,
      notes: ['说明书运费按固定费用计。'],
    }))
  }

  return lineItems
}

function buildInsertLineItems(item: ComplexPackagingItem, context: PricingContext): ComplexPackagingPriceLineItem[] {
  const lineItems: ComplexPackagingPriceLineItem[] = []
  const primaryLayer = getPrimaryLayer(item)
  const tonPrice = TON_PRICE_BY_MATERIAL[primaryLayer.material || 'white_card'] || TON_PRICE_BY_MATERIAL.white_card
  const basisWeight = primaryLayer.weight || getDefaultAccessoryWeight(item, primaryLayer.material)

  if (basisWeight) {
    lineItems.push(createTonPriceLineItem({
      code: 'insert_material',
      displayName: '主纸材/托材',
      actualQuantity: context.actualQuantity,
      chargeQuantity: context.chargeQuantity,
      spoilageQuantity: context.spoilageQuantity,
      basisWeight,
      flatLength: context.flatLength,
      flatWidth: context.flatWidth,
      tonPrice,
      requiredForQuoted: true,
      notes: [
        primaryLayer.weight
          ? `${primaryLayer.weight}g ${primaryLayer.material || '内托材质'} 按吨价公式计。`
          : `${basisWeight}g ${primaryLayer.material || '内托材质'} 按模板默认克重估算。`,
      ],
    }))
  }

  const printingLine = createAccessoryPrintingLine('insert_printing', '印刷费', item, context, false)
  if (printingLine) {
    lineItems.push(printingLine)
  }

  if ((item.mounting || /裱|对裱/i.test(context.surfaceText)) && basisWeight) {
    lineItems.push(createAreaLineItem({
      code: 'mounting',
      displayName: '贴合/对裱',
      actualQuantity: context.actualQuantity,
      chargeQuantity: context.chargeQuantity,
      spoilageQuantity: context.spoilageQuantity,
      basisFactor: 1,
      flatLength: context.flatLength,
      flatWidth: context.flatWidth,
      areaUnitPrice: 0.2,
      requiredForQuoted: false,
      notes: ['内托贴合按面积型工艺计。'],
    }))
  }

  if ((context.ladder.dieMoldFee || 0) > 0) {
    lineItems.push(createFixedLineItem({
      code: 'insert_die_mold',
      displayName: '刀模',
      actualQuantity: context.actualQuantity,
      fixedAmount: context.ladder.dieMoldFee || 0,
      requiredForQuoted: true,
      notes: ['内托刀模按固定费用计。'],
    }))
  }

  if ((context.ladder.dieCutUnitPrice || 0) > 0) {
    lineItems.push(createQuantityLineItem({
      code: 'insert_forming',
      displayName: '啤机/成型',
      actualQuantity: context.actualQuantity,
      chargeQuantity: context.chargeQuantity,
      spoilageQuantity: context.spoilageQuantity,
      unitPrice: context.ladder.dieCutUnitPrice || 0,
      requiredForQuoted: true,
      notes: ['内托啤机/成型按数量型工序计。'],
    }))
  }

  if (hasGluingSignal(item, context.surfaceText) && (context.ladder.gluingUnitPrice || 0) > 0) {
    lineItems.push(createQuantityLineItem({
      code: 'insert_gluing',
      displayName: '粘位/贴合',
      actualQuantity: context.actualQuantity,
      chargeQuantity: context.chargeQuantity,
      spoilageQuantity: context.spoilageQuantity,
      unitPrice: context.ladder.gluingUnitPrice || 0,
      requiredForQuoted: false,
      notes: ['内托贴合/粘位按数量型工序计。'],
    }))
  }

  if (/运费|包邮|含运/i.test(context.surfaceText)) {
    lineItems.push(createFixedLineItem({
      code: 'shipping',
      displayName: '运费',
      actualQuantity: context.actualQuantity,
      fixedAmount: 50,
      requiredForQuoted: false,
      notes: ['内托运费按固定费用计。'],
    }))
  }

  return lineItems
}

function buildStickerLineItems(item: ComplexPackagingItem, context: PricingContext): ComplexPackagingPriceLineItem[] {
  const lineItems: ComplexPackagingPriceLineItem[] = []
  const primaryLayer = getPrimaryLayer(item)
  const areaUnitPrice = STICKER_AREA_PRICE_BY_MATERIAL[primaryLayer.material || 'clear_sticker'] || STICKER_AREA_PRICE_BY_MATERIAL.clear_sticker

  lineItems.push(createAreaLineItem({
    code: 'sticker_material',
    displayName: '面材',
    actualQuantity: context.actualQuantity,
    chargeQuantity: context.chargeQuantity,
    spoilageQuantity: context.spoilageQuantity,
    basisFactor: 1,
    flatLength: context.flatLength,
    flatWidth: context.flatWidth,
    areaUnitPrice,
    requiredForQuoted: true,
    notes: [`${primaryLayer.material || '贴纸面材'} 按面积型材料公式计。`],
  }))

  const printingLine = createAccessoryPrintingLine('sticker_printing', '印刷费', item, context, false)
  if (printingLine) {
    lineItems.push(printingLine)
  }

  if ((context.ladder.plateFee || 0) > 0 && (hasPrintingSignal(item, context.surfaceText) || hasDieCutSignal(item, context.surfaceText))) {
    lineItems.push(createFixedLineItem({
      code: 'sticker_plate',
      displayName: '版费/刀模费',
      actualQuantity: context.actualQuantity,
      fixedAmount: context.ladder.plateFee || 0,
      requiredForQuoted: false,
      notes: ['贴纸版费/刀模费按固定费用计。'],
    }))
  }

  if ((context.ladder.dieCutUnitPrice || 0) > 0) {
    lineItems.push(createQuantityLineItem({
      code: 'sticker_die_cut',
      displayName: '模切/半穿',
      actualQuantity: context.actualQuantity,
      chargeQuantity: context.chargeQuantity,
      spoilageQuantity: context.spoilageQuantity,
      unitPrice: context.ladder.dieCutUnitPrice || 0,
      requiredForQuoted: true,
      notes: ['封口贴模切/半穿按数量型工序计。'],
    }))
  }

  if ((context.ladder.processUnitPrice || 0) > 0) {
    lineItems.push(createQuantityLineItem({
      code: 'sticker_processing',
      displayName: '数量型加工费',
      actualQuantity: context.actualQuantity,
      chargeQuantity: context.chargeQuantity,
      spoilageQuantity: context.spoilageQuantity,
      unitPrice: context.ladder.processUnitPrice || 0,
      requiredForQuoted: true,
      notes: ['贴纸排废/加工按数量型工序计。'],
    }))
  }

  if (/运费|包邮|含运/i.test(context.surfaceText)) {
    lineItems.push(createFixedLineItem({
      code: 'shipping',
      displayName: '运费',
      actualQuantity: context.actualQuantity,
      fixedAmount: 30,
      requiredForQuoted: false,
      notes: ['贴纸运费按固定费用计。'],
    }))
  }

  return lineItems
}

function buildFoilBagLineItems(item: ComplexPackagingItem, context: PricingContext): ComplexPackagingPriceLineItem[] {
  const lineItems: ComplexPackagingPriceLineItem[] = []
  const gauge = extractFoilBagGauge(context.surfaceText)
  const hasCustomPrinting = hasPrintingSignal(item, context.surfaceText) && !hasExplicitNoPrint(context.surfaceText)
  const setupAmount = /打样|数码样/i.test(context.surfaceText)
    ? 300
    : hasCustomPrinting
      ? context.ladder.setupFee || 0
      : 0

  lineItems.push(createAreaLineItem({
    code: 'foil_bag_material',
    displayName: gauge ? `${gauge}丝袋材` : '袋材',
    actualQuantity: context.actualQuantity,
    chargeQuantity: context.chargeQuantity,
    spoilageQuantity: context.spoilageQuantity,
    basisFactor: 2,
    flatLength: context.flatLength,
    flatWidth: context.flatWidth,
    areaUnitPrice: getFoilBagAreaUnitPrice(gauge),
    requiredForQuoted: true,
    notes: [gauge ? `按 ${gauge} 丝双面袋材面积计。` : '按常见 8 丝双面袋材面积计。'],
  }))

  if (hasCustomPrinting) {
    lineItems.push(createFixedLineItem({
      code: 'foil_bag_printing',
      displayName: '袋面印刷费',
      actualQuantity: context.actualQuantity,
      fixedAmount: round2((context.ladder.printingFee || 0) * getPrintingFeeMultiplier(item, context.surfaceText)),
      requiredForQuoted: false,
      notes: ['铝箔袋定制印刷按固定印刷费计。'],
    }))
  }

  if (setupAmount > 0) {
    lineItems.push(createFixedLineItem({
      code: 'foil_bag_setup',
      displayName: /打样|数码样/i.test(context.surfaceText) ? '打样费' : '开机费',
      actualQuantity: context.actualQuantity,
      fixedAmount: round2(setupAmount),
      requiredForQuoted: false,
      notes: ['铝箔袋打样/开机费按固定费用计。'],
    }))
  }

  lineItems.push(createQuantityLineItem({
    code: 'foil_bag_forming',
    displayName: '制袋',
    actualQuantity: context.actualQuantity,
    chargeQuantity: context.chargeQuantity,
    spoilageQuantity: context.spoilageQuantity,
    unitPrice: context.ladder.processUnitPrice || 0,
    requiredForQuoted: true,
    notes: ['制袋按数量型工序计。'],
  }))

  return lineItems
}

function buildCartonPackagingLineItems(item: ComplexPackagingItem, context: PricingContext): ComplexPackagingPriceLineItem[] {
  const lineItems: ComplexPackagingPriceLineItem[] = []
  const hasCustomPrinting = hasPrintingSignal(item, context.surfaceText) && !hasExplicitNoPrint(context.surfaceText)
  const hasPackagingFee = /包装费|装箱费/i.test(context.surfaceText) && !/纸箱\+包装费/i.test(context.surfaceText)
  const baseUnitPrice = round2((context.ladder.outerCartonUnitPrice || 0) * getCartonSizeMultiplier(item) * getCartonMaterialMultiplier(context.surfaceText))

  lineItems.push(createQuantityLineItem({
    code: 'outer_carton',
    displayName: /纸箱\+包装费/i.test(context.surfaceText) ? '纸箱+包装费' : '纸箱/大外箱',
    actualQuantity: context.actualQuantity,
    chargeQuantity: context.chargeQuantity,
    spoilageQuantity: context.spoilageQuantity,
    unitPrice: baseUnitPrice,
    requiredForQuoted: true,
    notes: ['纸箱基价按尺寸体积、数量阶梯和外箱材质信号计。'],
  }))

  if (hasCustomPrinting) {
    lineItems.push(createFixedLineItem({
      code: 'carton_printing',
      displayName: '外箱印刷费',
      actualQuantity: context.actualQuantity,
      fixedAmount: round2((context.ladder.printingFee || 0) * getPrintingFeeMultiplier(item, context.surfaceText)),
      requiredForQuoted: false,
      notes: ['外箱印刷按固定印刷费计。'],
    }))
  }

  if ((hasCustomPrinting || hasDieCutSignal(item, context.surfaceText)) && (context.ladder.dieMoldFee || 0) > 0) {
    lineItems.push(createFixedLineItem({
      code: 'carton_die_mold',
      displayName: '外箱刀模',
      actualQuantity: context.actualQuantity,
      fixedAmount: context.ladder.dieMoldFee || 0,
      requiredForQuoted: false,
      notes: ['外箱刀模按固定费用计。'],
    }))
  }

  if (hasGluingSignal(item, context.surfaceText) && (context.ladder.gluingUnitPrice || 0) > 0) {
    lineItems.push(createQuantityLineItem({
      code: 'carton_forming',
      displayName: '成箱/粘箱',
      actualQuantity: context.actualQuantity,
      chargeQuantity: context.actualQuantity,
      spoilageQuantity: 0,
      unitPrice: context.ladder.gluingUnitPrice || 0,
      requiredForQuoted: false,
      notes: ['外箱成箱/粘箱按数量型工序计。'],
    }))
  }

  if (hasPackagingFee && (context.ladder.processUnitPrice || 0) > 0) {
    lineItems.push(createQuantityLineItem({
      code: 'carton_packaging_fee',
      displayName: '包装费',
      actualQuantity: context.actualQuantity,
      chargeQuantity: context.actualQuantity,
      spoilageQuantity: 0,
      unitPrice: context.ladder.processUnitPrice || 0,
      requiredForQuoted: false,
      notes: ['包装费按数量型工序计。'],
    }))
  }

  return lineItems
}

function buildTargetLineItems(item: ComplexPackagingItem, context: PricingContext): ComplexPackagingPriceLineItem[] {
  if (context.productType === 'leaflet_insert') {
    return buildLeafletLineItems(item, context)
  }

  if (context.productType === 'box_insert') {
    return buildInsertLineItems(item, context)
  }

  if (context.productType === 'seal_sticker') {
    return buildStickerLineItems(item, context)
  }

  if (context.productType === 'foil_bag') {
    return buildFoilBagLineItems(item, context)
  }

  if (context.productType === 'carton_packaging') {
    return buildCartonPackagingLineItems(item, context)
  }

  const lineItems: ComplexPackagingPriceLineItem[] = []
  const primaryLayer = context.materialLayers[0] || getPrimaryLayer(item)
  const secondaryLayer = context.materialLayers[1]
  const tonPrice = TON_PRICE_BY_MATERIAL[primaryLayer.material || 'white_card'] || TON_PRICE_BY_MATERIAL.white_card
  const printFeeMultiplier = round2(getPrintingFeeMultiplier(item, context.surfaceText) * getStructurePrintingMultiplier(context))
  const explicitNoWindowFilm = context.productType === 'window_box' && /不贴胶片|无胶片/i.test(context.surfaceText)

  if (context.productType === 'tuck_end_box') {
    if (primaryLayer.weight) {
      lineItems.push(createTonPriceLineItem({
        code: 'face_paper',
        displayName: '面纸',
        actualQuantity: context.actualQuantity,
        chargeQuantity: context.chargeQuantity,
        spoilageQuantity: context.spoilageQuantity,
        basisWeight: primaryLayer.weight,
        flatLength: context.flatLength,
        flatWidth: context.flatWidth,
        tonPrice,
        requiredForQuoted: true,
        notes: [`${primaryLayer.weight}g ${primaryLayer.material || '主纸材'} 按吨价公式计。`],
      }))
    }
  }

  if (context.productType === 'mailer_box') {
    if (primaryLayer.weight) {
      lineItems.push(createTonPriceLineItem({
        code: 'outer_liner_material',
        displayName: '外层纸材',
        actualQuantity: context.actualQuantity,
        chargeQuantity: context.chargeQuantity,
        spoilageQuantity: context.spoilageQuantity,
        basisWeight: primaryLayer.weight,
        flatLength: context.flatLength,
        flatWidth: context.flatWidth,
        tonPrice,
        requiredForQuoted: true,
        notes: [`外层 ${primaryLayer.weight}g ${primaryLayer.material || '纸材'}。`],
      }))
    }

    if (secondaryLayer?.weight) {
      lineItems.push(createTonPriceLineItem({
        code: 'inner_liner_material',
        displayName: '内层纸材',
        actualQuantity: context.actualQuantity,
        chargeQuantity: context.chargeQuantity,
        spoilageQuantity: context.spoilageQuantity,
        basisWeight: secondaryLayer.weight,
        flatLength: context.flatLength,
        flatWidth: context.flatWidth,
        tonPrice: TON_PRICE_BY_MATERIAL[secondaryLayer.material || 'white_card'] || TON_PRICE_BY_MATERIAL.white_card,
        requiredForQuoted: false,
        notes: [`内层 ${secondaryLayer.weight}g ${secondaryLayer.material || '纸材'}。`],
      }))
    }
  }

  if (context.productType === 'window_box' && primaryLayer.weight) {
    lineItems.push(createTonPriceLineItem({
      code: 'main_paper',
      displayName: '主纸材',
      actualQuantity: context.actualQuantity,
      chargeQuantity: context.chargeQuantity,
      spoilageQuantity: context.spoilageQuantity,
      basisWeight: primaryLayer.weight,
      flatLength: context.flatLength,
      flatWidth: context.flatWidth,
      tonPrice,
      requiredForQuoted: true,
      notes: [`主纸材 ${primaryLayer.weight}g ${primaryLayer.material || '纸材'}。`],
    }))
  }

  if (context.coreCode && CORE_AREA_PRICE_BY_CODE[context.coreCode]) {
    const basisFactor = context.coreWeight ? Math.max(round2(context.coreWeight / 110), 1) : 1
    lineItems.push(createAreaLineItem({
      code: 'core_reinforcement',
      displayName: '芯材/加强芯',
      actualQuantity: context.actualQuantity,
      chargeQuantity: context.chargeQuantity,
      spoilageQuantity: context.spoilageQuantity,
      basisFactor,
      flatLength: context.flatLength,
      flatWidth: context.flatWidth,
      areaUnitPrice: CORE_AREA_PRICE_BY_CODE[context.coreCode],
      requiredForQuoted: false,
      notes: [`${context.coreCode}${context.coreWeight ? `+${context.coreWeight}g` : ''} 按面积型芯材计。`],
    }))
  }

  if (item.laminationType && item.laminationType !== 'none') {
    lineItems.push(createAreaLineItem({
      code: 'lamination',
      displayName: item.laminationType === 'matte' ? '覆哑膜/过哑胶' : '过光胶',
      actualQuantity: context.actualQuantity,
      chargeQuantity: context.chargeQuantity,
      spoilageQuantity: context.spoilageQuantity,
      basisFactor: getLaminationSideCount(context.surfaceText, item),
      flatLength: context.flatLength,
      flatWidth: context.flatWidth,
      areaUnitPrice: item.laminationType === 'matte' ? 0.3 : 0.28,
      requiredForQuoted: false,
      notes: [`覆膜按 ${getLaminationSideCount(context.surfaceText, item)} 面面积计。`],
    }))
  }

  const hasExplicitMounting = /裱坑|对裱|裱纸|贴合/i.test(context.surfaceText)
  const hasExplicitWindowMounting = context.productType === 'window_box' && /裱/i.test(context.surfaceText)
  const needsImplicitMounting = context.productType === 'mailer_box' && context.materialLayers.length > 1 && Boolean(context.coreCode)

  if (hasExplicitMounting || hasExplicitWindowMounting || (item.mounting && (context.productType === 'window_box' || context.materialLayers.length > 1 || Boolean(context.coreCode))) || needsImplicitMounting) {
    const mountingFactor = context.productType === 'mailer_box' && context.materialLayers.length > 1 && Boolean(context.coreCode)
      ? 3
      : context.productType === 'mailer_box' && context.materialLayers.length > 1
        ? 2
        : 1
    lineItems.push(createAreaLineItem({
      code: 'mounting',
      displayName: '裱纸',
      actualQuantity: context.actualQuantity,
      chargeQuantity: context.chargeQuantity,
      spoilageQuantity: context.spoilageQuantity,
      basisFactor: mountingFactor,
      flatLength: context.flatLength,
      flatWidth: context.flatWidth,
      areaUnitPrice: 0.18,
      requiredForQuoted: false,
      notes: ['裱纸按面积型工艺计。'],
    }))
  }

  lineItems.push(createFixedLineItem({
    code: 'printing_fee',
    displayName: `印刷费（${context.printPassLabel}）`,
    actualQuantity: context.actualQuantity,
    fixedAmount: round2(context.ladder.printingFee * printFeeMultiplier),
    requiredForQuoted: true,
    notes: ['印刷费按固定开机费处理，与 workbook 固定印刷费结构对齐。'],
  }))

  lineItems.push(createFixedLineItem({
    code: 'die_mold',
    displayName: '刀模',
    actualQuantity: context.actualQuantity,
    fixedAmount: context.ladder.dieMoldFee || 0,
    requiredForQuoted: true,
    notes: ['刀模按固定费用处理。'],
  }))

  lineItems.push(createQuantityLineItem({
    code: 'die_cut_machine',
    displayName: '啤机',
    actualQuantity: context.actualQuantity,
    chargeQuantity: context.chargeQuantity,
    spoilageQuantity: context.spoilageQuantity,
    unitPrice: context.ladder.dieCutUnitPrice || 0,
    requiredForQuoted: true,
    notes: ['啤机按生产张数计。'],
  }))

  if (context.productType === 'mailer_box') {
    lineItems.push(createQuantityLineItem({
      code: 'forming',
      displayName: '成型',
      actualQuantity: context.actualQuantity,
      chargeQuantity: context.actualQuantity + (context.ladder.finishingExtraUnits || 0),
      spoilageQuantity: context.ladder.finishingExtraUnits || 0,
      unitPrice: context.ladder.gluingUnitPrice || 0,
      requiredForQuoted: false,
      notes: ['飞机盒按成型/压线后道计。'],
    }))
  } else {
    lineItems.push(createQuantityLineItem({
      code: 'gluing',
      displayName: '粘盒',
      actualQuantity: context.actualQuantity,
      chargeQuantity: context.actualQuantity + (context.ladder.finishingExtraUnits || 0),
      spoilageQuantity: context.ladder.finishingExtraUnits || 0,
      unitPrice: context.ladder.gluingUnitPrice || 0,
      requiredForQuoted: true,
      notes: ['粘盒按成品数量加尾数损耗计。'],
    }))
  }

  const specialTerms = SPECIAL_PROCESS_TERMS.filter((term) => context.surfaceText.toUpperCase().includes(term.toUpperCase()))
  if (specialTerms.length > 0) {
    const unitPrice = specialTerms.some((term) => term.includes('易撕线')) ? 0.05 : specialTerms.some((term) => term.toUpperCase().includes('UV')) ? 0.03 : 0.02
    lineItems.push(createQuantityLineItem({
      code: 'special_process',
      displayName: `特殊工艺（${specialTerms.join('、')}）`,
      actualQuantity: context.actualQuantity,
      chargeQuantity: specialTerms.some((term) => term.includes('易撕线')) ? context.actualQuantity : context.chargeQuantity,
      spoilageQuantity: specialTerms.some((term) => term.includes('易撕线')) ? 0 : context.spoilageQuantity,
      unitPrice,
      requiredForQuoted: false,
      notes: ['首批已覆盖的特殊工艺按数量型附加费计。'],
    }))
  }

  if (context.productType === 'window_box' && explicitNoWindowFilm) {
    lineItems.push(createQuantityLineItem({
      code: 'window_process',
      displayName: '开窗相关工艺',
      actualQuantity: context.actualQuantity,
      chargeQuantity: context.chargeQuantity,
      spoilageQuantity: context.spoilageQuantity,
      unitPrice: 0.04,
      requiredForQuoted: true,
      notes: ['明确不贴胶片时，仅保留开窗清废/定位工序，不生成胶片 line-item。'],
    }))
  } else if (context.productType === 'window_box' && context.windowLength && context.windowWidth && context.windowThickness) {
    const areaUnitPrice = context.windowThickness >= 0.3 ? 0.72 : context.windowThickness >= 0.2 ? 0.58 : 0.46
    lineItems.push(createAreaLineItem({
      code: 'window_film',
      displayName: `胶片 ${context.windowThickness}mm`,
      actualQuantity: context.actualQuantity,
      chargeQuantity: context.chargeQuantity,
      spoilageQuantity: context.spoilageQuantity,
      basisFactor: 1,
      flatLength: context.windowLength,
      flatWidth: context.windowWidth,
      areaUnitPrice,
      requiredForQuoted: true,
      notes: ['胶片按窗位面积和厚度计。'],
    }))

    lineItems.push(createQuantityLineItem({
      code: 'window_process',
      displayName: '开窗相关工艺',
      actualQuantity: context.actualQuantity,
      chargeQuantity: context.chargeQuantity,
      spoilageQuantity: context.spoilageQuantity,
      unitPrice: context.windowThickness >= 0.3 ? 0.09 : 0.07,
      requiredForQuoted: true,
      notes: ['开窗贴片与定位按数量型工序计。'],
    }))
  }

  if (/纸箱|装箱/i.test(context.surfaceText)) {
    const packSize = context.ladder.outerCartonPackSize || 1
    const cartonChargeQuantity = Math.max(1, Math.ceil(context.actualQuantity / packSize))
    lineItems.push(createQuantityLineItem({
      code: 'outer_carton',
      displayName: '纸箱',
      actualQuantity: context.actualQuantity,
      chargeQuantity: cartonChargeQuantity,
      spoilageQuantity: 0,
      unitPrice: context.ladder.outerCartonUnitPrice || 0,
      requiredForQuoted: false,
      notes: ['纸箱按箱数计。'],
    }))
  }

  if (/运费|包邮|含运/i.test(context.surfaceText)) {
    lineItems.push(createFixedLineItem({
      code: 'shipping',
      displayName: '运费',
      actualQuantity: context.actualQuantity,
      fixedAmount: 80,
      requiredForQuoted: false,
      notes: ['运费按固定费用计。'],
    }))
  }

  return lineItems
}

function hasNoFilmWindowQuotedReadyLineShape(item: ComplexPackagingItem, lineItems: ComplexPackagingPriceLineItem[]): boolean {
  const text = normalizeText(item)
  const resolvedLineCodes = lineItems.map((line) => line.code)

  return item.productType === 'window_box'
    && /不贴胶片|无胶片/i.test(text)
    && resolvedLineCodes.includes('main_paper')
    && resolvedLineCodes.includes('printing_fee')
    && resolvedLineCodes.includes('die_mold')
    && resolvedLineCodes.includes('die_cut_machine')
    && resolvedLineCodes.includes('gluing')
    && resolvedLineCodes.includes('window_process')
    && !resolvedLineCodes.includes('window_film')
}

function classifyItemStatus(item: ComplexPackagingItem, lineItems: ComplexPackagingPriceLineItem[]): ItemAssessment {
  const runtime = getWorkbookTemplateRuntime(item)
  if (!runtime) {
    return {
      supported: false,
      status: 'estimated',
      reasons: [],
      blockingReasons: [],
    }
  }

  const text = normalizeText(item)
  const blockingReasons = getBlockingReasons(item, text)
  const estimatedReasons = getEstimatedReasons(item, text)
  const template = getWorkbookProductFamilyTemplate(runtime.templateId as WorkbookProductFamilyTemplateId)
  const resolvedLineCodes = lineItems.map((line) => line.code)
  const quotedReady = template
    ? canTemplateBeQuoted(template, resolvedLineCodes) || hasNoFilmWindowQuotedReadyLineShape(item, lineItems)
    : false

  if (blockingReasons.length > 0) {
    return {
      supported: true,
      status: 'handoff_required',
      templateId: runtime.templateId,
      reasons: blockingReasons,
      blockingReasons,
    }
  }

  if (!quotedReady) {
    return {
      supported: true,
      status: 'estimated',
      templateId: runtime.templateId,
      reasons: ['关键 line-item 仍不完整，先按 estimated 处理。'],
      blockingReasons: [],
    }
  }

  if (estimatedReasons.length > 0) {
    const upgradeClass = getHighFrequencyEstimatedUpgradeClass(item, text, estimatedReasons)

    if (upgradeClass) {
      return {
        supported: true,
        status: 'quoted',
        templateId: runtime.templateId,
        reasons: [],
        blockingReasons: [],
      }
    }

    return {
      supported: true,
      status: 'estimated',
      templateId: runtime.templateId,
      reasons: estimatedReasons,
      blockingReasons: [],
    }
  }

  return {
    supported: true,
    status: 'quoted',
    templateId: runtime.templateId,
    reasons: [],
    blockingReasons: [],
  }
}

export function assessWorkbookLineItemDecision(request: ComplexPackagingRequest): ItemAssessment | null {
  const supportedItems = request.allItems.filter((item) => Boolean(getWorkbookTemplateRuntime(item)))
  if (supportedItems.length === 0) {
    return null
  }

  let hasEstimated = false
  const reasons: string[] = []

  for (const item of supportedItems) {
    const runtime = getWorkbookTemplateRuntime(item)
    if (!runtime) {
      continue
    }

    const result = buildWorkbookLineItemQuote(item)
    if (!result) {
      hasEstimated = true
      reasons.push(`${item.title || item.productType}缺少足够尺寸，line-item 引擎先按 estimated 保守处理。`)
      continue
    }

    if (result.status === 'handoff_required') {
      return {
        supported: true,
        status: 'handoff_required',
        templateId: runtime.templateId,
        reasons: result.reasons,
        blockingReasons: result.blockingReasons,
      }
    }

    if (result.status === 'estimated') {
      hasEstimated = true
      reasons.push(...result.reasons)
    }
  }

  if (hasEstimated) {
    return {
      supported: true,
      status: 'estimated',
      reasons,
      blockingReasons: [],
    }
  }

  return {
    supported: true,
    status: 'quoted',
    reasons: [],
    blockingReasons: [],
  }
}

export function buildWorkbookLineItemQuote(item: ComplexPackagingItem): BuildResult | null {
  const context = buildPricingContext(item)
  if (!context) return null

  const lineItems = buildTargetLineItems(item, context)
  const assessment = classifyItemStatus(item, lineItems)
  const markupRate = getQuoteMarkupRate(context)
  const setupCost = round2(lineItems
    .filter((line) => line.lineItemType === 'fixed_fee')
    .reduce((sum, line) => sum + line.amount, 0))
  const costSubtotal = round2(lineItems.reduce((sum, line) => sum + line.amount, 0))
  const quotedAmount = round2(costSubtotal * (1 + markupRate))
  const materialAmount = round2(lineItems
    .filter((line) => ['face_paper', 'main_paper', 'outer_liner_material', 'inner_liner_material', 'leaflet_paper', 'insert_material', 'sticker_material', 'foil_bag_material', 'core_reinforcement', 'lamination', 'mounting', 'window_film'].includes(line.code))
    .reduce((sum, line) => sum + line.amount, 0))
  const printAmount = round2(lineItems
    .filter((line) => ['printing_fee', 'leaflet_printing', 'insert_printing', 'sticker_printing', 'foil_bag_printing', 'carton_printing'].includes(line.code))
    .reduce((sum, line) => sum + line.amount, 0))
  const processAmount = round2(costSubtotal - materialAmount - printAmount)
  const notes = [
    `已按 ${context.templateId} 生成真实类别行 line-items。`,
    `核心公式采用吨价纸材、面积工艺、固定费、数量型工序四类 workbook 模板。`,
    context.chargeMode === 'sheet_count'
      ? `展开尺寸 ${context.flatLength}×${context.flatWidth}cm，拼版约 ${context.impositionCount} 开，计费张数 ${context.chargeQuantity}。`
      : `展开尺寸 ${context.flatLength}×${context.flatWidth}cm，计费数量 ${context.chargeQuantity}。`,
  ]

  return {
    lineQuote: {
      itemType: item.productType,
      title: item.title || item.productType,
      pricingModel: 'workbook_line_item',
      templateId: context.templateId,
      normalizedParams: {
        ...item,
        flatLength: context.flatLength,
        flatWidth: context.flatWidth,
        actualQuantity: context.actualQuantity,
        chargeQuantity: context.chargeQuantity,
        spoilageQuantity: context.spoilageQuantity,
      },
      quantity: context.actualQuantity,
      actualQuantity: context.actualQuantity,
      chargeQuantity: context.chargeQuantity,
      unitPrice: context.actualQuantity > 0 ? round2(quotedAmount / context.actualQuantity) : 0,
      totalPrice: quotedAmount,
      costSubtotal,
      quotedAmount,
      quoteMarkup: round2(1 + markupRate),
      taxMultiplier: context.taxMultiplier,
      setupCost,
      runCost: round2(costSubtotal - setupCost),
      materialUnitCost: context.actualQuantity > 0 ? round2(materialAmount / context.actualQuantity) : 0,
      printUnitCost: context.actualQuantity > 0 ? round2(printAmount / context.actualQuantity) : 0,
      processUnitCost: context.actualQuantity > 0 ? round2(processAmount / context.actualQuantity) : 0,
      lineItems,
      status: assessment.status,
      statusReasons: assessment.reasons,
      reviewFlags: [],
      reviewReasons: [],
      notes,
    },
    status: assessment.status,
    reasons: assessment.reasons,
    blockingReasons: assessment.blockingReasons,
  }
}
