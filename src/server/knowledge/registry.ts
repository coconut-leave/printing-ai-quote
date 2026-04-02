import { ProductType } from '@/lib/catalog/productSchemas'
import { ChatIntent } from '@/server/intent/detectIntent'

export type KnowledgeCategory = 'MATERIAL' | 'PROCESS' | 'SPEC' | 'SOLUTION'

export type RecommendationContextTag = 'company_profile' | 'event_promo' | 'business_networking' | 'economy'

export type KnowledgeCard = {
  id: string
  category: KnowledgeCategory
  title: string
  aliases: string[]
  keywords: string[]
  shortAnswer: string
  recommendedParams?: Record<string, any>
  applicableProductTypes?: ProductType[]
  contextTags?: RecommendationContextTag[]
  note?: string
  priority?: number
}

const MATERIAL_COATED_ANSWER = '铜版纸表面更光滑，色彩还原更鲜艳，比较适合画册、传单这类需要图片效果的产品。哑粉纸反光更弱，阅读感更柔和；艺术纸更强调质感。'
const MATERIAL_MATTE_ANSWER = '哑粉纸或哑光纸的反光更弱，阅读感更柔和，比较适合偏阅读体验的内容页或不希望表面太亮的印品。和铜版纸相比，它更克制，但图片表现通常没那么亮。'
const MATERIAL_WHITE_CARD_ANSWER = '白卡纸通常更挺、更硬，表面也相对平整，常见于名片、吊牌、卡片类成品。它比普通内页纸更有支撑感，适合需要一定硬挺度的印品。'
const MATERIAL_STANDARD_ANSWER = '双胶纸更偏书写和阅读体验，表面不像铜版纸那样亮，常见于文本类内容页、手册或说明材料。它更适合以文字阅读为主的场景，图片表现通常不如铜版纸鲜艳。'
const MATERIAL_ART_PAPER_ANSWER = '艺术纸更强调纹理和触感，适合需要质感表达的封面、名片或品牌宣传品。它的重点通常不是最低成本，而是让成品看起来更有识别度。'
const MATERIAL_WEIGHT_ANSWER = '常见理解是：157g 更常用于内页或普通宣传单，200g 更挺一些，适合封面或质感要求更高的单张，300g 往往更接近名片或厚卡纸手感。克重越高，纸张通常越挺、成本也越高。'
const MATERIAL_WEIGHT_128_ANSWER = '128g 一般属于比较轻的常见彩印纸张，常用于活动传单、折页或页数较多但希望控制成本的内页。它更轻、更省成本，但挺度会弱于 157g 及以上克重。'
const MATERIAL_WEIGHT_157_ANSWER = '157g 是比较常见的中间档克重，常用于画册内页、活动传单和常规海报。它在彩印效果、挺度和成本之间相对平衡，所以在标准方案里很常见。'
const MATERIAL_WEIGHT_200_ANSWER = '200g 通常比 157g 更挺，常见于画册封面、活动单张或需要更明显手感的宣传物料。它适合希望成品更稳、更有存在感，但又不想太厚的场景。'
const MATERIAL_WEIGHT_250_ANSWER = '250g 已经比较接近卡纸手感，常见于名片、邀请卡、品牌小卡或较厚的宣传单张。它的挺度明显更强，适合需要更硬挺成品的场景。'
const MATERIAL_WEIGHT_300_ANSWER = '300g 通常属于较厚的常见卡纸级别，常见于名片、封套卡、吊牌或高存在感单张。它更有厚实感，也通常意味着成本会进一步上升。'
const MATERIAL_WEIGHT_105_ANSWER = '105g 通常比 128g 更轻，常见于大批量派发单页、成本敏感的促销物料或内容较简单的活动宣传单。它更适合追求覆盖量和成本控制的场景。'
const MATERIAL_WEIGHT_350_ANSWER = '350g 已经接近更厚的卡纸手感，常见于高存在感名片、品牌卡或需要更明显厚实感的卡片类物料。它通常比 300g 更挺，也会带来更高成本。'
const MATERIAL_KRAFT_ANSWER = '牛皮纸更偏自然、朴素和手作感，常见在品牌小卡、吊牌或偏原色质感的宣传物料里。它的重点通常不是最鲜艳的彩印效果，而是自然风格和材质辨识度。'
const MATERIAL_POSTER_PAPER_ANSWER = '海报常见会先从 128g 或 157g 铜版纸起步。若更看重成本和大批量张贴，常会先从 128g 考虑；如果希望海报更挺一点、成品更稳，157g 会更常见。'
const MATERIAL_BUSINESS_CARD_PAPER_ANSWER = '名片常见会先从 250g 到 300g 铜版纸或白卡纸起步。若更看重成本和基础手感，可先看 250g；如果更在意存在感和厚实感，常见会直接用到 300g 甚至更高。'
const PROCESS_BINDING_ANSWER = '骑马钉更适合页数较少、预算更紧的画册或手册，翻阅轻便；胶装更适合页数较多、成册感更强的资料册，看起来更正式。如果您更看重成本和轻便，常见会先考虑骑马钉；如果更看重整体感，常见会考虑胶装。'
const PROCESS_PRINT_SIDES_ANSWER = '单面印刷更利于控制成本，适合信息量较少或张数较多的宣传品；双面印刷能提升信息承载量，也更适合内容稍多的传单或名片。实际选择通常要看预算、内容量和使用场景。'
const PROCESS_LAMINATION_ANSWER = '覆膜主要是给印品表面增加保护和手感，常见有光膜和哑膜。光膜看起来更亮、更突出颜色；哑膜反光更弱、质感更稳，常见于海报、封面、卡片类成品。'
const PROCESS_UV_ANSWER = 'UV 或局部上光通常用于提升局部亮点和层次感，常见在名片、封面或品牌物料上。它更偏展示效果，不是基础必选工艺，通常适合需要更强视觉重点的场景。'
const PROCESS_SADDLE_STITCH_ANSWER = '骑马钉更适合页数相对少、翻阅频率高、希望控成本的画册或活动手册。它更轻便、成本更稳，也适合作为第一版宣传册或活动资料的常见装订方式。'
const PROCESS_PERFECT_BIND_ANSWER = '胶装更适合页数较多、内容更完整、希望成册感更强的资料册或企业宣传册。它看起来更正式，通常适合企业介绍、产品目录和招商资料这类场景。'
const PROCESS_POSTER_FINISH_ANSWER = '海报是否覆膜，通常取决于张贴周期、使用环境和成品质感要求。短期活动、预算敏感时可先不覆膜；如果更看重耐磨、抗污或视觉完成度，再考虑加哑膜或光膜。'
const SPEC_ALBUM_A4_ANSWER = 'A4 画册常见会从 16 页、24 页、32 页这些规格开始考虑。内容较少时 16 到 24 页更常见；如果图文内容更完整，32 页会更稳妥。'
const SPEC_BUSINESS_CARD_ANSWER = '名片常见规格一般是 90x54mm 或 85x54mm，纸张常见会从 300g 左右开始考虑，整体会更有手感。'
const SPEC_FLYER_ANSWER = '传单常见会优先考虑 A4 或 A5，纸张多从 128g 到 157g 铜版纸开始，既兼顾彩印效果，也更适合控制成本。'
const SPEC_GENERAL_ANSWER = '规格建议通常要看用途、内容量和预算。常见做法是先按标准尺寸和常见克重起步，再根据用途微调。'
const SPEC_POSTER_ANSWER = '海报常见尺寸通常会先从 A3 和 A2 开始考虑。门店张贴、柜台展示或近距离观看时，A3 更常见；如果希望远距离更醒目，A2 往往更稳妥。'
const SPEC_COMPANY_ALBUM_ANSWER = '企业宣传册常见会先从 24 页或 32 页起步。信息比较精简时，24 页通常够用；如果要放更多产品介绍、案例或公司介绍，32 页会更常见。'
const SPEC_FLYER_A5_ANSWER = 'A5 传单更适合快节奏派发、桌面摆放或单次信息量较少的活动宣传。它比 A4 更省纸，也更适合预算敏感、需要大批量发放的场景。'
const SOLUTION_ALBUM_ANSWER = '画册常见标准方案一般会先按 A4、32 页、封面 200g、内页 157g、骑马钉起步，比较适合作为首轮沟通和估价参考。'
const SOLUTION_COMPANY_ALBUM_ANSWER = '企业宣传册常见方案一般会先按 A4、24 或 32 页、封面 250g 铜版纸、内页 157g 铜版纸、胶装起步，整体更正式，适合企业介绍、产品册和招商资料。'
const SOLUTION_FLYER_ANSWER = '传单常见标准方案一般会先按 A4、157g 铜版纸、双面印刷起步，兼顾彩印效果和成本控制。'
const SOLUTION_EVENT_FLYER_ANSWER = '活动传单常见方案一般会先按 A4 或 A5、128g 到 157g 铜版纸、双面印刷起步。若更重视控成本，常会先从 128g 开始；如果想让成品更挺一点，常会用到 157g。'
const SOLUTION_BUSINESS_CARD_ANSWER = '名片常见标准方案一般会先按 90x54mm、300g 铜版纸、双面印刷起步，作为首轮打样和报价参考比较常见。'
const SOLUTION_BUSINESS_CARD_BUSINESS_ANSWER = '商务名片更看重正式感和识别度，常见会先按 90x54mm、300g 铜版纸、双面印刷起步；如果想让名片更有存在感，再加 UV 或更强调质感的表面工艺。'
const SOLUTION_BUSINESS_CARD_ECONOMY_ANSWER = '如果更看重控成本，名片常见会先按 90x54mm、250g 铜版纸、双面印刷、不额外加工艺起步，整体更稳妥也更容易控制预算。'
const SOLUTION_POSTER_ANSWER = '海报常见标准方案一般会先按 A2 或 A3、157g 铜版纸、单面彩印起步；如果需要更耐用或更有成品质感，再考虑加哑膜或光膜。'
const SOLUTION_GENERAL_ANSWER = '如果您暂时没有特别明确的要求，常见标准方案可以这样起步：画册可先按 A4、32 页、封面 200g、内页 157g、骑马钉；传单可先按 A4、157g 铜版纸；名片可先按 300g 铜版纸、双面印刷。'
const SOLUTION_ALBUM_ECONOMY_ANSWER = '如果画册更看重控成本，常见会先按 A4、24 页、封面 200g、内页 128g、骑马钉起步，整体更轻，也更适合作为第一版经济方案。'
const SOLUTION_COMPANY_ALBUM_ECONOMY_ANSWER = '如果企业宣传册更看重控成本，常见会先按 A4、24 页、封面 200g、内页 128g、骑马钉起步，既保留基本展示效果，也更适合作为首轮经济方案。'
const SOLUTION_FLYER_ECONOMY_ANSWER = '如果传单更看重控成本，常见会先按 A4、128g 铜版纸、单面印刷起步；如果发放场景很多、单次信息量不大，这类方案通常更经济。'
const SOLUTION_EVENT_FLYER_ECONOMY_ANSWER = '如果活动传单更看重经济方案，常见会先按 A5、128g 铜版纸、单面印刷起步，更适合开业促销、现场派发或短周期活动。'
const SOLUTION_CATALOG_ANSWER = '如果是产品目录、招商册或产品手册，常见会先按 A4、32 页、封面 250g、内页 157g、胶装起步。这样整体更正式，也更适合持续展示和商务沟通。'
const SOLUTION_TRADE_SHOW_FLYER_ANSWER = '如果是展会、地推或现场派发传单，常见会先按 A5 或 A4、128g 到 157g 铜版纸、双面印刷起步。若更重视发放量和预算，A5 加 128g 会更常见。'
const SOLUTION_POSTER_EVENT_ANSWER = '如果是门店活动海报、开业海报或现场宣传海报，常见会先按 A2、157g 铜版纸、单面彩印起步。若需要更耐用或更稳的成品质感，再考虑加哑膜。'

