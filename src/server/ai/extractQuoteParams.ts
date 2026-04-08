import type OpenAI from 'openai'
import { requireOpenAIKey } from '@/server/config/env'

export type ExtractedQuoteParams = {
  productType?: string
  finishedSize?: string
  quantity?: number
  coverPaper?: string
  coverWeight?: number
  innerPaper?: string
  innerWeight?: number
  bindingType?: string
  pageCount?: number
  paperType?: string
  paperWeight?: number
  printSides?: string
  finishType?: string
  lamination?: string
  missingFields: string[]
}

let cachedOpenAIClient: OpenAI | null = null

async function getOpenAIClient(): Promise<OpenAI> {
  if (!cachedOpenAIClient) {
    const apiKey = requireOpenAIKey()
    const { default: OpenAIClient } = await import('openai')
    cachedOpenAIClient = new OpenAIClient({ apiKey })
  }
  return cachedOpenAIClient
}

// ============ 中文术语映射表 ============
const PRODUCT_TYPE_MAP: Record<string, string> = {
  '画册': 'album',
  '宣传册': 'album',
  '相册': 'album',
  '图册': 'album',
  '传单': 'flyer',
  '宣传单': 'flyer',
  '传单页': 'flyer',
  '彩页': 'flyer',
  '名片': 'business_card',
  '贺卡': 'business_card',
  '海报': 'poster',
  '招贴': 'poster',
  '宣传画': 'poster',
  '贴纸': 'sticker',
  '纸袋': 'paper_bag',
  '牛皮纸袋': 'paper_bag',
}

const PAPER_TYPE_MAP: Record<string, string> = {
  '铜版纸': 'coated',
  '哑粉纸': 'matte',
  '哑光纸': 'matte',
  '哑粉': 'matte',
  '艺术纸': 'art',
  '标准纸': 'standard',
  '白卡': 'card',
  '黑卡': 'black_card',
  '牛皮纸': 'kraft',
  '铜版': 'coated',
  '哑光': 'matte',
  '涂布纸': 'coated',
}

const BINDING_TYPE_MAP: Record<string, string> = {
  '骑马钉': 'saddle_stitch',
  '胶装': 'perfect_bind',
  '螺旋装': 'spiral',
  '硬壳': 'hardcover',
  '侧胶': 'side_glue',
  '无线胶': 'saddle_stitch',
}

const SIZE_MAP: Record<string, string> = {
  'a4': 'A4',
  'a3': 'A3',
  'a5': 'A5',
  'a6': 'A6',
  '210x297': 'A4',
  '297x420': 'A3',
}

// ============ 正则规则引擎 ============

function extractQuantityByRegex(text: string): number | undefined {
  // 匹配 "1000本", "1000份", "一千本", "1000个" 等
  const patterns = [
    /(\d+)\s*本(?![a-z])/gi,
    /(\d+)\s*份/gi,
    /(\d+)\s*个(?![^0-9])/gi,
    /(\d+)\s*张/gi,
    /(\d+)\s*幅/gi,
    /(\d+)\s*套/gi,
    /(\d+)\s*条/gi,
    /数量\s*[:：]\s*(\d+)/gi,
    /数量为\s*(\d+)/gi,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const numMatch = match[0].match(/\d+/)
      if (numMatch) {
        return parseInt(numMatch[0], 10)
      }
    }
  }

  // 中文数字转换
  if (text.includes('一千') || text.includes('1000')) {
    return 1000
  }

  return undefined
}

function extractPageCountByRegex(text: string): number | undefined {
  // 匹配 "32页", "32p", "页数:32" 等
  const patterns = [
    /(\d+)\s*页(?!数)/gi,
    /(?:p|P)(\d+)/gi,
    /页数\s*[:：]\s*(\d+)/gi,
    /(\d+)\s*p(?:ages)?/gi,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const numMatch = match[0].match(/\d+/)
      if (numMatch) {
        return parseInt(numMatch[0], 10)
      }
    }
  }

  return undefined
}

function extractSizeByRegex(text: string): string | undefined {
  // 匹配 "A4", "A3", "210x297mm" 等
  const patterns = [
    /([aA][0-9])\b/,
    /(\d+)\s*[xX×]\s*(\d+)\s*mm/i,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const sizeStr = match[0].toUpperCase()
      return SIZE_MAP[sizeStr.toLowerCase()] || sizeStr
    }
  }

  return undefined
}

