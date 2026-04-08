import dotenv from 'dotenv'

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
    .catch((error) => {
      const message = error instanceof Error ? error.message : String(error)
      results.push({ name, passed: false, error: message })
      console.error(`✗ ${name}`)
      console.error(`  └─ ${message}`)
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

console.log('\n=== 试运行复核队列回归测试 ===\n')

async function main() {
  const conversationsDbModule = await import('@/server/db/conversations')
  const prismaModule = await import('@/server/db/prisma')
  const queueRouteModule = await import('@/app/api/trial-reviews/route')
  const decisionRouteModule = await import('@/app/api/trial-reviews/[conversationId]/route')

  const createConversation = getNamedExport<() => Promise<{ id: number }>>(conversationsDbModule, 'createConversation')
  const addMessageToConversation = getNamedExport<(conversationId: number, sender: 'CUSTOMER' | 'ASSISTANT' | 'SYSTEM', content: string, metadata?: object) => Promise<any>>(conversationsDbModule, 'addMessageToConversation')
  const queueGet = getNamedExport<(request: Request) => Promise<Response>>(queueRouteModule, 'GET')
  const decisionPatch = getNamedExport<(request: Request, context: { params: { conversationId: string } }) => Promise<Response>>(decisionRouteModule, 'PATCH')
  const prisma = getNamedExport<any>(prismaModule, 'prisma')

  await test('非法筛选值应被接口拒绝，避免后台筛选误用', async () => {
    const invalidStatusResponse = await queueGet(new Request('http://localhost/api/trial-reviews?status=INVALID'))
    const invalidStatusPayload = await invalidStatusResponse.json()
    assert(invalidStatusResponse.status === 400, '非法复核状态筛选应返回 400')
    assert(invalidStatusPayload.error.includes('复核状态'), '非法复核状态筛选应给出中文提示')

    const invalidSourceResponse = await queueGet(new Request('http://localhost/api/trial-reviews?sourceKind=INVALID'))
    const invalidSourcePayload = await invalidSourceResponse.json()
    assert(invalidSourceResponse.status === 400, '非法复核来源筛选应返回 400')
    assert(invalidSourcePayload.error.includes('复核来源'), '非法复核来源筛选应给出中文提示')
  })

  await test('队列应只纳入试运行范围内的参考报价案例，并输出中文业务标签', async () => {
    const complexConversation = await createConversation()
    await addMessageToConversation(complexConversation.id, 'CUSTOMER', '双插盒 2000 个，先看下试运行报价')
    await addMessageToConversation(
      complexConversation.id,
      'ASSISTANT',
      '当前先按参考报价处理，请人工确认后再对外。',
      {
        responseStatus: 'estimated',
        mergedParams: {
          productType: 'tuck_end_box',
          quantity: 2000,
          length: 18,
          width: 6,
          height: 4,
          sizeUnit: 'cm',
          material: 'white_card',
          weight: 350,
        },
        estimatedData: {
          totalPrice: 820,
          shippingFee: 90,
          finalPrice: 910,
          unitPrice: 0.41,
        },
        packagingReview: {
          status: 'estimated',
          trialGateStatus: 'estimated_only_in_trial',
          statusReasonText: '当前路径在试运行内只允许参考报价。',
          conciseExplanation: '参数已较完整，但当前仍属于试运行参考报价范围。',
          requiresHumanReview: false,
        },
      }
    )

    const simpleConversation = await createConversation()
    await addMessageToConversation(simpleConversation.id, 'CUSTOMER', 'A4 画册 100 本')
    await addMessageToConversation(
      simpleConversation.id,
      'ASSISTANT',
      '简单品类历史链路。',
      {
        responseStatus: 'quoted',
        mergedParams: {
          productType: 'album',
          quantity: 100,
        },
      }
    )

    const response = await queueGet(new Request('http://localhost/api/trial-reviews?status=PENDING_REVIEW'))
    const payload = await response.json()

    assert(response.status === 200, '队列接口应返回 200')
    assert(payload.ok, '队列接口应返回成功')
    assert(payload.data.records.some((item: { conversationId: number }) => item.conversationId === complexConversation.id), '复杂包装参考报价应入队')
    assert(!payload.data.records.some((item: { conversationId: number }) => item.conversationId === simpleConversation.id), '简单品类不应进入试运行复核队列')

    const queuedItem = payload.data.records.find((item: { conversationId: number }) => item.conversationId === complexConversation.id)
    assert(queuedItem.sourceKind === 'REFERENCE_QUOTE', '参考报价应归类为 REFERENCE_QUOTE')
    assert(queuedItem.sourceKindLabel.includes('参考报价'), '来源标签应为中文业务说明')
    assert(queuedItem.reviewStatusLabel === '待复核', '初始状态应显示为待复核')
    assert(queuedItem.deliveryScopeLabel.includes('试运行参考报价范围'), '应展示试运行参考报价口径')
    assert(queuedItem.observation.overviewCards[0].value === '当前仅参考报价', '观察面板应显示当前仅参考报价')
    assert(queuedItem.observation.overviewCards[1].value === '当前不在试运行自动正式报价范围内', 'estimated path 应显示不在自动正式报价范围内')
    assert(queuedItem.observation.reasonSection.primaryReason.includes('只允许参考报价'), '观察面板应复用中文状态原因')
  })

  await test('参考报价复核状态流转后应留下审计记录，并支持状态筛选', async () => {
    const conversation = await createConversation()
    await addMessageToConversation(conversation.id, 'CUSTOMER', '飞机盒 3000 个，给个参考报价')
    await addMessageToConversation(
      conversation.id,
      'ASSISTANT',
      '当前先给参考报价。',
      {
        responseStatus: 'estimated',
        mergedParams: {
          productType: 'mailer_box',
          quantity: 3000,
          length: 20,
          width: 15,
          height: 8,
          sizeUnit: 'cm',
        },
        estimatedData: {
          totalPrice: 1280,
          shippingFee: 120,
          finalPrice: 1400,
          unitPrice: 0.43,
        },
        packagingReview: {
          status: 'estimated',
          trialGateStatus: 'estimated_only_in_trial',
          statusReasonText: '当前路径在试运行内只允许参考报价。',
          conciseExplanation: '建议人工确认后再继续跟进。',
        },
      }
    )

    const estimateResponse = await decisionPatch(
      new Request(`http://localhost/api/trial-reviews/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'RETURNED_AS_ESTIMATE',
          operatorName: '销售A',
          note: '先保留参考报价，对外说明需人工确认。',
        }),
      }),
      { params: { conversationId: String(conversation.id) } }
    )
    const estimatePayload = await estimateResponse.json()

    assert(estimateResponse.status === 200, '状态流转接口应返回 200')
    assert(estimatePayload.ok, '状态流转接口应返回成功')
    assert(estimatePayload.data.reviewStatus === 'RETURNED_AS_ESTIMATE', '应更新为保留参考报价')
    assert(estimatePayload.data.latestAudit?.actionLabel === '保留参考报价', '最新留痕应显示中文动作')
    assert(estimatePayload.data.latestAudit?.transitionLabel === '待复核 -> 保留参考报价', '最新留痕应显示中文状态流转')

    const closeResponse = await decisionPatch(
      new Request(`http://localhost/api/trial-reviews/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'CLOSED',
          operatorName: '销售A',
          note: '客户已知晓参考报价，当前先关闭。',
        }),
      }),
      { params: { conversationId: String(conversation.id) } }
    )
    const closePayload = await closeResponse.json()

    assert(closePayload.data.reviewStatus === 'CLOSED', '应允许关闭复核项')

    const reviewCase = await prisma.trialReviewCase.findUnique({
      where: { conversationId: conversation.id },
      include: { auditLogs: { orderBy: { createdAt: 'desc' } } },
    })

    assert(Boolean(reviewCase), '应创建复核主记录')
    assert(reviewCase.auditLogs.length >= 3, '应保留入队、保留参考报价、关闭三条留痕')
    assert(reviewCase.auditLogs.some((item: { actionType: string }) => item.actionType === 'QUEUED'), '应存在入队留痕')
    assert(reviewCase.auditLogs.some((item: { actionType: string }) => item.actionType === 'RETURNED_AS_ESTIMATE'), '应存在保留参考报价留痕')
    assert(reviewCase.auditLogs.some((item: { actionType: string }) => item.actionType === 'CLOSED'), '应存在关闭留痕')

    const filteredResponse = await queueGet(new Request('http://localhost/api/trial-reviews?status=CLOSED'))
    const filteredPayload = await filteredResponse.json()
    assert(filteredPayload.data.records.some((item: { conversationId: number }) => item.conversationId === conversation.id), '关闭后的复核项应可通过状态筛选找到')
  })

  await test('未填写处理人时不允许提交复核动作', async () => {
    const conversation = await createConversation()
    await addMessageToConversation(conversation.id, 'CUSTOMER', '飞机盒 3000 个，给个参考报价')
    await addMessageToConversation(
      conversation.id,
      'ASSISTANT',
      '当前先给参考报价。',
      {
        responseStatus: 'estimated',
        mergedParams: {
          productType: 'mailer_box',
          quantity: 3000,
        },
        estimatedData: {
          totalPrice: 1280,
          shippingFee: 120,
          finalPrice: 1400,
          unitPrice: 0.43,
        },
        packagingReview: {
          status: 'estimated',
          trialGateStatus: 'estimated_only_in_trial',
          statusReasonText: '当前路径在试运行内只允许参考报价。',
          conciseExplanation: '建议人工确认后再继续跟进。',
        },
      }
    )

    const response = await decisionPatch(
      new Request(`http://localhost/api/trial-reviews/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'MANUAL_CONFIRMED',
          operatorName: '   ',
          note: '测试空处理人',
        }),
      }),
      { params: { conversationId: String(conversation.id) } }
    )
    const payload = await response.json()

    assert(response.status === 400, '未填写处理人时应拒绝提交')
    assert(payload.error.includes('请先填写处理人'), '接口应明确提示先填写处理人')
  })

  await test('人工确认应写入时间、处理人和中文留痕，并支持状态筛选', async () => {
    const conversation = await createConversation()
    await addMessageToConversation(conversation.id, 'CUSTOMER', '双插盒 3000 个，先给个参考报价')
    await addMessageToConversation(
      conversation.id,
      'ASSISTANT',
      '当前先给参考报价。',
      {
        responseStatus: 'estimated',
        mergedParams: {
          productType: 'tuck_end_box',
          quantity: 3000,
          length: 18,
          width: 6,
          height: 4,
          sizeUnit: 'cm',
        },
        estimatedData: {
          totalPrice: 1320,
          shippingFee: 100,
          finalPrice: 1420,
          unitPrice: 0.44,
        },
        packagingReview: {
          status: 'estimated',
          trialGateStatus: 'estimated_only_in_trial',
          statusReasonText: '当前路径在试运行内只允许参考报价。',
          conciseExplanation: '建议人工确认后再继续跟进。',
          requiresHumanReview: false,
        },
      }
    )

    const response = await decisionPatch(
      new Request(`http://localhost/api/trial-reviews/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'MANUAL_CONFIRMED',
          operatorName: '销售B',
          note: '客户确认先按当前口径推进。',
        }),
      }),
      { params: { conversationId: String(conversation.id) } }
    )
    const payload = await response.json()

    assert(response.status === 200, '人工确认接口应返回 200')
    assert(payload.ok, '人工确认接口应返回成功')
    assert(payload.data.reviewStatus === 'MANUAL_CONFIRMED', '应更新为已人工确认')
    assert(payload.data.reviewStatusLabel === '已人工确认', '应返回中文状态标签')
    assert(payload.data.latestAudit?.actionLabel === '人工确认', '最新留痕应显示人工确认')
    assert(payload.data.latestAudit?.transitionLabel === '待复核 -> 已人工确认', '最新留痕应显示中文流转')
    assert(payload.data.manualConfirmedAt, '人工确认后应写入确认时间')
    assert(payload.data.operatorName === '销售B', '人工确认后应保留处理人')

    const feedbackFacts = new Map(payload.data.observation.feedbackSection.facts.map((item: { label: string; value: string }) => [item.label, item.value]))
    assert(feedbackFacts.get('当前复核状态') === '已人工确认', '观察面板反馈区应展示当前复核状态')
    assert(feedbackFacts.get('当前处理人') === '销售B', '观察面板反馈区应展示当前处理人')
    assert((feedbackFacts.get('最近处理备注') || '').includes('当前口径推进'), '观察面板反馈区应展示最近处理备注')

    const reviewCase = await prisma.trialReviewCase.findUnique({
      where: { conversationId: conversation.id },
      include: { auditLogs: { orderBy: { createdAt: 'desc' } } },
    })

    assert(Boolean(reviewCase?.manualConfirmedAt), '数据库中应保留人工确认时间')
    assert(reviewCase?.auditLogs.some((item: { actionType: string }) => item.actionType === 'MANUAL_CONFIRMED'), '数据库中应保留人工确认留痕')

    const filteredResponse = await queueGet(new Request('http://localhost/api/trial-reviews?status=MANUAL_CONFIRMED'))
    const filteredPayload = await filteredResponse.json()
    assert(filteredPayload.data.records.some((item: { conversationId: number }) => item.conversationId === conversation.id), '人工确认后的复核项应可通过状态筛选找到')
  })

  await test('quoted 打回反馈应留下结构化证据，并在 10 单连续同源同向后触发 calibration 重开信号', async () => {
    const driftSourceCandidate = 'carton_outer_carton_rate'

    for (let index = 0; index < 10; index += 1) {
      const conversation = await createConversation()
      await addMessageToConversation(conversation.id, 'CUSTOMER', `双插盒 ${index + 1}，客户反馈正式报价偏高`)
      await addMessageToConversation(
        conversation.id,
        'ASSISTANT',
        '当前可直接给正式报价。',
        {
          responseStatus: 'quoted',
          mergedParams: {
            productType: 'tuck_end_box',
            quantity: 5000 + index,
            length: 18,
            width: 6,
            height: 4,
            sizeUnit: 'cm',
            isBundle: false,
          },
          estimatedData: {
            totalPrice: 1560 + index,
            shippingFee: 100,
            finalPrice: 1660 + index,
            unitPrice: 0.33,
          },
          packagingReview: {
            status: 'quoted',
            trialGateStatus: 'allowed_quoted_in_trial',
            statusReasonText: '当前路径属于试运行正式报价范围。',
            conciseExplanation: '当前可以按正式报价继续推进。',
            requiresHumanReview: false,
          },
        }
      )

      const response = await decisionPatch(
        new Request(`http://localhost/api/trial-reviews/${conversation.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            status: 'CLOSED',
            sourceKind: 'QUOTED_FEEDBACK',
            operatorName: '销售C',
            note: '客户反馈当前正式报价偏高，先登记打回证据。',
            manualConfirmationResult: 'REJECTED_QUOTED_RESULT',
            rejectionReason: '客户反馈当前正式报价偏高。',
            rejectionCategory: 'price_too_high',
            rejectionTargetArea: 'carton_packaging',
            calibrationSignal: 'QUOTE_TOO_HIGH',
            driftSourceCandidate,
            driftDirection: 'HIGH',
            contextSnapshot: {
              feedbackType: 'quoted_rejection',
              conversationId: conversation.id,
              quoteId: null,
              currentPathLabel: '双插盒',
              bundleTypeLabel: '单项',
              currentQuoteStatusLabel: '正式报价',
              deliveryScopeLabel: '试运行正式报价范围',
              isActiveScope: true,
              mainItemTitle: '双插盒',
              subItemTitles: [],
            },
          }),
        }),
        { params: { conversationId: String(conversation.id) } }
      )
      const payload = await response.json()

      assert(response.status === 200, 'quoted 反馈登记接口应返回 200')
      assert(payload.ok, 'quoted 反馈登记接口应返回成功')
      assert(payload.data.sourceKind === 'QUOTED_FEEDBACK', 'quoted 反馈应被归类为 QUOTED_FEEDBACK')
      assert(payload.data.manualConfirmationResult === 'REJECTED_QUOTED_RESULT', '应保留结构化人工确认结论')
      assert(payload.data.rejectionReason.includes('偏高'), '应保留打回原因')
      assert(payload.data.rejectionCategory === 'price_too_high', '应保留打回分类')
      assert(payload.data.calibrationSignal === 'QUOTE_TOO_HIGH', '应保留 calibration 信号')
      assert(payload.data.driftSourceCandidate === driftSourceCandidate, '应保留疑似漂移源')
      assert(payload.data.driftDirection === 'HIGH', '应保留同向漂移方向')
      assert(payload.data.contextSnapshot?.conversationId === conversation.id, '应保留自动写入的上下文快照')
    }

    const response = await queueGet(new Request('http://localhost/api/trial-reviews?sourceKind=QUOTED_FEEDBACK&status=ALL'))
    const payload = await response.json()

    assert(response.status === 200, 'quoted 反馈筛选接口应返回 200')
    assert(payload.ok, 'quoted 反馈筛选接口应返回成功')
    assert(payload.data.records.length >= 10, 'quoted 反馈应可在队列中按来源筛选出来')
    assert(payload.data.calibrationReopen.totalQuotedFeedbackCount >= 10, '应累计正式报价反馈数量')
    assert(payload.data.calibrationReopen.consecutiveSameSourceDirectionCount >= 10, '应累计连续同源同向 drift 数量')
    assert(payload.data.calibrationReopen.driftSourceCandidate === driftSourceCandidate, '应返回当前连续漂移源')
    assert(payload.data.calibrationReopen.driftDirection === 'HIGH', '应返回当前连续漂移方向')
    assert(payload.data.calibrationReopen.triggered === true, '10 单连续同源同向后应触发 calibration 重开信号')
    assert(payload.data.weeklyDriftReview.totalQuotedFeedbackCount >= 10, '周归档应累计正式报价反馈数量')
    assert(payload.data.weeklyDriftReview.weeklyArchives.some((item: { rejectionCategoryBreakdown: Array<{ category: string; count: number }> }) => item.rejectionCategoryBreakdown.some((entry) => entry.category === 'price_too_high' && entry.count >= 1)), '周归档应包含打回分类聚合')
    assert(payload.data.weeklyDriftReview.weeklyArchives.some((item: { targetAreaBreakdown: Array<{ targetArea: string; count: number }> }) => item.targetAreaBreakdown.some((entry) => entry.targetArea === 'carton_packaging' && entry.count >= 1)), '周归档应包含目标区段聚合')
    assert(payload.data.weeklyDriftReview.currentSignal?.driftSourceCandidate === driftSourceCandidate, '周归档应返回当前连续漂移源')

    const reviewCase = await prisma.trialReviewCase.findFirst({
      where: {
        sourceKind: 'QUOTED_FEEDBACK',
        driftSourceCandidate,
      },
      orderBy: { createdAt: 'desc' },
    })

    assert(reviewCase?.manualConfirmationResult === 'REJECTED_QUOTED_RESULT', '数据库中应保留人工确认结论')
    assert(reviewCase?.rejectionCategory === 'price_too_high', '数据库中应保留打回分类')
    assert(reviewCase?.rejectionTargetArea === 'carton_packaging', '数据库中应保留打回目标区段')
    assert((reviewCase?.contextSnapshot as { currentPathLabel?: string } | null)?.currentPathLabel === '双插盒', '数据库中应保留上下文快照')
  })

  await test('转人工动作应创建 handoff 并把案例归入人工跟进来源', async () => {
    const conversation = await createConversation()
    await addMessageToConversation(conversation.id, 'CUSTOMER', '开窗彩盒带胶片，麻烦看下')
    await addMessageToConversation(
      conversation.id,
      'ASSISTANT',
      '当前路径需人工处理。',
      {
        responseStatus: 'handoff_required',
        mergedParams: {
          productType: 'window_box',
          quantity: 800,
          length: 21,
          width: 17,
          height: 31,
          sizeUnit: 'cm',
        },
        packagingReview: {
          status: 'handoff_required',
          trialGateStatus: 'handoff_only_in_trial',
          statusReasonText: '当前路径在试运行内只允许人工兜底。',
          conciseExplanation: '开窗结构和胶片参数需要人工确认。',
          requiresHumanReview: true,
        },
      }
    )

    const response = await decisionPatch(
      new Request(`http://localhost/api/trial-reviews/${conversation.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'HANDOFF_TO_HUMAN',
          operatorName: '陈工',
          note: '需要人工确认开窗结构与胶片厚度。',
        }),
      }),
      { params: { conversationId: String(conversation.id) } }
    )
    const payload = await response.json()

    assert(payload.ok, '转人工接口应返回成功')
    assert(payload.data.reviewStatus === 'HANDOFF_TO_HUMAN', '状态应更新为已转人工')

    const handoffs = await prisma.handoffRecord.findMany({
      where: { conversationId: conversation.id },
      orderBy: { createdAt: 'desc' },
    })

    assert(handoffs.length > 0, '转人工动作应创建 handoff 记录')
    assert(handoffs[0].reason.includes('人工确认开窗结构'), 'handoff 原因应复用本次处理备注')

    const filteredResponse = await queueGet(new Request('http://localhost/api/trial-reviews?sourceKind=HUMAN_FOLLOWUP'))
    const filteredPayload = await filteredResponse.json()
    const queuedItem = filteredPayload.data.records.find((item: { conversationId: number }) => item.conversationId === conversation.id)

    assert(Boolean(queuedItem), '转人工后的案例应出现在人工跟进筛选中')
    assert(queuedItem.sourceKindLabel === '人工跟进中', '来源标签应切换为人工跟进中')
    assert(queuedItem.observation.overviewCards[0].value === '当前需人工确认', '观察面板应显示当前需人工确认')
    assert(queuedItem.observation.reasonSection.guardrails.includes('已触发人工复核信号'), 'handoff path 应显示人工复核信号')
  })

  const passed = results.filter((item) => item.passed).length
  console.log(`\n总计: ${passed}/${results.length} 通过`)

  if (passed !== results.length) {
    process.exit(1)
  }
}

void main()