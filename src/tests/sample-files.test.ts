import {
  SAMPLE_FILE_MANIFEST,
  createSampleFileMetadata,
  getAllSampleFiles,
  getSampleFileUrl,
  getSampleFilesByCategory,
} from '@/lib/sampleFiles'

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

function test(name: string, fn: () => void) {
  try {
    fn()
    results.push({ name, passed: true })
    console.log(`✓ ${name}`)
  } catch (err) {
    const error = err instanceof Error ? err.message : String(err)
    results.push({ name, passed: false, error })
    console.error(`✗ ${name}`)
    console.error(`  └─ ${error}`)
  }
}

console.log('\n=== Sample file manifest 回归测试 ===\n')

test('sample file URL 应落在固定 /sample-files 路径下', () => {
  assert(getSampleFileUrl('mailer-box-dieline-sample.pdf') === '/sample-files/mailer-box-dieline-sample.pdf', '应生成固定静态 URL')
  assert(getSampleFileUrl('/nested folder/example file.pdf') === '/sample-files/nested%20folder/example%20file.pdf', 'URL 应正确编码并去掉开头斜杠')
})

test('metadata 应包含 fileName、fileUrl、fileCategory', () => {
  const metadata = createSampleFileMetadata('customer-design-sample.pdf', 'design_file')

  assert(metadata.fileName === 'customer-design-sample.pdf', '应保留标准化后的 fileName')
  assert(metadata.fileUrl === '/sample-files/customer-design-sample.pdf', '应生成固定 fileUrl')
  assert(metadata.fileCategory === 'design_file', '应写入 fileCategory')
})

test('manifest 应预留知识资料、设计文件、刀模 PDF 三类样例', () => {
  assert(SAMPLE_FILE_MANIFEST.length === 3, '当前应预留 3 条开发期样例元信息')
  assert(getSampleFilesByCategory('knowledge_reference').length === 1, '应包含知识资料样例')
  assert(getSampleFilesByCategory('design_file').length === 1, '应包含设计文件样例')
  assert(getSampleFilesByCategory('dieline_pdf').length === 1, '应包含刀模 PDF 样例')
})

test('获取全部样例文件时不应暴露原始数组引用', () => {
  const files = getAllSampleFiles()

  files.push(createSampleFileMetadata('new-file.pdf', 'knowledge_reference'))

  assert(getAllSampleFiles().length === 3, '返回值应为浅拷贝，避免外部污染 manifest')
})

console.log('\n=== 测试总结 ===\n')
const passed = results.filter((item) => item.passed).length
const total = results.length
console.log(`总计: ${passed}/${total} 通过`)
if (passed < total) {
  process.exit(1)
}