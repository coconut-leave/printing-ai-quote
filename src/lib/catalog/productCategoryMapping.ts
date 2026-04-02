import { normalizeProductType, type ProductType } from './productSchemas'

export type ProductCategoryDefinition = {
  productType: ProductType
  slug: string
  name: string
  description: string
}

const PRODUCT_CATEGORY_DEFINITIONS: Record<ProductType, ProductCategoryDefinition> = {
  album: {
    productType: 'album',
    slug: 'brochure',
    name: 'Brochure',
    description: 'Album / brochure standard category',
  },
  flyer: {
    productType: 'flyer',
    slug: 'flyer',
    name: 'Flyer',
    description: 'Flyer standard category',
  },
  business_card: {
    productType: 'business_card',
    slug: 'business-card',
    name: 'Business Card',
    description: 'Business card standard category',
  },
  poster: {
    productType: 'poster',
    slug: 'poster',
    name: 'Poster',
    description: 'Poster standard category',
  },
}

const LEGACY_PRODUCT_CATEGORY_MATCHES: Record<ProductType, { slugs: string[]; names: string[] }> = {
  album: {
    slugs: ['album'],
    names: ['Album', 'album', 'Brochure'],
  },
  flyer: {
    slugs: [],
    names: ['Flyer'],
  },
  business_card: {
    slugs: ['business_card'],
    names: ['Business Card', 'BusinessCard'],
  },
  poster: {
    slugs: [],
    names: ['Poster'],
  },
}

export function getProductCategoryDefinition(productType?: string): ProductCategoryDefinition {
  return PRODUCT_CATEGORY_DEFINITIONS[normalizeProductType(productType)]
}

export function getProductCategoryLookup(productType?: string): {
  canonical: ProductCategoryDefinition
  legacySlugs: string[]
  legacyNames: string[]
} {
  const canonical = getProductCategoryDefinition(productType)
  const legacy = LEGACY_PRODUCT_CATEGORY_MATCHES[canonical.productType]

  return {
    canonical,
    legacySlugs: legacy.slugs,
    legacyNames: legacy.names,
  }
}

export function getAllLiveProductCategoryDefinitions(): ProductCategoryDefinition[] {
  return Object.values(PRODUCT_CATEGORY_DEFINITIONS)
}