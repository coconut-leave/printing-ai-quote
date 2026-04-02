import dotenv from 'dotenv'
import { PrismaClient } from '@prisma/client'

dotenv.config({ path: './.env' })

const prisma = new PrismaClient()

async function main() {
  const category = await prisma.productCategory.upsert({
    where: { slug: 'brochure' },
    update: { description: 'Brochure / album standard category' },
    create: {
      name: 'Brochure',
      slug: 'brochure',
      description: 'Brochure / album standard category',
      isActive: true,
    },
  })

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
