export const SAMPLE_FILE_BASE_PATH = '/sample-files'

export type SampleFileCategory = 'knowledge_reference' | 'design_file' | 'dieline_pdf'

export type SampleFileMetadata = {
  fileName: string
  fileUrl: string
  fileCategory: SampleFileCategory
}

function normalizeSampleFileName(fileName: string): string {
  return fileName.trim().replace(/^\/+/, '')
}

export function getSampleFileUrl(fileName: string): string {
  const normalizedFileName = normalizeSampleFileName(fileName)

  if (!normalizedFileName) {
    throw new Error('sample fileName is required')
  }

  const encodedSegments = normalizedFileName.split('/').map((segment) => encodeURIComponent(segment))
  return `${SAMPLE_FILE_BASE_PATH}/${encodedSegments.join('/')}`
}

export function createSampleFileMetadata(
  fileName: string,
  fileCategory: SampleFileCategory,
): SampleFileMetadata {
  const normalizedFileName = normalizeSampleFileName(fileName)

  return {
    fileName: normalizedFileName,
    fileUrl: getSampleFileUrl(normalizedFileName),
    fileCategory,
  }
}

export const SAMPLE_FILE_MANIFEST: SampleFileMetadata[] = [
  createSampleFileMetadata('packaging-knowledge-reference.pdf', 'knowledge_reference'),
  createSampleFileMetadata('battery-usb-c-color-box-h.pdf', 'design_file'),
  createSampleFileMetadata('mailer-box-dieline-sample.pdf', 'dieline_pdf'),
]

export function getAllSampleFiles(): SampleFileMetadata[] {
  return [...SAMPLE_FILE_MANIFEST]
}

export function getSampleFilesByCategory(fileCategory: SampleFileCategory): SampleFileMetadata[] {
  return SAMPLE_FILE_MANIFEST.filter((file) => file.fileCategory === fileCategory)
}