function extractPrintSidesByRegex(text: string): string | undefined {
  // 匹配 "单面", "双面", "彩色", "四色" 等
  if (/单[色面印]/i.test(text)) {
    return 'single'
  }
  if (/双[色面印]|彩[色]|四色/i.test(text)) {
    return 'double'
  }
  return undefined
}

function extractWeightByRegex(text: string, keyword: string): number | undefined {
  // 匹配 "200g克", "200g", "157克" 等，关键词可能是 "封面", "内页", "纸张"
  const patterns = [
    new RegExp(`(?:${keyword})\\s*(\\d+)\\s*[克gG]`, 'gi'),
    /(\d+)\s*[克gG](?=[^0-9]|$)/gi,
  ]

  for (const pattern of patterns) {
    const match = text.match(pattern)
    if (match) {
      const numMatch = match[0].match(/\d+/)
      if (numMatch) {
        return parseInt(numMatch[0], 10)
      }
    }
  }

  return undefined
}

function extractPaperTypeByPosition(text: string, keyword: string): string | undefined {
  const segmentPattern = new RegExp(`(?:${keyword})[^,，。；;\n]{0,20}`, 'gi')
  const match = text.match(segmentPattern)
  if (match && match[0]) {
    return mapChineseTerm(match[0], PAPER_TYPE_MAP)
  }
  return undefined
}

function mapChineseTerm(text: string, termMap: Record<string, string>): string | undefined {
  const lowerText = text.toLowerCase()
  for (const [chinese, english] of Object.entries(termMap)) {
    if (lowerText.includes(chinese.toLowerCase())) {
      return english
    }
  }
  return undefined
}

function detectProductTypeByRegex(text: string): string | undefined {
  // 先用术语表
  let detected = mapChineseTerm(text, PRODUCT_TYPE_MAP)
  if (detected) {
    return detected
  }

  // 默认 album
  return undefined
}


const productionFields = [
  'productType',
  'finishedSize',
  'quantity',
  'coverPaper',
  'coverWeight',
  'innerPaper',
  'innerWeight',
  'bindingType',
  'pageCount',
  'paperType',
  'paperWeight',
  'printSides',
  'lamination',
]

const LAMINATION_MAP: Record<string, string> = {
  '不覆膜': 'none',
  '无覆膜': 'none',
  '光膜': 'glossy',
  '亮膜': 'glossy',
  '哑膜': 'matte',
  '磨砂膜': 'matte',
}

// ============ 混合抽取函数 ============

