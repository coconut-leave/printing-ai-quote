import OpenAI from 'openai'

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
  missingFields: string[]
}

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

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
    new RegExp(`${keyword}\\s*(\\d+)\\s*[克g]`, 'gi'),
    /(\d+)\s*[克g](?=[,，。\s]|$)/gi,
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
]

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

  // 补充纸张和克重
  if (enhanced.productType === 'album') {
    // 补充封面纸张
    if (!enhanced.coverPaper) {
      const coverPaperByMap = mapChineseTerm(userText, PAPER_TYPE_MAP)
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
      const innerPaperByMap = mapChineseTerm(userText, PAPER_TYPE_MAP)
      if (innerPaperByMap) {
        enhanced.innerPaper = innerPaperByMap
      }
    }

    // 补充内页克重
    if (!enhanced.innerWeight) {
      const innerWeightByRegex = extractWeightByRegex(userText, '内页|内页|正文')
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
  } else if (enhanced.productType === 'flyer') {
    // 补充纸张
    if (!enhanced.paperType) {
      const paperTypeByMap = mapChineseTerm(userText, PAPER_TYPE_MAP)
      if (paperTypeByMap) {
        enhanced.paperType = paperTypeByMap
      }
    }

    // 补充纸张克重
    if (!enhanced.paperWeight) {
      const paperWeightByRegex = extractWeightByRegex(userText, '纸张|克|g')
      if (paperWeightByRegex) {
        enhanced.paperWeight = paperWeightByRegex
      }
    }
  }

  return enhanced
}

function computeMissingFields(params: any, productType: string): string[] {
  const missing: string[] = []

  if (productType === 'flyer') {
    const required = ['finishedSize', 'quantity', 'paperType', 'paperWeight', 'printSides']
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
  if (!process.env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY is not set')
  }

  const prompt = `Extract quote parameters from this user text and return ONLY valid JSON without any markdown, explanation, or additional text:
"${userText}"

Return JSON with exactly these fields:
{
  "productType": string (map "画册/album" to "album", "传单/flyer" to "flyer", default "album"),
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
  "missingFields": array of strings listing fields that are null or empty
}

Rules:
- Extract values from the text if available, use null if not mentioned
- For flyer: paperType (not coverPaper), paperWeight (not coverWeight), printSides are the key fields
- For album: coverPaper, coverWeight, innerPaper, innerWeight, bindingType are key fields
- Always return missingFields array with names of null/empty fields relative to detected productType
- Do NOT calculate any prices
- Do NOT include any explanation text
- Return ONLY the JSON object`

  const response = await client.responses.create({
    model: 'gpt-4o-mini',
    input: prompt,
    max_output_tokens: 400,
  })

  let text: string | undefined
  try {
    const output = response.output as any
    text = output?.[0]?.text || output?.text
  } catch (err) {
    // fallback
  }
  if (!text) {
    return {
      missingFields: productionFields,
    } as ExtractedQuoteParams
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
    // 软失败：返回所有字段缺失
    return {
      missingFields: productionFields,
    } as ExtractedQuoteParams
  }

  let result: ExtractedQuoteParams = {
    productType: parsed.productType ?? 'album',
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
    missingFields: [],
  }

  if (!result.productType) {
    result.productType = 'album'
  }

  // ============ 应用规则补充 ============
  result = applyRegexFallback(userText, result)

  // ============ 计算最终缺失字段 ============
  const productType = (result.productType || 'album').toLowerCase()
  result.missingFields = computeMissingFields(result, productType)

  return result
}
