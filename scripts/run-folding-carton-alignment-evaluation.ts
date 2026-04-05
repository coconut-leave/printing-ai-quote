import { runFoldingCartonFocusedAlignmentEvaluation } from '@/server/packaging/complexPackagingAlignmentRunner'

const result = runFoldingCartonFocusedAlignmentEvaluation()
console.log(JSON.stringify(result, null, 2))