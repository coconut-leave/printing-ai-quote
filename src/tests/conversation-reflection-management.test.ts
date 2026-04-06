import dotenv from 'dotenv'
import { buildPackagingCorrectedParamsPayload } from '@/lib/reflection/packagingCorrectedParams'

dotenv.config({ path: './.env' })

interface TestResult {
  name: string
  passed: boolean
  error?: string
}

const results: TestResult[] = []

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(message)
  }
}

function test(name: string, fn: () => Promise<void>) {
  return fn()
    .then(() => {
      results.push({ name, passed: true })
      console.log(`✓ ${name}`)
    })
    .catch((err) => {
      const error = err instanceof Error ? err.message : String(err)
      results.push({ name, passed: false, error })
      console.error(`✗ ${name}`)
      console.error(`  └─ ${error}`)
    })
}

function getNamedExport<T>(module: any, name: string): T {
  const direct = module?.[name]
  if (direct) {
    return direct as T
  }

  const nested = module?.default?.[name]
  if (nested) {
    return nested as T
  }

  throw new Error(`Export ${name} not found`)
}

console.log('\n=== 会话详情与 Reflection 管理链路回归测试 ===\n')

async function main() {
  const conversationsDbModule = await import('@/server/db/conversations')
  const conversationsRouteModule = await import('@/app/api/conversations/route')
  const conversationDetailRouteModule = await import('@/app/api/conversations/[id]/route')
  const conversationReflectionRouteModule = await import('@/app/api/conversations/[id]/reflection/route')
  const reflectionsRouteModule = await import('@/app/api/reflections/route')
  const reflectionReviewRouteModule = await import('@/app/api/reflections/[id]/review/route')
  const learningDashboardRouteModule = await import('@/app/api/learning-dashboard/route')

  const createConversation = getNamedExport<() => Promise<{ id: number }>>(conversationsDbModule, 'createConversation')
  const addMessageToConversation = getNamedExport<(conversationId: number, sender: 'CUSTOMER' | 'ASSISTANT' | 'SYSTEM', content: string, metadata?: object) => Promise<any>>(conversationsDbModule, 'addMessageToConversation')
  const conversationsGet = getNamedExport<(request: Request) => Promise<Response>>(conversationsRouteModule, 'GET')
  const conversationDetailGet = getNamedExport<(request: Request, context: { params: { id: string } }) => Promise<Response>>(conversationDetailRouteModule, 'GET')
  const conversationReflectionPost = getNamedExport<(request: Request, context: { params: { id: string } }) => Promise<Response>>(conversationReflectionRouteModule, 'POST')
  const reflectionsGet = getNamedExport<(request: Request) => Promise<Response>>(reflectionsRouteModule, 'GET')
  const reflectionReviewPatch = getNamedExport<(request: Request, context: { params: { id: string } }) => Promise<Response>>(reflectionReviewRouteModule, 'PATCH')
  const learningDashboardGet = getNamedExport<() => Promise<Response>>(learningDashboardRouteModule, 'GET')

  await test('会话列表 -> 会话详情 -> Reflection 创建 -> 统计增长', async () => {
    const originalOpenAiKey = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = ''

    try {
      const beforeReflectionsResponse = await reflectionsGet(new Request('http://localhost/api/reflections?page=1&limit=20'))
      const beforeReflections = await beforeReflectionsResponse.json()
      assert(beforeReflections.ok, '初始 reflections 列表应可读取')
      const beforeReflectionTotal = beforeReflections.data.pagination.total as number

      const beforeDashboardResponse = await learningDashboardGet()
      const beforeDashboard = await beforeDashboardResponse.json()
      assert(beforeDashboard.ok, '初始 learning dashboard 应可读取')
      const beforeReflectionCount = beforeDashboard.data.totals.reflectionCount as number

      const conversation = await createConversation()
      await addMessageToConversation(conversation.id, 'CUSTOMER', '我想印1000本A4画册，先给我报价')
      await addMessageToConversation(
        conversation.id,
        'ASSISTANT',
        '当前信息还不足以生成报价，还缺少页数和内页克重。',
        {
          intent: 'QUOTE_REQUEST',
          responseStatus: 'missing_fields',
          extractedParams: {
            productType: 'album',
            finishedSize: 'A4',
            quantity: 1000,
            coverPaper: 'coated',
            coverWeight: 200,
            bindingType: 'saddle_stitch',
          },
          mergedParams: {
            productType: 'album',
            finishedSize: 'A4',
            quantity: 1000,
            coverPaper: 'coated',
            coverWeight: 200,
            bindingType: 'saddle_stitch',
          },
          missingFields: ['pageCount', 'innerWeight'],
        }
      )

      const conversationsResponse = await conversationsGet(new Request('http://localhost/api/conversations'))
      const conversationsPayload = await conversationsResponse.json()
      assert(conversationsPayload.ok, '会话列表 API 应返回成功')
      assert(conversationsPayload.data.some((item: { id: number }) => item.id === conversation.id), '新建会话应出现在列表中')

      const detailResponse = await conversationDetailGet(
        new Request(`http://localhost/api/conversations/${conversation.id}`),
        { params: { id: String(conversation.id) } }
      )
      const detailPayload = await detailResponse.json()
      assert(detailPayload.ok, '会话详情 API 应返回成功')
      assert(detailPayload.data.id === conversation.id, '会话详情应返回正确会话')
      assert(Array.isArray(detailPayload.data.messages) && detailPayload.data.messages.length >= 2, '会话详情应包含消息记录')

      const reflectionResponse = await conversationReflectionPost(
        new Request(`http://localhost/api/conversations/${conversation.id}/reflection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issueType: 'PARAM_MISSING',
            businessFeedback: {
              problemSummary: '系统缺少页数和内页克重追问，业务员无法继续跟单。',
              correctHandling: '应补参数',
              correctResult: '应提示客户补 32 页和 157g 内页，再继续报价。',
              shouldHandoff: 'no',
              notes: '这个场景不需要转人工。',
            },
          }),
        }),
        { params: { id: String(conversation.id) } }
      )
      const reflectionPayload = await reflectionResponse.json()
      assert(reflectionPayload.ok, '会话详情页的 reflection 创建 API 应返回成功')
      assert(reflectionPayload.data.conversationId === conversation.id, '新 reflection 应属于当前会话')
      assert(reflectionPayload.data.issueType === 'PARAM_MISSING', '新 reflection 应保留 issueType')
      assert(reflectionPayload.data.correctedParams?.businessFeedback?.correctHandling === '应补参数', '业务反馈应被结构化写入 correctedParams')
      assert(reflectionPayload.data.correctedQuoteSummary?.includes('32 页'), 'correctResult 应被吸收到 correctedQuoteSummary')

      const detailAfterResponse = await conversationDetailGet(
        new Request(`http://localhost/api/conversations/${conversation.id}`),
        { params: { id: String(conversation.id) } }
      )
      const detailAfterPayload = await detailAfterResponse.json()
      assert(detailAfterPayload.ok, '创建 reflection 后会话详情应仍可读取')
      assert((detailAfterPayload.data.reflections?.length || 0) >= 1, '会话详情应包含刚创建的 reflection')

      const reflectionsResponse = await reflectionsGet(new Request('http://localhost/api/reflections?page=1&limit=20'))
      const reflectionsPayload = await reflectionsResponse.json()
      assert(reflectionsPayload.ok, 'reflections 列表 API 应返回成功')
      assert(reflectionsPayload.data.pagination.total >= beforeReflectionTotal + 1, '创建 reflection 后 /reflections 总数应增加')
      assert(
        reflectionsPayload.data.records.some((item: { id: number; conversationId: number }) => (
          item.id === reflectionPayload.data.id && item.conversationId === conversation.id
        )),
        '新 reflection 应出现在 /reflections 列表中'
      )

      const dashboardResponse = await learningDashboardGet()
      const dashboardPayload = await dashboardResponse.json()
      assert(dashboardPayload.ok, 'learning dashboard API 应返回成功')
      assert(dashboardPayload.data.totals.reflectionCount >= beforeReflectionCount + 1, '创建 reflection 后 dashboard Reflection 总数应增加')
    } finally {
      process.env.OPENAI_API_KEY = originalOpenAiKey
    }
  })

  await test('复杂包装 reflection 创建应注入 packaging context', async () => {
    const originalOpenAiKey = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = ''

    try {
      const conversation = await createConversation()
      await addMessageToConversation(conversation.id, 'CUSTOMER', '开窗彩盒 21*17*31cm，400克特种纸板，先看一下')
      await addMessageToConversation(
        conversation.id,
        'ASSISTANT',
        '当前先按预报价处理，但还需要人工复核开窗相关参数。',
        {
          intent: 'QUOTE_REQUEST',
          responseStatus: 'estimated',
          complexPackagingState: {
            mainItem: {
              productType: 'window_box',
              title: '开窗彩盒',
            },
            subItems: [
              {
                productType: 'seal_sticker',
                title: '封口贴',
              },
            ],
            referenceFiles: [
              {
                fileName: 'window-box-reference.pdf',
                fileUrl: '/samples/window-box-reference.pdf',
              },
            ],
          },
          packagingReview: {
            status: 'estimated',
            reviewReasons: [
              {
                code: 'thick_window_film',
                label: '胶片偏厚',
                message: '胶片偏厚，建议人工复核',
              },
            ],
            missingDetails: [
              {
                itemIndex: 0,
                itemLabel: '开窗彩盒',
                productType: 'window_box',
                fields: ['windowSizeLength', 'windowSizeWidth'],
                fieldsText: '开窗尺寸',
              },
            ],
            lineItems: [
              {
                itemType: 'window_box',
                itemTypeLabel: '开窗彩盒',
                title: '开窗彩盒',
                quantity: 500,
                reviewFlags: [],
                reviewReasons: [
                  {
                    code: 'thick_window_film',
                    label: '胶片偏厚',
                    message: '胶片偏厚，建议人工复核',
                  },
                ],
              },
            ],
          },
          referenceFiles: [
            {
              fileName: 'window-box-reference.pdf',
              fileUrl: '/samples/window-box-reference.pdf',
            },
          ],
          requiresHumanReview: true,
        }
      )

      const reflectionResponse = await conversationReflectionPost(
        new Request(`http://localhost/api/conversations/${conversation.id}/reflection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issueType: 'PACKAGING_PARAM_MISSING',
            correctedQuoteSummary: '人工复核要求先补齐开窗尺寸，再决定是否转人工。',
          }),
        }),
        { params: { id: String(conversation.id) } }
      )
      const reflectionPayload = await reflectionResponse.json()
      assert(reflectionPayload.ok, '复杂包装 reflection 创建应返回成功')
      assert(reflectionPayload.data.issueType === 'PACKAGING_PARAM_MISSING', '复杂包装 reflection 应保留新 issueType')
      assert(reflectionPayload.data.originalExtractedParams?.packagingContext?.mainItem?.productType === 'window_box', '应写入主件 packaging context')
      assert(reflectionPayload.data.originalExtractedParams?.packagingContext?.subItems?.length === 1, '应写入 subItems packaging context')
      assert(reflectionPayload.data.originalExtractedParams?.packagingContext?.reviewReasons?.length === 1, '应写入 reviewReasons packaging context')
      assert(reflectionPayload.data.originalExtractedParams?.packagingContext?.referenceFiles?.length === 1, '应写入 referenceFiles packaging context')
    } finally {
      process.env.OPENAI_API_KEY = originalOpenAiKey
    }
  })

  await test('复杂包装 reflection 创建应保存结构化 correctedParams', async () => {
    const originalOpenAiKey = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = ''

    try {
      const conversation = await createConversation()
      await addMessageToConversation(conversation.id, 'CUSTOMER', '双插盒配说明书，先看看结构化预报价')
      await addMessageToConversation(
        conversation.id,
        'ASSISTANT',
        '当前先按复杂包装预报价处理。',
        {
          intent: 'QUOTE_REQUEST',
          responseStatus: 'estimated',
          complexPackagingState: {
            mainItem: {
              productType: 'tuck_end_box',
              title: '双插盒',
              quantity: 3000,
              length: 18,
              width: 6,
              height: 4,
              sizeUnit: 'cm',
              material: 'white_card',
              weight: 350,
              printColor: 'four_color',
            },
            subItems: [
              {
                productType: 'leaflet_insert',
                title: '说明书',
                quantity: 3000,
                length: 16,
                width: 12,
                sizeUnit: 'cm',
                paperType: 'coated',
                paperWeight: 128,
                printColor: 'black',
              },
            ],
          },
          packagingReview: {
            status: 'estimated',
            reviewReasons: [],
            missingDetails: [],
            lineItems: [],
          },
        }
      )

      const correctedParams = buildPackagingCorrectedParamsPayload({
        productType: 'tuck_end_box',
        isBundle: true,
        packagingContext: {
          flow: 'complex_packaging',
          mainItem: {
            productType: 'tuck_end_box',
            title: '双插盒',
            quantity: 3000,
            length: 18,
            width: 6,
            height: 4,
            sizeUnit: 'cm',
            material: 'white_card',
            weight: 350,
            printColor: 'four_color',
            surfaceFinish: 'matte_lamination',
            processes: ['啤', '粘'],
          },
          subItems: [
            {
              productType: 'leaflet_insert',
              title: '说明书',
              quantity: 3000,
              length: 16,
              width: 12,
              sizeUnit: 'cm',
              paperType: 'coated',
              paperWeight: 128,
              printColor: 'black',
            },
          ],
          reviewReasons: [
            {
              label: '结构化修正',
              message: '人工确认双插盒与说明书组合结构成立',
            },
          ],
          requiresHumanReview: false,
        },
      })

      const reflectionResponse = await conversationReflectionPost(
        new Request(`http://localhost/api/conversations/${conversation.id}/reflection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issueType: 'BUNDLE_STRUCTURE_WRONG',
            correctedParams,
            correctedQuoteSummary: '人工确认 bundle 结构后可继续按结构化预报价。',
          }),
        }),
        { params: { id: String(conversation.id) } }
      )
      const reflectionPayload = await reflectionResponse.json()
      assert(reflectionPayload.ok, '结构化 correctedParams 创建 reflection 应成功')
      assert(reflectionPayload.data.correctedParams?.productType === 'tuck_end_box', '顶层 correctedParams.productType 应保留')
      assert(reflectionPayload.data.correctedParams?.packagingContext?.mainItem?.surfaceFinish === 'matte_lamination', '主件修正字段应落库')
      assert(reflectionPayload.data.correctedParams?.packagingContext?.subItems?.length === 1, 'subItems 结构应落库')
      assert(reflectionPayload.data.correctedParams?.packagingContext?.reviewReasons?.length === 1, 'reviewReasons 结构应落库')
    } finally {
      process.env.OPENAI_API_KEY = originalOpenAiKey
    }
  })

  await test('复杂包装 reflection 保存后应支持再次编辑并持久化 correctedParams', async () => {
    const originalOpenAiKey = process.env.OPENAI_API_KEY
    process.env.OPENAI_API_KEY = ''

    try {
      const conversation = await createConversation()
      await addMessageToConversation(conversation.id, 'CUSTOMER', '开窗彩盒加封口贴，先保留预报价')
      await addMessageToConversation(
        conversation.id,
        'ASSISTANT',
        '当前先按复杂包装预报价处理。',
        {
          intent: 'QUOTE_REQUEST',
          responseStatus: 'estimated',
          complexPackagingState: {
            mainItem: {
              productType: 'window_box',
              title: '开窗彩盒',
              quantity: 1200,
              length: 16,
              width: 10,
              height: 5,
              sizeUnit: 'cm',
              material: 'white_card',
              weight: 350,
              printColor: 'four_color',
              windowFilmThickness: 0.2,
              windowSizeLength: 6,
              windowSizeWidth: 4,
            },
            subItems: [
              {
                productType: 'seal_sticker',
                title: '封口贴',
                quantity: 1200,
                stickerMaterial: 'clear_sticker',
                stickerLength: 2.5,
                stickerWidth: 2,
                sizeUnit: 'cm',
              },
            ],
          },
          packagingReview: {
            status: 'estimated',
            reviewReasons: [
              {
                label: '先预报价',
                message: '当前仍需人工复核确认窗位细节',
              },
            ],
            missingDetails: [],
            lineItems: [],
          },
          requiresHumanReview: true,
        }
      )

      const createResponse = await conversationReflectionPost(
        new Request(`http://localhost/api/conversations/${conversation.id}/reflection`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issueType: 'PACKAGING_PARAM_WRONG',
            correctedQuoteSummary: '初始保存后，后续还需要继续修正。',
          }),
        }),
        { params: { id: String(conversation.id) } }
      )
      const createPayload = await createResponse.json()
      assert(createPayload.ok, '初始复杂包装 reflection 创建应成功')

      const updatedCorrectedParams = buildPackagingCorrectedParamsPayload({
        productType: 'window_box',
        isBundle: false,
        packagingContext: {
          flow: 'complex_packaging',
          mainItem: {
            productType: 'window_box',
            title: '开窗彩盒',
            quantity: 1200,
            length: 16,
            width: 10,
            height: 5,
            sizeUnit: 'cm',
            material: 'white_card',
            weight: 350,
            printColor: 'four_color',
            surfaceFinish: 'matte_lamination',
            windowFilmThickness: 0.2,
            windowSizeLength: 6,
            windowSizeWidth: 4,
          },
          subItems: [],
          reviewReasons: [
            {
              label: '仅保留主件',
              message: '人工确认封口贴不计入本次修正结构',
            },
          ],
          requiresHumanReview: false,
        },
      })

      const patchResponse = await reflectionReviewPatch(
        new Request(`http://localhost/api/reflections/${createPayload.data.id}/review`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            issueType: 'PACKAGING_REVIEW_REASON_WRONG',
            correctedParams: updatedCorrectedParams,
            businessFeedback: {
              problemSummary: '原记录把封口贴也算进了本次修正，业务判断不对。',
              correctHandling: '应转人工',
              correctResult: '删除封口贴后继续作为主件修正记录保存。',
              shouldHandoff: 'yes',
              notes: '这类窗位细节需要人工复核。',
            },
          }),
        }),
        { params: { id: String(createPayload.data.id) } }
      )
      const patchPayload = await patchResponse.json()
      assert(patchPayload.ok, 'review PATCH 保存复杂包装修正应成功')
      assert(patchPayload.data.issueType === 'PACKAGING_REVIEW_REASON_WRONG', 'PATCH 后应更新 issueType')
      assert(patchPayload.data.correctedParams?.packagingContext?.subItems?.length === 0, 'PATCH 后应持久化空 subItems')
      assert(patchPayload.data.correctedParams?.packagingContext?.reviewReasons?.[0]?.label === '仅保留主件', 'PATCH 后应持久化新的 reviewReason')
      assert(patchPayload.data.correctedParams?.businessFeedback?.shouldHandoff === 'yes', 'PATCH 后应保留业务反馈的转人工判断')
      assert(patchPayload.data.correctedQuoteSummary === '删除封口贴后继续作为主件修正记录保存。', 'PATCH 后应持久化新的 correctedQuoteSummary')

      const reflectionsResponse = await reflectionsGet(new Request('http://localhost/api/reflections?page=1&limit=20'))
      const reflectionsPayload = await reflectionsResponse.json()
      const savedRecord = reflectionsPayload.data.records.find((item: { id: number }) => item.id === createPayload.data.id)
      assert(savedRecord?.issueType === 'PACKAGING_REVIEW_REASON_WRONG', '反思列表中应能看到更新后的 issueType')
      assert(savedRecord?.correctedParams?.packagingContext?.subItems?.length === 0, '反思列表中应保留删除后的 subItems 结构')
      assert(savedRecord?.correctedQuoteSummary === '删除封口贴后继续作为主件修正记录保存。', '反思列表中应保留新的 correctedQuoteSummary')

      const detailResponse = await conversationDetailGet(
        new Request(`http://localhost/api/conversations/${conversation.id}`),
        { params: { id: String(conversation.id) } }
      )
      const detailPayload = await detailResponse.json()
      const savedReflection = detailPayload.data.reflections.find((item: { id: number }) => item.id === createPayload.data.id)
      assert(savedReflection?.correctedParams?.packagingContext?.subItems?.length === 0, '会话详情中应读取到保存后的空 subItems')
    } finally {
      process.env.OPENAI_API_KEY = originalOpenAiKey
    }
  })

  console.log('\n=== 测试总结 ===\n')
  const passed = results.filter((r) => r.passed).length
  const total = results.length

  console.log(`总计: ${passed}/${total} 通过`)
  if (passed < total) process.exit(1)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})