const COMPANY_PROFILE_KEYWORDS = ['企业宣传册', '公司宣传册', '企业画册', '公司画册', '产品手册', '企业介绍', '公司介绍', '招商册', '招商手册', '产品目录', '品牌手册', '产品册']
const EVENT_PROMO_KEYWORDS = ['活动传单', '活动单页', '促销传单', '促销单页', '开业传单', '开业单页', '展会传单', '地推传单', '派发传单', '活动宣传单', '门店海报', '开业海报', '活动海报', '展会物料']
const BUSINESS_NETWORKING_KEYWORDS = ['商务名片', '公司名片', '老板名片', '总监名片', '见客户', '拜访客户', '交换名片', '商务场合', '正式一点', '高级一点']
const ECONOMY_KEYWORDS = ['预算有限', '预算不高', '便宜一点', '经济方案', '经济一点', '控成本', '低成本', '实惠一点', '省一点', '性价比', '划算一点']

export const KNOWLEDGE_REGISTRY: KnowledgeCard[] = [
  {
    id: 'material-coated-paper-generic',
    category: 'MATERIAL',
    title: '铜版纸',
    aliases: ['铜版纸'],
    keywords: ['图片', '色彩', '亮', '特点'],
    shortAnswer: MATERIAL_COATED_ANSWER,
    recommendedParams: {
      coverPaper: 'coated',
      coverWeight: 200,
      innerPaper: 'coated',
      innerWeight: 157,
      bindingType: 'saddle_stitch',
      finishedSize: 'A4',
    },
    applicableProductTypes: ['album'],
    note: '这是常见材料搭配方案，不是正式报价。',
    priority: 1,
  },
  {
    id: 'material-coated-paper-flyer',
    category: 'MATERIAL',
    title: '铜版纸（传单）',
    aliases: ['铜版纸'],
    keywords: ['传单', 'flyer'],
    shortAnswer: MATERIAL_COATED_ANSWER,
    recommendedParams: {
      paperType: 'coated',
      paperWeight: 157,
      printSides: 'double',
      finishedSize: 'A4',
    },
    applicableProductTypes: ['flyer'],
    note: '这是常见材料搭配方案，不是正式报价。',
    priority: 3,
  },
  {
    id: 'material-matte-paper',
    category: 'MATERIAL',
    title: '哑粉纸 / 哑光纸',
    aliases: ['哑粉纸', '哑粉', '哑光纸'],
    keywords: ['阅读', '反光', '柔和'],
    shortAnswer: MATERIAL_MATTE_ANSWER,
    recommendedParams: {
      coverPaper: 'matte',
      coverWeight: 200,
      innerPaper: 'matte',
      innerWeight: 157,
      bindingType: 'saddle_stitch',
      finishedSize: 'A4',
    },
    applicableProductTypes: ['album'],
    note: '这是常见哑粉纸画册方案，不是正式报价。',
    priority: 2,
  },
  {
    id: 'material-white-card-paper',
    category: 'MATERIAL',
    title: '白卡纸',
    aliases: ['白卡纸', '白卡'],
    keywords: ['名片', '卡片', '挺', '硬'],
    shortAnswer: MATERIAL_WHITE_CARD_ANSWER,
    recommendedParams: {
      paperType: 'standard',
      paperWeight: 300,
      printSides: 'double',
      finishedSize: '90x54mm',
    },
    applicableProductTypes: ['business_card'],
    note: '这是常见白卡类名片方案，不是正式报价。',
    priority: 3,
  },
  {
    id: 'material-standard-paper',
    category: 'MATERIAL',
    title: '双胶纸',
    aliases: ['双胶纸', '双胶'],
    keywords: ['阅读', '文字', '手册', '书写'],
    shortAnswer: MATERIAL_STANDARD_ANSWER,
    recommendedParams: {
      coverPaper: 'standard',
      coverWeight: 200,
      innerPaper: 'standard',
      innerWeight: 128,
      bindingType: 'perfect_bind',
      finishedSize: 'A4',
    },
    applicableProductTypes: ['album'],
    note: '这是常见双胶纸手册方案，不是正式报价。',
    priority: 2,
  },
  {
    id: 'material-art-paper',
    category: 'MATERIAL',
    title: '艺术纸',
    aliases: ['艺术纸'],
    keywords: ['质感', '纹理', '品牌', '封面'],
    shortAnswer: MATERIAL_ART_PAPER_ANSWER,
    recommendedParams: {
      paperType: 'art',
      paperWeight: 300,
      printSides: 'double',
      finishedSize: '90x54mm',
    },
    applicableProductTypes: ['business_card'],
    note: '这是常见艺术纸名片方案，不是正式报价。',
    priority: 2,
  },
  {
    id: 'material-common-weights-generic',
    category: 'MATERIAL',
    title: '常见克重',
    aliases: ['157g', '200g', '300g'],
    keywords: ['克重', '厚度', '挺度'],
    shortAnswer: MATERIAL_WEIGHT_ANSWER,
    recommendedParams: {
      coverWeight: 200,
      innerWeight: 157,
      finishedSize: 'A4',
    },
    applicableProductTypes: ['album'],
    note: '这是基于常见克重的参考方案，不是正式报价。',
    priority: 1,
  },
  {
    id: 'material-weight-128',
    category: 'MATERIAL',
    title: '128g 常见场景',
    aliases: ['128g', '128克'],
    keywords: ['克重', '传单', '内页', '轻', '铜版纸'],
    shortAnswer: MATERIAL_WEIGHT_128_ANSWER,
    recommendedParams: {
      paperType: 'coated',
      paperWeight: 128,
      printSides: 'double',
      finishedSize: 'A4',
    },
    applicableProductTypes: ['flyer'],
    note: '这是常见 128g 传单方案，不是正式报价。',
    priority: 4,
  },
  {
    id: 'material-weight-157',
    category: 'MATERIAL',
    title: '157g 常见场景',
    aliases: ['157g', '157克'],
    keywords: ['克重', '画册', '传单', '海报'],
    shortAnswer: MATERIAL_WEIGHT_157_ANSWER,
    recommendedParams: {
      paperType: 'coated',
      paperWeight: 157,
      printSides: 'double',
      finishedSize: 'A4',
    },
    applicableProductTypes: ['flyer'],
    note: '这是常见 157g 彩印方案，不是正式报价。',
    priority: 3,
  },
  {
    id: 'material-weight-200',
    category: 'MATERIAL',
    title: '200g 常见场景',
    aliases: ['200g', '200克'],
    keywords: ['克重', '封面', '挺', '单张'],
    shortAnswer: MATERIAL_WEIGHT_200_ANSWER,
    recommendedParams: {
      coverPaper: 'coated',
      coverWeight: 200,
      innerPaper: 'coated',
      innerWeight: 157,
      bindingType: 'saddle_stitch',
      finishedSize: 'A4',
    },
    applicableProductTypes: ['album'],
    note: '这是常见 200g 封面起步方案，不是正式报价。',
    priority: 3,
  },
  {
    id: 'material-weight-250',
    category: 'MATERIAL',
    title: '250g 常见场景',
    aliases: ['250g', '250克'],
    keywords: ['克重', '名片', '卡片', '挺'],
    shortAnswer: MATERIAL_WEIGHT_250_ANSWER,
    recommendedParams: {
      paperType: 'coated',
      paperWeight: 250,
      printSides: 'double',
      finishedSize: '90x54mm',
    },
    applicableProductTypes: ['business_card'],
    note: '这是常见 250g 名片方案，不是正式报价。',
    priority: 3,
  },
  {
    id: 'material-weight-300',
    category: 'MATERIAL',
    title: '300g 常见场景',
    aliases: ['300g', '300克'],
    keywords: ['克重', '名片', '吊牌', '厚'],
    shortAnswer: MATERIAL_WEIGHT_300_ANSWER,
    recommendedParams: {
      paperType: 'coated',
      paperWeight: 300,
      printSides: 'double',
      finishedSize: '90x54mm',
    },
    applicableProductTypes: ['business_card'],
    note: '这是常见 300g 卡纸方案，不是正式报价。',
    priority: 3,
  },
  {
    id: 'material-weight-105',
    category: 'MATERIAL',
    title: '105g 常见场景',
    aliases: ['105g', '105克'],
    keywords: ['克重', '单页', '活动', '轻'],
    shortAnswer: MATERIAL_WEIGHT_105_ANSWER,
    applicableProductTypes: ['flyer'],
    note: '这是偏经济、偏大批量单页的常见思路，正式价格仍需结合尺寸和数量。',
    priority: 3,
  },
  {
    id: 'material-weight-350',
    category: 'MATERIAL',
    title: '350g 常见场景',
    aliases: ['350g', '350克'],
    keywords: ['克重', '名片', '厚', '高级'],
    shortAnswer: MATERIAL_WEIGHT_350_ANSWER,
    recommendedParams: {
      paperType: 'coated',
      paperWeight: 350,
      printSides: 'double',
      finishedSize: '90x54mm',
    },
    applicableProductTypes: ['business_card'],
    note: '这是偏厚实手感的高存在感名片参考方案，不是正式报价。',
    priority: 4,
  },
  {
    id: 'material-kraft-paper',
    category: 'MATERIAL',
    title: '牛皮纸',
    aliases: ['牛皮纸'],
    keywords: ['自然', '复古', '原色', '包装'],
    shortAnswer: MATERIAL_KRAFT_ANSWER,
    note: '如果您想按牛皮纸做标准印刷品，我可以继续根据具体用途帮您收敛常见做法。',
    priority: 2,
  },
  {
    id: 'material-poster-paper-choice',
    category: 'MATERIAL',
    title: '海报纸张怎么选',
    aliases: ['海报纸张', '海报用什么纸', '海报纸'],
    keywords: ['海报', '纸张', '怎么选'],
    shortAnswer: MATERIAL_POSTER_PAPER_ANSWER,
    recommendedParams: {
      finishedSize: 'A2',
      paperType: 'coated',
      paperWeight: 157,
      lamination: 'none',
    },
    applicableProductTypes: ['poster'],
    note: '这是常见海报起步配置，不是正式报价。',
    priority: 4,
  },
  {
    id: 'material-business-card-paper-choice',
    category: 'MATERIAL',
    title: '名片纸张怎么选',
    aliases: ['名片纸张', '名片材质', '名片用什么纸'],
    keywords: ['名片', '纸张', '材质', '怎么选'],
    shortAnswer: MATERIAL_BUSINESS_CARD_PAPER_ANSWER,
    recommendedParams: {
      finishedSize: '90x54mm',
      paperType: 'coated',
      paperWeight: 300,
      printSides: 'double',
    },
    applicableProductTypes: ['business_card'],
    note: '这是常见名片纸张起步配置，不是正式报价。',
    priority: 4,
  },
  {
    id: 'material-common-weights-business-card',
    category: 'MATERIAL',
    title: '常见克重（名片）',
    aliases: ['157g', '200g', '300g'],
    keywords: ['克重', '名片'],
    shortAnswer: MATERIAL_WEIGHT_ANSWER,
    recommendedParams: {
      paperType: 'coated',
      paperWeight: 300,
      printSides: 'double',
      finishedSize: '90x54mm',
    },
    applicableProductTypes: ['business_card'],
    note: '这是基于常见克重的参考方案，不是正式报价。',
    priority: 3,
  },
  {
    id: 'process-binding-comparison',
    category: 'PROCESS',
    title: '骑马钉与胶装',
    aliases: ['骑马钉', '胶装'],
    keywords: ['装订', '区别', '哪个好'],
    shortAnswer: PROCESS_BINDING_ANSWER,
    recommendedParams: {
      finishedSize: 'A4',
      pageCount: 32,
      coverWeight: 200,
      innerWeight: 157,
      bindingType: 'saddle_stitch',
    },
    applicableProductTypes: ['album'],
    note: '这是常见骑马钉画册方案，不是正式报价。',
    priority: 3,
  },
  {
    id: 'process-print-sides',
    category: 'PROCESS',
    title: '单面 / 双面',
    aliases: ['单面', '双面'],
    keywords: ['印刷', '区别', '怎么选'],
    shortAnswer: PROCESS_PRINT_SIDES_ANSWER,
    recommendedParams: {
      finishedSize: 'A4',
      paperType: 'coated',
      paperWeight: 157,
      printSides: 'double',
    },
    applicableProductTypes: ['flyer'],
    note: '这是常见单双面传单方案，不是正式报价。',
    priority: 2,
  },
  {
    id: 'process-lamination',
    category: 'PROCESS',
    title: '覆膜说明',
    aliases: ['覆膜', '光膜', '哑膜'],
    keywords: ['保护', '手感', '海报', '封面'],
    shortAnswer: PROCESS_LAMINATION_ANSWER,
    recommendedParams: {
      finishedSize: 'A2',
      paperType: 'coated',
      paperWeight: 157,
      lamination: 'matte',
    },
    applicableProductTypes: ['poster'],
    note: '这是常见覆膜海报方案，不是正式报价。',
    priority: 3,
  },
  {
    id: 'process-uv',
    category: 'PROCESS',
    title: 'UV / 上光',
    aliases: ['uv', '局部uv', '上光'],
    keywords: ['名片', '封面', '亮点', '质感'],
    shortAnswer: PROCESS_UV_ANSWER,
    recommendedParams: {
      finishedSize: '90x54mm',
      paperType: 'coated',
      paperWeight: 300,
      printSides: 'double',
      finishType: 'uv',
    },
    applicableProductTypes: ['business_card'],
    note: '这是常见 UV 名片方案，不是正式报价。',
    priority: 2,
  },
  {
    id: 'process-saddle-stitch-usage',
    category: 'PROCESS',
    title: '骑马钉适用场景',
    aliases: ['骑马钉'],
    keywords: ['适合', '场景', '预算', '页数'],
    shortAnswer: PROCESS_SADDLE_STITCH_ANSWER,
    recommendedParams: {
      finishedSize: 'A4',
      pageCount: 24,
      coverPaper: 'coated',
      coverWeight: 200,
      innerPaper: 'coated',
      innerWeight: 128,
      bindingType: 'saddle_stitch',
    },
    applicableProductTypes: ['album'],
    note: '这是偏轻便和控成本的骑马钉参考方案，不是正式报价。',
    priority: 4,
  },
  {
    id: 'process-perfect-bind-usage',
    category: 'PROCESS',
    title: '胶装适用场景',
    aliases: ['胶装'],
    keywords: ['适合', '场景', '正式', '页数'],
    shortAnswer: PROCESS_PERFECT_BIND_ANSWER,
    recommendedParams: {
      finishedSize: 'A4',
      pageCount: 32,
      coverPaper: 'coated',
      coverWeight: 250,
      innerPaper: 'coated',
      innerWeight: 157,
      bindingType: 'perfect_bind',
    },
    applicableProductTypes: ['album'],
    note: '这是偏正式资料册的胶装参考方案，不是正式报价。',
    priority: 4,
  },
  {
    id: 'process-poster-finish-choice',
    category: 'PROCESS',
    title: '海报要不要覆膜',
    aliases: ['海报覆膜', '海报要不要覆膜'],
    keywords: ['海报', '覆膜', '耐用', '保护'],
    shortAnswer: PROCESS_POSTER_FINISH_ANSWER,
    recommendedParams: {
      finishedSize: 'A2',
      paperType: 'coated',
      paperWeight: 157,
      lamination: 'matte',
    },
    applicableProductTypes: ['poster'],
    note: '这是偏耐用和完成度更高的海报参考方案，不是正式报价。',
    priority: 4,
  },
  {
    id: 'spec-album-a4-pages',
    category: 'SPEC',
    title: 'A4 画册常见页数',
    aliases: ['a4'],
    keywords: ['画册', '页数', '多少页'],
    shortAnswer: SPEC_ALBUM_A4_ANSWER,
    recommendedParams: {
      finishedSize: 'A4',
      pageCount: 32,
      coverPaper: 'coated',
      coverWeight: 200,
      innerPaper: 'coated',
      innerWeight: 157,
      bindingType: 'saddle_stitch',
    },
    applicableProductTypes: ['album'],
    note: '这是常见 A4 画册规格方案，不是正式报价。',
    priority: 3,
  },
  {
    id: 'spec-business-card-size',
    category: 'SPEC',
    title: '名片常见尺寸',
    aliases: ['名片'],
    keywords: ['尺寸', '规格', '90x54', '85x54'],
    shortAnswer: SPEC_BUSINESS_CARD_ANSWER,
    recommendedParams: {
      finishedSize: '90x54mm',
      paperType: 'coated',
      paperWeight: 300,
      printSides: 'double',
    },
    applicableProductTypes: ['business_card'],
    note: '这是常见名片规格方案，不是正式报价。',
    priority: 3,
  },
  {
    id: 'spec-flyer-weight',
    category: 'SPEC',
    title: '传单常见克重',
    aliases: ['传单'],
    keywords: ['克重', '规格', 'a4', 'a5'],
    shortAnswer: SPEC_FLYER_ANSWER,
    recommendedParams: {
      finishedSize: 'A4',
      paperType: 'coated',
      paperWeight: 157,
      printSides: 'double',
    },
    applicableProductTypes: ['flyer'],
    note: '这是常见传单规格方案，不是正式报价。',
    priority: 3,
  },
  {
    id: 'spec-poster-size',
    category: 'SPEC',
    title: '海报常见尺寸',
    aliases: ['海报尺寸', '海报规格', '海报常见尺寸'],
    keywords: ['海报', 'a2', 'a3', '尺寸', '规格'],
    shortAnswer: SPEC_POSTER_ANSWER,
    recommendedParams: {
      finishedSize: 'A2',
      paperType: 'coated',
      paperWeight: 157,
    },
    applicableProductTypes: ['poster'],
    note: '这是常见海报尺寸起步方案，不是正式报价。',
    priority: 4,
  },
  {
    id: 'spec-company-album-pages',
    category: 'SPEC',
    title: '企业宣传册常见页数',
    aliases: ['企业宣传册页数', '宣传册页数', '产品册页数', '产品目录页数', '招商册页数'],
    keywords: ['页数', '宣传册', '产品册', '产品目录', '招商册', '企业'],
    shortAnswer: SPEC_COMPANY_ALBUM_ANSWER,
    recommendedParams: {
      finishedSize: 'A4',
      pageCount: 32,
      coverPaper: 'coated',
      coverWeight: 250,
      innerPaper: 'coated',
      innerWeight: 157,
      bindingType: 'perfect_bind',
    },
    applicableProductTypes: ['album'],
    note: '这是常见企业宣传册页数起步方案，不是正式报价。',
    priority: 4,
  },
  {
    id: 'spec-flyer-a5-usage',
    category: 'SPEC',
    title: 'A5 传单适用场景',
    aliases: ['a5传单', 'a5 单页', 'a5 宣传单'],
    keywords: ['a5', '传单', '场景', '派发'],
    shortAnswer: SPEC_FLYER_A5_ANSWER,
    recommendedParams: {
      finishedSize: 'A5',
      paperType: 'coated',
      paperWeight: 128,
      printSides: 'single',
    },
    applicableProductTypes: ['flyer'],
    note: '这是偏派发和控成本的 A5 传单起步方案，不是正式报价。',
    priority: 4,
  },
  {
    id: 'spec-general',
    category: 'SPEC',
    title: '通用规格建议',
    aliases: ['规格', '尺寸'],
    keywords: ['建议', '怎么选', '一般'],
    shortAnswer: SPEC_GENERAL_ANSWER,
    recommendedParams: {
      finishedSize: 'A4',
    },
    applicableProductTypes: ['album'],
    note: '这是常见标准尺寸起步方案，不是正式报价。',
    priority: 1,
  },
  {
    id: 'solution-album-standard',
    category: 'SOLUTION',
    title: '画册标准方案',
    aliases: ['画册'],
    keywords: ['标准方案', '常见方案', '推荐'],
    shortAnswer: SOLUTION_ALBUM_ANSWER,
    recommendedParams: {
      finishedSize: 'A4',
      pageCount: 32,
      coverPaper: 'coated',
      coverWeight: 200,
      innerPaper: 'coated',
      innerWeight: 157,
      bindingType: 'saddle_stitch',
    },
    applicableProductTypes: ['album'],
    note: '这是常见画册标准方案，不是正式报价。',
    priority: 3,
  },
  {
    id: 'solution-company-album-standard',
    category: 'SOLUTION',
    title: '企业宣传册常见方案',
    aliases: ['企业宣传册', '宣传册', '企业画册'],
    keywords: ['标准方案', '常见方案', '推荐'],
    shortAnswer: SOLUTION_COMPANY_ALBUM_ANSWER,
    recommendedParams: {
      finishedSize: 'A4',
      pageCount: 32,
      coverPaper: 'coated',
      coverWeight: 250,
      innerPaper: 'coated',
      innerWeight: 157,
      bindingType: 'perfect_bind',
    },
    applicableProductTypes: ['album'],
    contextTags: ['company_profile'],
    note: '这是常见企业宣传册方案，不是正式报价。',
    priority: 4,
  },
  {
    id: 'solution-catalog-standard',
    category: 'SOLUTION',
    title: '产品目录 / 招商册方案',
    aliases: ['产品目录', '招商册', '招商手册', '产品手册'],
    keywords: ['方案', '推荐', '常见配置'],
    shortAnswer: SOLUTION_CATALOG_ANSWER,
    recommendedParams: {
      finishedSize: 'A4',
      pageCount: 32,
      coverPaper: 'coated',
      coverWeight: 250,
      innerPaper: 'coated',
      innerWeight: 157,
      bindingType: 'perfect_bind',
    },
    applicableProductTypes: ['album'],
    contextTags: ['company_profile'],
    note: '这是产品目录或招商册常见起步方案，不是正式报价。',
    priority: 5,
  },
  {
    id: 'solution-album-economy',
    category: 'SOLUTION',
    title: '画册经济方案',
    aliases: ['画册'],
    keywords: ['经济方案', '预算有限', '便宜一点', '控成本'],
    shortAnswer: SOLUTION_ALBUM_ECONOMY_ANSWER,
    recommendedParams: {
      finishedSize: 'A4',
      pageCount: 24,
      coverPaper: 'coated',
      coverWeight: 200,
      innerPaper: 'coated',
      innerWeight: 128,
      bindingType: 'saddle_stitch',
    },
    applicableProductTypes: ['album'],
    contextTags: ['economy'],
    note: '这是基于预算倾向的画册经济参考方案，不是正式报价。',
    priority: 4,
  },
  {
    id: 'solution-company-album-economy',
    category: 'SOLUTION',
    title: '企业宣传册经济方案',
    aliases: ['企业宣传册', '宣传册', '企业画册', '公司宣传册'],
    keywords: ['经济方案', '预算有限', '便宜一点', '控成本'],
    shortAnswer: SOLUTION_COMPANY_ALBUM_ECONOMY_ANSWER,
    recommendedParams: {
      finishedSize: 'A4',
      pageCount: 24,
      coverPaper: 'coated',
      coverWeight: 200,
      innerPaper: 'coated',
      innerWeight: 128,
      bindingType: 'saddle_stitch',
    },
    applicableProductTypes: ['album'],
    contextTags: ['company_profile', 'economy'],
    note: '这是基于企业宣传用途和预算倾向的经济参考方案，不是正式报价。',
    priority: 5,
  },
  {
    id: 'solution-flyer-standard',
    category: 'SOLUTION',
    title: '传单标准方案',
    aliases: ['传单'],
    keywords: ['标准方案', '常见方案', '推荐'],
    shortAnswer: SOLUTION_FLYER_ANSWER,
    recommendedParams: {
      finishedSize: 'A4',
      paperType: 'coated',
      paperWeight: 157,
      printSides: 'double',
    },
    applicableProductTypes: ['flyer'],
    note: '这是常见传单标准方案，不是正式报价。',
    priority: 3,
  },
  {
    id: 'solution-flyer-economy',
    category: 'SOLUTION',
    title: '传单经济方案',
    aliases: ['传单'],
    keywords: ['经济方案', '预算有限', '便宜一点', '控成本'],
    shortAnswer: SOLUTION_FLYER_ECONOMY_ANSWER,
    recommendedParams: {
      finishedSize: 'A4',
      paperType: 'coated',
      paperWeight: 128,
      printSides: 'single',
    },
    applicableProductTypes: ['flyer'],
    contextTags: ['economy'],
    note: '这是基于预算倾向的传单经济参考方案，不是正式报价。',
    priority: 4,
  },
  {
    id: 'solution-event-flyer-standard',
    category: 'SOLUTION',
    title: '活动传单常见方案',
    aliases: ['活动传单', '促销传单', '活动单页'],
    keywords: ['标准方案', '常见方案', '推荐'],
    shortAnswer: SOLUTION_EVENT_FLYER_ANSWER,
    recommendedParams: {
      finishedSize: 'A4',
      paperType: 'coated',
      paperWeight: 128,
      printSides: 'double',
    },
    applicableProductTypes: ['flyer'],
    contextTags: ['event_promo'],
    note: '这是常见活动传单方案，不是正式报价。',
    priority: 4,
  },
  {
    id: 'solution-tradeshow-flyer-standard',
    category: 'SOLUTION',
    title: '展会 / 地推传单方案',
    aliases: ['展会传单', '地推传单', '现场派发传单', '展会物料'],
    keywords: ['方案', '推荐', '常见配置'],
    shortAnswer: SOLUTION_TRADE_SHOW_FLYER_ANSWER,
    recommendedParams: {
      finishedSize: 'A5',
      paperType: 'coated',
      paperWeight: 128,
      printSides: 'double',
    },
    applicableProductTypes: ['flyer'],
    contextTags: ['event_promo'],
    note: '这是展会和现场派发传单的常见起步方案，不是正式报价。',
    priority: 5,
  },
  {
    id: 'solution-event-flyer-economy',
    category: 'SOLUTION',
    title: '活动传单经济方案',
    aliases: ['活动传单', '促销传单', '活动单页', '促销单页'],
    keywords: ['经济方案', '预算有限', '便宜一点', '控成本'],
    shortAnswer: SOLUTION_EVENT_FLYER_ECONOMY_ANSWER,
    recommendedParams: {
      finishedSize: 'A5',
      paperType: 'coated',
      paperWeight: 128,
      printSides: 'single',
    },
    applicableProductTypes: ['flyer'],
    contextTags: ['event_promo', 'economy'],
    note: '这是基于活动派发场景和预算倾向的经济参考方案，不是正式报价。',
    priority: 5,
  },
  {
    id: 'solution-business-card-standard',
    category: 'SOLUTION',
    title: '名片标准方案',
    aliases: ['名片'],
    keywords: ['标准方案', '常见方案', '推荐'],
    shortAnswer: SOLUTION_BUSINESS_CARD_ANSWER,
    recommendedParams: {
      finishedSize: '90x54mm',
      paperType: 'coated',
      paperWeight: 300,
      printSides: 'double',
    },
    applicableProductTypes: ['business_card'],
    note: '这是常见名片标准方案，不是正式报价。',
    priority: 3,
  },
  {
    id: 'solution-business-card-business',
    category: 'SOLUTION',
    title: '商务名片方案',
    aliases: ['商务名片', '公司名片', '老板名片'],
    keywords: ['推荐', '常见方案', '标准方案', '正式一点'],
    shortAnswer: SOLUTION_BUSINESS_CARD_BUSINESS_ANSWER,
    recommendedParams: {
      finishedSize: '90x54mm',
      paperType: 'coated',
      paperWeight: 300,
      printSides: 'double',
      finishType: 'uv',
    },
    applicableProductTypes: ['business_card'],
    contextTags: ['business_networking'],
    note: '这是基于商务场景的常见名片方案，不是正式报价。',
    priority: 5,
  },
  {
    id: 'solution-business-card-economy',
    category: 'SOLUTION',
    title: '名片经济方案',
    aliases: ['商务名片', '名片', '公司名片'],
    keywords: ['经济方案', '预算有限', '便宜一点', '控成本'],
    shortAnswer: SOLUTION_BUSINESS_CARD_ECONOMY_ANSWER,
    recommendedParams: {
      finishedSize: '90x54mm',
      paperType: 'coated',
      paperWeight: 250,
      printSides: 'double',
      finishType: 'none',
    },
    applicableProductTypes: ['business_card'],
    contextTags: ['economy'],
    note: '这是基于预算倾向的名片经济参考方案，不是正式报价。',
    priority: 5,
  },
  {
    id: 'solution-poster-standard',
    category: 'SOLUTION',
    title: '海报标准方案',
    aliases: ['海报'],
    keywords: ['标准方案', '常见方案', '推荐'],
    shortAnswer: SOLUTION_POSTER_ANSWER,
    recommendedParams: {
      finishedSize: 'A2',
      paperType: 'coated',
      paperWeight: 157,
      lamination: 'none',
    },
    applicableProductTypes: ['poster'],
    note: '这是常见海报标准方案，不是正式报价。',
    priority: 4,
  },
  {
    id: 'solution-poster-event-standard',
    category: 'SOLUTION',
    title: '活动海报方案',
    aliases: ['活动海报', '开业海报', '门店海报'],
    keywords: ['方案', '推荐', '常见配置'],
    shortAnswer: SOLUTION_POSTER_EVENT_ANSWER,
    recommendedParams: {
      finishedSize: 'A2',
      paperType: 'coated',
      paperWeight: 157,
      lamination: 'matte',
    },
    applicableProductTypes: ['poster'],
    contextTags: ['event_promo'],
    note: '这是活动海报常见起步方案，不是正式报价。',
    priority: 5,
  },
  {
    id: 'solution-general-standard',
    category: 'SOLUTION',
    title: '通用标准方案',
    aliases: ['标准方案', '常见方案', '推荐一个'],
    keywords: ['推荐', '方案', '配置', '搭配'],
    shortAnswer: SOLUTION_GENERAL_ANSWER,
    recommendedParams: {
      finishedSize: 'A4',
      pageCount: 32,
      coverPaper: 'coated',
      coverWeight: 200,
      innerPaper: 'coated',
      innerWeight: 157,
      bindingType: 'saddle_stitch',
    },
    applicableProductTypes: ['album'],
    note: '这是最常见标准方案之一，不是正式报价。',
    priority: 2,
  },
]

