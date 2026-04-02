import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'
import { getAllLiveProductCategoryDefinitions } from '@/lib/catalog/productCategoryMapping'

dotenv.config({ path: './.env' })

const isProduction = process.env.NODE_ENV === 'production'
const allowSeed = process.env.ALLOW_SEED === 'true'

if (isProduction && !allowSeed) {
  console.error(
    '[seed blocked] Refusing to run seed in production. '
      + 'Set ALLOW_SEED=true only for explicit one-time operations.'
  )
  console.error('[seed blocked] Configure env in project root .env before running seed.')
  process.exit(1)
}

const prisma = new PrismaClient()

async function main() {
  const categoryDefinitions = getAllLiveProductCategoryDefinitions()

  for (const definition of categoryDefinitions) {
    await prisma.productCategory.upsert({
      where: { slug: definition.slug },
      update: { description: definition.description, name: definition.name },
      create: {
        name: definition.name,
        slug: definition.slug,
        description: definition.description,
        isActive: true,
      },
    })
  }

  const category = await prisma.productCategory.findUniqueOrThrow({ where: { slug: 'brochure' } })

  await prisma.productParameterDefinition.upsert({
    where: { productCategoryId_key: { productCategoryId: category.id, key: 'quantity' } },
    update: { label: 'Quantity', dataType: 'NUMBER', required: true, order: 1 },
    create: {
      productCategoryId: category.id,
      key: 'quantity',
      label: 'Quantity',
      dataType: 'NUMBER',
      required: true,
      order: 1,
    },
  })

  await prisma.pricingRule.upsert({
    where: { id: 1 },
    update: { valueCents: 1000, description: 'Base unit price rule' },
    create: {
      productCategoryId: category.id,
      name: 'Base unit price',
      ruleType: 'BASE',
      valueCents: 1000,
    },
  })

  await prisma.shippingRule.upsert({
    where: { id: 1 },
    update: { costCents: 500, region: 'domestic' },
    create: {
      region: 'domestic',
      costCents: 500,
      active: true,
    },
  })

  console.log('seed complete')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