function applyRegexFallback(userText: string, llmResult: any): any {
  /**
   * 当 LLM 漏抽或错抽时，用规则来补充
   * 优先级：LLM 结果 > 规则补充
   */

  const enhanced = { ...llmResult }

  // 补充数量
  if (!enhanced.quantity) {
    const qtyByRegex = extractQuantityByRegex(userText)
    if (qtyByRegex) {
      enhanced.quantity = qtyByRegex
    }
  }

  // 补充产品类型
  if (!enhanced.productType) {
    const typeByRegex = detectProductTypeByRegex(userText)
    if (typeByRegex) {
      enhanced.productType = typeByRegex
    }
  }

  // 补充尺寸
  if (!enhanced.finishedSize) {
    const sizeByRegex = extractSizeByRegex(userText)
    if (sizeByRegex) {
      enhanced.finishedSize = sizeByRegex
    }
  }

  // 补充页数（仅 album）
  if (enhanced.productType === 'album' && !enhanced.pageCount) {
    const pageByRegex = extractPageCountByRegex(userText)
    if (pageByRegex) {
      enhanced.pageCount = pageByRegex
    }
  }

  // 补充单双面（仅 flyer）
  if (enhanced.productType === 'flyer' && !enhanced.printSides) {
    const sidesByRegex = extractPrintSidesByRegex(userText)
    if (sidesByRegex) {
      enhanced.printSides = sidesByRegex
    }
  }

  if (enhanced.productType === 'poster' && !enhanced.lamination) {
    const laminationByMap = mapChineseTerm(userText, LAMINATION_MAP)
    if (laminationByMap) {
      enhanced.lamination = laminationByMap
    }
  }

  // 补充纸张和克重
  if (enhanced.productType === 'album') {
    // 补充封面纸张
    if (!enhanced.coverPaper) {
      const coverPaperByMap =
        extractPaperTypeByPosition(userText, '封面') || mapChineseTerm(userText, PAPER_TYPE_MAP)
      if (coverPaperByMap) {
        enhanced.coverPaper = coverPaperByMap
      }
    }

    // 补充封面克重
    if (!enhanced.coverWeight) {
      const coverWeightByRegex = extractWeightByRegex(userText, '封面')
      if (coverWeightByRegex) {
        enhanced.coverWeight = coverWeightByRegex
      }
    }

    // 补充内页纸张
    if (!enhanced.innerPaper) {
      const innerPaperByMap =
        extractPaperTypeByPosition(userText, '内页|正文') || mapChineseTerm(userText, PAPER_TYPE_MAP)
      if (innerPaperByMap) {
        enhanced.innerPaper = innerPaperByMap
      }
    }

    // 补充内页克重
    if (!enhanced.innerWeight) {
      const innerWeightByRegex = extractWeightByRegex(userText, '内页|正文')
      if (innerWeightByRegex) {
        enhanced.innerWeight = innerWeightByRegex
      }
    }

    // 补充装订方式
    if (!enhanced.bindingType) {
      const bindingByMap = mapChineseTerm(userText, BINDING_TYPE_MAP)
      if (bindingByMap) {
        enhanced.bindingType = bindingByMap
      }
    }
  } else if (enhanced.productType === 'flyer' || enhanced.productType === 'business_card' || enhanced.productType === 'poster') {
    // 补充纸张
    if (!enhanced.paperType) {
      const paperTypeByMap = mapChineseTerm(userText, PAPER_TYPE_MAP)
      if (paperTypeByMap) {
        enhanced.paperType = paperTypeByMap
      }
    }

    // 补充纸张克重
    if (!enhanced.paperWeight) {
      const paperWeightByRegex = extractWeightByRegex(userText, '纸张|用纸|材质')
      if (paperWeightByRegex) {
        enhanced.paperWeight = paperWeightByRegex
      }
    }
  }

  return enhanced
}

function computeMissingFields(params: any, productType: string): string[] {
  const missing: string[] = []

  if (!productType) {
    return missing
  }

  if (productType === 'flyer') {
    const required = ['finishedSize', 'quantity', 'paperType', 'paperWeight', 'printSides']
    required.forEach(field => {
      if (!params[field]) {
        missing.push(field)
      }
    })
  } else if (productType === 'business_card') {
    const required = ['finishedSize', 'quantity', 'paperType', 'paperWeight', 'printSides']
    required.forEach(field => {
      if (!params[field]) {
        missing.push(field)
      }
    })
  } else if (productType === 'poster') {
    const required = ['finishedSize', 'quantity', 'paperType', 'paperWeight']
    required.forEach(field => {
      if (!params[field]) {
        missing.push(field)
      }
    })
  } else {
    // album
    const required = ['finishedSize', 'quantity', 'coverPaper', 'coverWeight', 'innerPaper', 'innerWeight', 'bindingType']
    required.forEach(field => {
      if (!params[field]) {
        missing.push(field)
      }
    })
  }

  return missing
}

export async function extractQuoteParams(userText: string): Promise<ExtractedQuoteParams> {
  // 首先尝试用正则表达式完全提取参数（降级策略）
  const regexOnlyResult = extractParamsByRegexOnly(userText)
  if (regexOnlyResult && regexOnlyResult.missingFields.length === 0) {
    // 如果正则表达式能完全提取所有参数，直接返回
    return regexOnlyResult
  }

  // 仅在需要调用 OpenAI 时才校验 API Key。
  requireOpenAIKey()

  // 尝试调用 OpenAI API，最多重试 2 次
  let lastError: Error | null = null
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const result = await callOpenAIWithTimeout(userText)
      return result
    } catch (err) {
      lastError = err as Error
      if (attempt < 3) {
        // 指数退避重试
        const delay = Math.pow(2, attempt - 1) * 1000 // 1s, 2s
        await new Promise(resolve => setTimeout(resolve, delay))
      }
    }
  }

  // 如果 OpenAI 完全失败，使用正则表达式结果
  console.warn('OpenAI API failed after retries, falling back to regex extraction:', lastError?.message)
  return regexOnlyResult || { missingFields: productionFields } as ExtractedQuoteParams
}