function detectProductTypes(message: string): ProductType[] {
  const text = message.toLowerCase()
  const productTypes: ProductType[] = []

  if (text.includes('画册') || text.includes('brochure') || text.includes('album') || text.includes('宣传册') || text.includes('产品册') || text.includes('产品目录') || text.includes('招商册') || text.includes('手册')) {
    productTypes.push('album')
  }
  if (text.includes('传单') || text.includes('flyer') || text.includes('单页') || text.includes('宣传单') || text.includes('折页')) {
    productTypes.push('flyer')
  }
  if (text.includes('名片')) {
    productTypes.push('business_card')
  }
  if (text.includes('海报') || text.includes('poster')) {
    productTypes.push('poster')
  }

  return productTypes
}

function detectContextTags(message: string): RecommendationContextTag[] {
  const text = message.toLowerCase()
  const tags = new Set<RecommendationContextTag>()

  if (COMPANY_PROFILE_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()))) {
    tags.add('company_profile')
  }

  if (EVENT_PROMO_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()))) {
    tags.add('event_promo')
  }

  if (BUSINESS_NETWORKING_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()))) {
    tags.add('business_networking')
  }

  if (ECONOMY_KEYWORDS.some((keyword) => text.includes(keyword.toLowerCase()))) {
    tags.add('economy')
  }

  return Array.from(tags)
}

