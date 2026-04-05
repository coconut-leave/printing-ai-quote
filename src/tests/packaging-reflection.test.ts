import { buildImprovementSuggestion } from '@/server/learning/improvementView'
import { generateReflection } from '@/server/learning/generateReflection'
import { getReflectionIssueTypeLabel } from '@/lib/reflection/issueTypes'

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

function test(name: string, fn: () => Promise<void> | void) {
  return Promise.resolve()
    .then(fn)
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

console.log('\n=== Complex Packaging Reflection 回归测试 ===\n')

async function main() {
  const originalOpenAiKey = process.env.OPENAI_API_KEY
  process.env.OPENAI_API_KEY = ''

  try {
    await test('开窗盒彩盒缺参应归因为包装参数缺失', async () => {
      const result = await generateReflection({
        conversationId: 9001,
        issueType: 'PACKAGING_PARAM_MISSING',
        originalExtractedParams: {
          productType: 'window_box',
          packagingContext: {
            mainItem: {
              productType: 'window_box',
              title: '开窗彩盒',
            },
            subItems: [],
            missingDetails: [
              {
                itemLabel: '开窗彩盒',
                productType: 'window_box',
                fields: ['windowSizeLength', 'windowSizeWidth'],
                fieldsText: '开窗尺寸',
              },
            ],
            packagingReview: {
              status: 'missing_fields',
              reviewReasons: [],
              missingDetails: [
                {
                  itemLabel: '开窗彩盒',
                  productType: 'window_box',
                  fields: ['windowSizeLength', 'windowSizeWidth'],
                  fieldsText: '开窗尺寸',
                },
              ],
            },
          },
        },
        correctedQuoteSummary: '人工复核后要求先补充开窗尺寸，再继续包装报价。',
      })

      assert(result.reflectionText.includes('开窗彩盒'), '反思文本应提到主件开窗彩盒')
      assert(result.reflectionText.includes('开窗尺寸'), '反思文本应提到缺失的窗口参数')
      assert(result.suggestionDraft.includes('补强复杂包装缺参识别'), '建议草案应聚焦缺参追问与识别')
    })

    await test('bundle 主件配件归属错误应归因为组合结构问题', async () => {
      const result = await generateReflection({
        conversationId: 9002,
        issueType: 'BUNDLE_STRUCTURE_WRONG',
        originalExtractedParams: {
          productType: 'tuck_end_box',
          packagingContext: {
            mainItem: {
              productType: 'tuck_end_box',
              title: '双插盒',
            },
            subItems: [
              { productType: 'leaflet_insert', title: '说明书' },
              { productType: 'box_insert', title: '内托' },
            ],
            packagingReview: {
              status: 'estimated',
              reviewReasons: [],
            },
          },
        },
      })

      assert(result.reflectionText.includes('主件：双插盒'), '反思文本应展示主件信息')
      assert(result.reflectionText.includes('配件：2 项'), '反思文本应展示 bundle 配件数')
      assert(result.suggestionDraft.includes('主件/配件归属'), '建议草案应聚焦 bundle 结构归属')
    })

    await test('策略边界错误应识别为应预报价却正式报价', async () => {
      const result = await generateReflection({
        conversationId: 9003,
        issueType: 'SHOULD_ESTIMATE_BUT_QUOTED',
        originalExtractedParams: {
          productType: 'window_box',
          packagingContext: {
            mainItem: {
              productType: 'window_box',
              title: '开窗彩盒',
            },
            subItems: [{ productType: 'seal_sticker', title: '封口贴' }],
            requiresHumanReview: true,
            reviewReasons: [
              { code: 'thick_window_film', label: '胶片偏厚', message: '胶片偏厚，建议人工复核' },
            ],
          },
        },
        originalQuoteSummary: '系统直接给出正式报价。',
        correctedQuoteSummary: '人工确认应先保留预报价，再安排人工复核。',
      })

      assert(result.reflectionText.includes('系统过早进入正式报价'), '反思文本应指出过早正式报价')
      assert(result.suggestionDraft.includes('正式报价/预报价边界判定'), '建议草案应聚焦 estimated/quoted 边界')
    })

    await test('复核原因不合理应识别为包装复核原因错误', async () => {
      const result = await generateReflection({
        conversationId: 9004,
        issueType: 'PACKAGING_REVIEW_REASON_WRONG',
        originalExtractedParams: {
          productType: 'window_box',
          packagingContext: {
            mainItem: {
              productType: 'window_box',
              title: '开窗彩盒',
            },
            reviewReasons: [
              { code: 'large_window_ratio', label: '开窗比例过大', message: '开窗面积占比过高' },
              { code: 'thick_window_film', label: '胶片偏厚', message: '胶片偏厚，建议人工复核' },
            ],
            packagingReview: {
              status: 'estimated',
              reviewReasons: [
                { code: 'large_window_ratio', label: '开窗比例过大', message: '开窗面积占比过高' },
                { code: 'thick_window_film', label: '胶片偏厚', message: '胶片偏厚，建议人工复核' },
              ],
            },
          },
        },
        correctedQuoteSummary: '人工复核后认为只需保留厚胶片原因，开窗比例原因不成立。',
      })

      assert(result.reflectionText.includes('开窗比例过大'), '反思文本应提到不合理的 review reason')
      assert(result.suggestionDraft.includes('校准包装复核说明'), '建议草案应聚焦 review reason 归因校准')
    })

    await test('improvement suggestion 应保留包装上下文与中文问题标签', () => {
      const improvement = buildImprovementSuggestion({
        id: 7001,
        conversationId: 8001,
        issueType: 'BUNDLE_STRUCTURE_WRONG',
        suggestionDraft: '建议加强复杂包装 bundle 的主件/配件归属、修改目标定位和 item 级缺参归属判断。',
        originalExtractedParams: {
          productType: 'tuck_end_box',
          packagingContext: {
            mainItem: { productType: 'tuck_end_box', title: '双插盒' },
            subItems: [{ productType: 'leaflet_insert', title: '说明书' }],
          },
        },
        correctedParams: null,
        createdAt: new Date('2026-04-03T10:00:00.000Z'),
      })

      assert(improvement.title.includes(getReflectionIssueTypeLabel('BUNDLE_STRUCTURE_WRONG')), '改进建议标题应保留中文 issueType 标签')
      assert(improvement.impactArea === 'PATCH', 'bundle 结构问题应进入 PATCH 影响区域')
      assert(improvement.contextSummary?.includes('主件：双插盒'), '改进建议应携带包装上下文摘要')
    })

    await test('packaging 主件字段修正应生成参数识别型改进建议', () => {
      const improvement = buildImprovementSuggestion({
        id: 7002,
        conversationId: 8002,
        issueType: 'PACKAGING_PARAM_WRONG',
        suggestionDraft: '旧的自由文本建议不应再主导 packaging improvement 归因。',
        originalExtractedParams: {
          productType: 'window_box',
          packagingContext: {
            mainItem: {
              productType: 'window_box',
              title: '开窗彩盒',
              material: '牛皮纸',
              printColor: 'black_1',
            },
          },
        },
        correctedParams: {
          productType: 'window_box',
          packagingContext: {
            mainItem: {
              productType: 'window_box',
              title: '开窗彩盒',
              material: 'white_card_350g',
              printColor: 'cmyk_4',
            },
          },
        },
        createdAt: new Date('2026-04-03T10:05:00.000Z'),
      })

      assert(improvement.diffCategory === 'PARAM_RECOGNITION', '主件字段修正应归因为参数识别问题')
      assert(improvement.suggestionType === 'FIELD_MAPPING_IMPROVEMENT', '参数识别问题应进入字段映射改进')
      assert(improvement.actionDraft?.targetArea === 'FIELD_MAPPING', '参数识别类 action draft 应落入 FIELD_MAPPING')
      assert(improvement.actionDraft?.changeType === 'mapping_update', '参数识别类 action draft 应标记为 mapping_update')
      assert(improvement.actionDraft?.actionTitle === '增强复杂包装字段映射', '应生成中文 actionTitle')
      assert(improvement.actionDraft?.implementationNote?.includes('补强 complex packaging 抽取与字段映射'), '应生成可执行 implementationNote')
      assert(improvement.actionDraft?.testHint?.includes('complex packaging 抽取回归测试'), '应生成 testHint')
      assert(improvement.actionDraft?.riskLevel === 'LOW', '字段映射类 action draft 应默认低风险')
      assert(improvement.issueSummary?.includes('复杂包装主件参数识别偏差'), '应生成中文问题摘要')
      assert(improvement.whyItHappened?.includes('结构化 diff'), '应明确说明归因来自结构化 diff')
      assert(improvement.suggestedActionHint?.includes('complex packaging'), '应给出明确动作提示')
      assert(improvement.suggestionDraft.includes('不要从 reflection 长文本反推包装参数'), '建议草案应优先基于结构化 diff 的规则描述')
    })

    await test('工艺自然语言理解偏差应生成 PROMPT action draft', () => {
      const improvement = buildImprovementSuggestion({
        id: 70021,
        conversationId: 80021,
        issueType: 'PACKAGING_PARAM_WRONG',
        suggestionDraft: '旧的自由文本建议不应再主导工艺理解归因。',
        originalExtractedParams: {
          productType: 'window_box',
          packagingContext: {
            mainItem: {
              productType: 'window_box',
              title: '开窗彩盒',
              surfaceFinish: 'matte_lamination',
              processes: ['啤'],
            },
          },
        },
        correctedParams: {
          productType: 'window_box',
          packagingContext: {
            mainItem: {
              productType: 'window_box',
              title: '开窗彩盒',
              surfaceFinish: 'glossy_lamination',
              processes: ['裱', '啤', '粘'],
            },
          },
        },
        createdAt: new Date('2026-04-03T10:07:00.000Z'),
      })

      assert(improvement.diffCategory === 'PARAM_RECOGNITION', '工艺理解偏差仍应归于参数识别大类')
      assert(improvement.suggestionType === 'PROMPT_IMPROVEMENT', '工艺自然语言理解偏差应进入 PROMPT 改进')
      assert(improvement.actionDraft?.targetArea === 'PROMPT', '工艺自然语言理解偏差应生成 PROMPT action draft')
      assert(improvement.actionDraft?.changeType === 'prompt_update', 'PROMPT action draft 应标记为 prompt_update')
      assert(improvement.actionDraft?.actionTitle === '增强复杂包装参数抽取提示', 'PROMPT action draft 应生成中文 actionTitle')
    })

    await test('packaging 子项增删应生成 bundle 结构型改进建议', () => {
      const improvement = buildImprovementSuggestion({
        id: 7003,
        conversationId: 8003,
        issueType: 'BUNDLE_STRUCTURE_WRONG',
        suggestionDraft: '旧的自由文本建议不应再主导 bundle 归因。',
        originalExtractedParams: {
          productType: 'tuck_end_box',
          packagingContext: {
            mainItem: { productType: 'tuck_end_box', title: '双插盒' },
            subItems: [],
          },
        },
        correctedParams: {
          productType: 'tuck_end_box',
          packagingContext: {
            mainItem: { productType: 'tuck_end_box', title: '双插盒' },
            subItems: [{ productType: 'leaflet_insert', title: '说明书' }],
          },
        },
        createdAt: new Date('2026-04-03T10:10:00.000Z'),
      })

      assert(improvement.diffCategory === 'BUNDLE_STRUCTURE', '子项增删应归因为 bundle 结构问题')
      assert(improvement.suggestionType === 'PROMPT_IMPROVEMENT', 'bundle 结构问题应进入 prompt 改进')
      assert(improvement.impactArea === 'PATCH', 'bundle 结构问题应落到 PATCH 影响区域')
      assert(improvement.actionDraft?.targetArea === 'PROMPT', 'bundle 结构类 action draft 应落入 PROMPT')
      assert(improvement.actionDraft?.changeType === 'prompt_update', 'bundle 结构类 action draft 应标记为 prompt_update')
      assert(improvement.actionDraft?.testHint?.includes('再加一个说明书/贴纸'), 'bundle 结构类 action draft 应提示 continuation 测试')
      assert(improvement.issueSummary?.includes('新增 1 个子项'), '问题摘要应体现子项结构变化')
    })

    await test('packaging quoted 与 estimated 切换应生成边界型改进建议', () => {
      const improvement = buildImprovementSuggestion({
        id: 7004,
        conversationId: 8004,
        issueType: 'SHOULD_ESTIMATE_BUT_QUOTED',
        suggestionDraft: '旧的自由文本建议不应再主导 quoted/estimated 归因。',
        originalExtractedParams: {
          productType: 'window_box',
          packagingContext: {
            mainItem: { productType: 'window_box', title: '开窗彩盒' },
            packagingReview: { status: 'quoted', reviewReasons: [] },
          },
        },
        correctedParams: {
          productType: 'window_box',
          packagingContext: {
            mainItem: { productType: 'window_box', title: '开窗彩盒' },
          },
        },
        createdAt: new Date('2026-04-03T10:15:00.000Z'),
      })

      assert(improvement.diffCategory === 'QUOTE_BOUNDARY', 'quoted/estimated 切换应归因为报价边界问题')
      assert(improvement.suggestionType === 'ESTIMATE_DEFAULT_IMPROVEMENT', '报价边界问题应进入 estimate 改进')
      assert(improvement.actionDraft?.targetArea === 'ESTIMATE', '报价边界类 action draft 应落入 ESTIMATE')
      assert(improvement.actionDraft?.changeType === 'threshold_update', '报价边界类 action draft 应标记为 threshold_update')
      assert(improvement.actionDraft?.riskLevel === 'MEDIUM', '报价边界类 action draft 应标记为中风险')
      assert(improvement.suggestionDraft.includes('不要改报价公式'), '边界型建议应明确不修改报价公式')
      assert(improvement.targetFileHint === 'src/server/packaging/extractComplexPackagingQuote.ts', '复杂包装边界问题应指向包装抽取与路径判断代码')
    })

    await test('packaging reviewReasons 变化应生成复核策略型改进建议', () => {
      const improvement = buildImprovementSuggestion({
        id: 7005,
        conversationId: 8005,
        issueType: 'PACKAGING_REVIEW_REASON_WRONG',
        suggestionDraft: '旧的自由文本建议不应再主导 review reason 归因。',
        originalExtractedParams: {
          productType: 'window_box',
          packagingContext: {
            mainItem: { productType: 'window_box', title: '开窗彩盒' },
            requiresHumanReview: false,
            reviewReasons: [
              { code: 'large_window_ratio', label: '开窗比例过大', message: '开窗面积占比过高' },
            ],
            packagingReview: {
              status: 'estimated',
              reviewReasons: [
                { code: 'large_window_ratio', label: '开窗比例过大', message: '开窗面积占比过高' },
              ],
            },
          },
        },
        correctedParams: {
          productType: 'window_box',
          packagingContext: {
            mainItem: { productType: 'window_box', title: '开窗彩盒' },
            requiresHumanReview: true,
            reviewReasons: [
              { code: 'thick_window_film', label: '胶片偏厚', message: '胶片偏厚，建议人工复核' },
            ],
            packagingReview: {
              status: 'estimated',
              reviewReasons: [
                { code: 'thick_window_film', label: '胶片偏厚', message: '胶片偏厚，建议人工复核' },
              ],
            },
          },
        },
        createdAt: new Date('2026-04-03T10:20:00.000Z'),
      })

      assert(improvement.diffCategory === 'REVIEW_POLICY', 'review reason 变化应归因为复核策略问题')
      assert(improvement.suggestionType === 'HANDOFF_POLICY_IMPROVEMENT', '复核策略问题应进入 handoff policy 改进')
      assert(improvement.impactArea === 'HANDOFF', '复核策略问题应影响 HANDOFF')
      assert(improvement.actionDraft?.targetArea === 'HANDOFF_POLICY', 'reviewReason 类 action draft 应落入 HANDOFF_POLICY')
      assert(improvement.actionDraft?.changeType === 'policy_update', 'reviewReason 类 action draft 应标记为 policy_update')
      assert(improvement.actionDraft?.testHint?.includes('requiresHumanReview 触发边界回归测试'), 'review policy 类 action draft 应提示策略测试')
      assert(improvement.whyItHappened?.includes('复核原因'), '归因说明应体现 review reason 变化')
    })

    await test('action draft 结构应稳定且字段完整可展示', () => {
      const improvement = buildImprovementSuggestion({
        id: 70051,
        conversationId: 80051,
        issueType: 'PACKAGING_PARAM_WRONG',
        suggestionDraft: '旧的自由文本建议不应再主导 packaging improvement 归因。',
        originalExtractedParams: {
          productType: 'window_box',
          packagingContext: {
            mainItem: {
              productType: 'window_box',
              title: '开窗彩盒',
              material: '牛皮纸',
            },
          },
        },
        correctedParams: {
          productType: 'window_box',
          packagingContext: {
            mainItem: {
              productType: 'window_box',
              title: '开窗彩盒',
              material: 'white_card_350g',
            },
          },
        },
        createdAt: new Date('2026-04-03T10:22:00.000Z'),
      })

      assert(Boolean(improvement.actionDraft), 'packaging 改进建议应生成 actionDraft')
      assert(typeof improvement.actionDraft?.actionTitle === 'string' && improvement.actionDraft.actionTitle.length > 0, 'actionTitle 应稳定存在')
      assert(typeof improvement.actionDraft?.targetArea === 'string' && improvement.actionDraft.targetArea.length > 0, 'targetArea 应稳定存在')
      assert(typeof improvement.actionDraft?.changeType === 'string' && improvement.actionDraft.changeType.length > 0, 'changeType 应稳定存在')
      assert(typeof improvement.actionDraft?.implementationNote === 'string' && improvement.actionDraft.implementationNote.length > 0, 'implementationNote 应稳定存在')
      assert(typeof improvement.actionDraft?.testHint === 'string' && improvement.actionDraft.testHint.length > 0, 'testHint 应稳定存在')
      assert(typeof improvement.actionDraft?.riskLevel === 'string' && improvement.actionDraft.riskLevel.length > 0, 'riskLevel 应稳定存在')
    })

    await test('非 packaging 改进建议应保持原有自由文本逻辑', () => {
      const improvement = buildImprovementSuggestion({
        id: 7006,
        conversationId: 8006,
        issueType: 'PARAM_MISSING',
        suggestionDraft: '建议补充缺失参数并完善默认值兜底逻辑。',
        originalExtractedParams: {
          productType: 'brochure',
          quantity: 1000,
        },
        correctedParams: {
          productType: 'brochure',
          quantity: 1000,
          pageCount: 16,
        },
        createdAt: new Date('2026-04-03T10:25:00.000Z'),
      })

      assert(improvement.diffCategory === undefined, '非 packaging 路径不应强行注入 diffCategory')
      assert(improvement.issueSummary === undefined, '非 packaging 路径不应强行注入结构化问题摘要')
      assert(improvement.actionDraft === undefined, '非 packaging 路径不应强行生成 action draft')
      assert(improvement.suggestionDraft === '建议补充缺失参数并完善默认值兜底逻辑。', '非 packaging 路径应保留原 suggestionDraft')
    })
  } finally {
    process.env.OPENAI_API_KEY = originalOpenAiKey
  }

  console.log('\n=== 测试总结 ===\n')
  const passed = results.filter((result) => result.passed).length
  const total = results.length

  console.log(`总计: ${passed}/${total} 通过`)
  if (passed < total) {
    process.exit(1)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})