// 带超时的 OpenAI 调用
async function callOpenAIWithTimeout(userText: string): Promise<ExtractedQuoteParams> {
  const client = await getOpenAIClient()
  const prompt = `Extract quote parameters from this user text and return ONLY valid JSON without any markdown, explanation, or additional text:
"${userText}"

Return JSON with exactly these fields:
{
  "productType": string or null (map "画册/album" to "album", "传单/flyer" to "flyer", "名片/business card" to "business_card", "海报/poster" to "poster"; if not stable, return null),
  "finishedSize": string (map "A4" to "A4", "A3" to "A3", etc.),
  "quantity": number (extract number like 1000),
  "coverPaper": string (map "铜版纸" to "coated", "哑光纸" to "matte", "艺术纸" to "art", "标准纸" to "standard", for album only),
  "coverWeight": number (extract weight like 200, for album only),
  "innerPaper": string (same mapping as coverPaper, for album only),
  "innerWeight": number (extract weight like 157, for album only),
  "bindingType": string (map "骑马钉" to "saddle_stitch", "胶装" to "perfect_bind", "螺旋装" to "spiral", "其他" to "other", for album only),
  "pageCount": number or null (if not mentioned, set to null, for album only),
  "paperType": string (map "铜版纸" to "coated", "哑光纸" to "matte", "艺术纸" to "art", "标准纸" to "standard", for flyer only),
  "paperWeight": number (extract weight like 200, for flyer only),
  "printSides": string (map "单面" to "single", "双面" to "double", for flyer only),
  "lamination": string (map "不覆膜" to "none", "光膜" to "glossy", "哑膜" to "matte", for poster only),
  "missingFields": array of strings listing fields that are null or empty
}

Rules:
- Extract values from the text if available, use null if not mentioned
- If the text is noise, pure digits, gibberish, or cannot be stably mapped to a supported business product, keep productType as null
- For flyer: paperType (not coverPaper), paperWeight (not coverWeight), printSides are the key fields
- For poster: paperType, paperWeight are required; lamination is optional and can be null
- For album: coverPaper, coverWeight, innerPaper, innerWeight, bindingType are key fields
- Always return missingFields array with names of null/empty fields relative to detected productType
- Do NOT calculate any prices
- Do NOT include any explanation text
- Return ONLY the JSON object`

  // 创建带超时的 Promise
  const timeoutPromise = new Promise<never>((_, reject) => {
    setTimeout(() => reject(new Error('OpenAI API timeout after 30 seconds')), 30000)
  })

  const apiPromise = client.responses.create({
    model: 'gpt-4o-mini',
    input: prompt,
    max_output_tokens: 400,
  })

  const response = await Promise.race([apiPromise, timeoutPromise])

  let text: string | undefined
  try {
    const output = response.output as any
    text = output?.[0]?.text || output?.text
  } catch (err) {
    // fallback
  }
  if (!text) {
    throw new Error('No response text from OpenAI')
  }

  // 增强解析逻辑：提取 JSON
  let parsed: any
  try {
    // 移除可能的 markdown 包装
    let jsonText = text.trim()
    if (jsonText.startsWith('```json')) {
      jsonText = jsonText.replace(/^```json\s*/, '').replace(/\s*```$/, '')
    } else if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/^```\s*/, '').replace(/\s*```$/, '')
    }

    // 尝试找到 JSON 对象
    const jsonMatch = jsonText.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      jsonText = jsonMatch[0]
    }

    parsed = JSON.parse(jsonText)
  } catch (err) {
    throw new Error('Failed to parse OpenAI response as JSON')
  }

  let result: ExtractedQuoteParams = {
    productType: typeof parsed.productType === 'string' ? parsed.productType : undefined,
    finishedSize: parsed.finishedSize ?? undefined,
    quantity: parsed.quantity != null ? Number(parsed.quantity) : undefined,
    coverPaper: parsed.coverPaper ?? undefined,
    coverWeight: parsed.coverWeight != null ? Number(parsed.coverWeight) : undefined,
    innerPaper: parsed.innerPaper ?? undefined,
    innerWeight: parsed.innerWeight != null ? Number(parsed.innerWeight) : undefined,
    bindingType: parsed.bindingType ?? undefined,
    pageCount: parsed.pageCount != null ? Number(parsed.pageCount) : undefined,
    paperType: parsed.paperType ?? undefined,
    paperWeight: parsed.paperWeight != null ? Number(parsed.paperWeight) : undefined,
    printSides: parsed.printSides ?? undefined,
    lamination: parsed.lamination ?? undefined,
    missingFields: [],
  }

  // ============ 应用规则补充 ============
  result = applyRegexFallback(userText, result)

  // ============ 计算最终缺失字段 ============
  const productType = typeof result.productType === 'string' ? result.productType.toLowerCase() : ''
  result.missingFields = productType ? computeMissingFields(result, productType) : []

  return result
}

