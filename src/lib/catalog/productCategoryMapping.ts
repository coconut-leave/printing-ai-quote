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
  mailer_box: {
    productType: 'mailer_box',
    slug: 'mailer-box',
    name: 'Mailer Box',
    description: 'Phase-one complex packaging mailer box category',
  },
  tuck_end_box: {
    productType: 'tuck_end_box',
    slug: 'tuck-end-box',
    name: 'Tuck End Box',
    description: 'Phase-one complex packaging tuck end box category',
  },
  window_box: {
    productType: 'window_box',
    slug: 'window-box',
    name: 'Window Box',
    description: 'Phase-one complex packaging window box category',
  },
  leaflet_insert: {
    productType: 'leaflet_insert',
    slug: 'leaflet-insert',
    name: 'Leaflet Insert',
    description: 'Phase-one complex packaging leaflet insert category',
  },
  box_insert: {
    productType: 'box_insert',
    slug: 'box-insert',
    name: 'Box Insert',
    description: 'Phase-one complex packaging box insert category',
  },
  seal_sticker: {
    productType: 'seal_sticker',
    slug: 'seal-sticker',
    name: 'Seal Sticker',
    description: 'Phase-one complex packaging seal sticker category',
  },
  foil_bag: {
    productType: 'foil_bag',
    slug: 'foil-bag',
    name: 'Foil Bag',
    description: 'Phase-2.5 complex packaging foil bag category',
  },
  carton_packaging: {
    productType: 'carton_packaging',
    slug: 'carton-packaging',
    name: 'Carton Packaging',
    description: 'Phase-2.5 complex packaging carton packaging category',
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
  mailer_box: {
    slugs: ['mailer_box'],
    names: ['Mailer Box', 'mailer_box'],
  },
  tuck_end_box: {
    slugs: ['tuck_end_box'],
    names: ['Tuck End Box', 'tuck_end_box'],
  },
  window_box: {
    slugs: ['window_box'],
    names: ['Window Box', 'window_box'],
  },
  leaflet_insert: {
    slugs: ['leaflet_insert'],
    names: ['Leaflet Insert', 'leaflet_insert'],
  },
  box_insert: {
    slugs: ['box_insert'],
    names: ['Box Insert', 'box_insert'],
  },
  seal_sticker: {
    slugs: ['seal_sticker'],
    names: ['Seal Sticker', 'seal_sticker'],
  },
  foil_bag: {
    slugs: ['foil_bag'],
    names: ['Foil Bag', 'foil_bag'],
  },
  carton_packaging: {
    slugs: ['carton_packaging'],
    names: ['Carton Packaging', 'carton_packaging'],
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