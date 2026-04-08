export type WorkbookPricingToleranceScope = 'component' | 'order'

export type WorkbookPricingToleranceBand = 'close' | 'acceptable' | 'review'

export const WORKBOOK_COMPONENT_TOLERANCE = {
  closeMaxGapRatio: 0.05,
  acceptableMaxGapRatio: 0.12,
} as const

export const WORKBOOK_ORDER_TOLERANCE = {
  closeMaxGapRatio: 0.015,
  acceptableMaxGapRatio: 0.03,
} as const

export function getWorkbookPricingTolerance(scope: WorkbookPricingToleranceScope) {
  return scope === 'order' ? WORKBOOK_ORDER_TOLERANCE : WORKBOOK_COMPONENT_TOLERANCE
}

export function classifyWorkbookPricingToleranceBand(
  scope: WorkbookPricingToleranceScope,
  gapRatio: number,
): WorkbookPricingToleranceBand {
  const tolerance = getWorkbookPricingTolerance(scope)
  const absoluteGapRatio = Math.abs(gapRatio)

  if (absoluteGapRatio <= tolerance.closeMaxGapRatio) {
    return 'close'
  }

  if (absoluteGapRatio <= tolerance.acceptableMaxGapRatio) {
    return 'acceptable'
  }

  return 'review'
}