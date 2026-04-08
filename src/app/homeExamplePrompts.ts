export interface HomeExampleGroup {
  key: 'recommendation' | 'quoted' | 'estimated' | 'handoff'
  title: string
  badge: string
  description: string
  prompts: string[]
}

export const HOME_EXAMPLE_GROUPS: HomeExampleGroup[] = [
  {
    key: 'recommendation',
    title: '推荐案例',
    badge: '推荐链路',
    description: '适合先看系统会不会给方案建议，再决定是否继续估价或报价。',
    prompts: [
      '我想做一个纸盒装护肤品，你们一般推荐什么',
      '我想做个外包装，预算不要太高',
      '我要装小卡片和赠品，盒子怎么选',
    ],
  },
  {
    key: 'quoted',
    title: '正式报价',
    badge: 'quoted 入口',
    description: '参数相对完整，适合直接验证系统是否进入正式报价链路。',
    prompts: [
      '飞机盒，20*12*6cm，300克白卡，四色印刷，5000个',
      '双插盒：7*5*5CM，350克白卡+正反四色+专印+正面过哑胶+啤+粘合，5000；说明书：20*5CM，80克双铜纸+双面四色印+折3折，5000',
    ],
  },
  {
    key: 'estimated',
    title: '参考报价',
    badge: 'estimated 入口',
    description: '适合测试预报价、组合报价和仍需人工复核的参考报价边界。',
    prompts: [
      '开窗彩盒，21*17*31cm，400克单铜，印四色，过光胶，500个',
      '双插盒：7*5*5CM，350克白卡，正反四色，5000；说明书：220x170mm，80g双胶纸，单面印，5000',
    ],
  },
  {
    key: 'handoff',
    title: '转人工',
    badge: 'handoff 入口',
    description: '适合验证文件型、设计稿型和需人工核价的接管场景。',
    prompts: [
      '请按PDF设计稿来报价',
      '我这边有AI源文件，按文件核价',
      '我把刀模图和设计稿发你，按这个报价',
    ],
  },
]