// ============ 纯正则表达式降级函数 ============

function extractParamsByRegexOnly(userText: string): ExtractedQuoteParams | null {
  /**
   * 当 OpenAI API 完全不可用时，使用纯正则表达式提取参数
   * 这是一个降级策略，提取能力有限，但能保证基本功能
   */

  const result: any = {
    missingFields: [],
  }

  // 提取产品类型
  const productType = detectProductTypeByRegex(userText)
  if (productType) {
    result.productType = productType
  }

  // 提取尺寸
  const size = extractSizeByRegex(userText)
  if (size) {
    result.finishedSize = size
  }

  // 提取数量
  const quantity = extractQuantityByRegex(userText)
  if (quantity) {
    result.quantity = quantity
  }

  // 根据产品类型提取特定字段
  if (result.productType === 'album') {
    // 提取页数
    const pageCount = extractPageCountByRegex(userText)
    if (pageCount) {
      result.pageCount = pageCount
    }

    // 提取封面纸张和克重
    const coverPaper =
      extractPaperTypeByPosition(userText, '封面') || mapChineseTerm(userText, PAPER_TYPE_MAP)
    if (coverPaper) {
      result.coverPaper = coverPaper
    }
    const coverWeight = extractWeightByRegex(userText, '封面')
    if (coverWeight) {
      result.coverWeight = coverWeight
    }

    // 提取内页纸张和克重
    const innerPaper =
      extractPaperTypeByPosition(userText, '内页|正文') || mapChineseTerm(userText, PAPER_TYPE_MAP)
    if (innerPaper) {
      result.innerPaper = innerPaper
    }
    const innerWeight = extractWeightByRegex(userText, '内页|正文')
    if (innerWeight) {
      result.innerWeight = innerWeight
    }

    // 提取装订方式
    const bindingType = mapChineseTerm(userText, BINDING_TYPE_MAP)
    if (bindingType) {
      result.bindingType = bindingType
    }
  } else if (result.productType === 'flyer' || result.productType === 'business_card' || result.productType === 'poster') {
    // 提取纸张类型和克重
    const paperType = mapChineseTerm(userText, PAPER_TYPE_MAP)
    if (paperType) {
      result.paperType = paperType
    }
    const paperWeight = extractWeightByRegex(userText, '纸张|用纸|材质')
    if (paperWeight) {
      result.paperWeight = paperWeight
    }

    // 提取单双面
    const printSides = extractPrintSidesByRegex(userText)
    if (printSides) {
      result.printSides = printSides
    }

    if (result.productType === 'poster') {
      const lamination = mapChineseTerm(userText, LAMINATION_MAP)
      if (lamination) {
        result.lamination = lamination
      }
    }
  }

  // 计算缺失字段
  const productTypeFinal = typeof result.productType === 'string' ? result.productType : ''
  result.missingFields = productTypeFinal ? computeMissingFields(result, productTypeFinal) : []

  // 如果没有任何参数被提取，返回 null
  const hasAnyParam = Object.keys(result).some(key =>
    key !== 'productType' && key !== 'missingFields' && result[key] != null
  )

  return hasAnyParam ? result : null
}