function categoryFromIntent(intent: ChatIntent): KnowledgeCategory | null {
  if (intent === 'MATERIAL_CONSULTATION') return 'MATERIAL'
  if (intent === 'PROCESS_CONSULTATION') return 'PROCESS'
  if (intent === 'SPEC_RECOMMENDATION') return 'SPEC'
  if (intent === 'SOLUTION_RECOMMENDATION') return 'SOLUTION'
  return null
}

function scoreKnowledgeCard(
  card: KnowledgeCard,
  message: string,
  productTypes: ProductType[],
  contextTags: RecommendationContextTag[]
): number {
  const text = message.toLowerCase()
  let score = card.priority ?? 0

  for (const alias of card.aliases) {
    if (text.includes(alias.toLowerCase())) {
      score += 5
    }
  }

  for (const keyword of card.keywords) {
    if (text.includes(keyword.toLowerCase())) {
      score += 3
    }
  }

  if (card.applicableProductTypes && card.applicableProductTypes.some((productType) => productTypes.includes(productType))) {
    score += 4
  }

  if (productTypes.length === 0 && (!card.applicableProductTypes || card.applicableProductTypes.length === 0)) {
    score += 1
  }

  if (card.contextTags?.length) {
    const matchedContextCount = card.contextTags.filter((tag) => contextTags.includes(tag)).length
    score += matchedContextCount * 6

    if (card.contextTags.includes('economy') && !contextTags.includes('economy')) {
      score -= 3
    }
  }

  return score
}

export function getKnowledgeCardsByCategory(category: KnowledgeCategory): KnowledgeCard[] {
  return KNOWLEDGE_REGISTRY.filter((card) => card.category === category)
}

export function resolveKnowledgeCard(intent: ChatIntent, message: string): KnowledgeCard | null {
  const category = categoryFromIntent(intent)
  if (!category) {
    return null
  }

  const candidates = getKnowledgeCardsByCategory(category)
  const productTypes = detectProductTypes(message)
  const contextTags = detectContextTags(message)

  let bestCard: KnowledgeCard | null = null
  let bestScore = 0

  for (const card of candidates) {
    const score = scoreKnowledgeCard(card, message, productTypes, contextTags)
    if (score > bestScore) {
      bestScore = score
      bestCard = card
    }
  }

  return bestCard
}