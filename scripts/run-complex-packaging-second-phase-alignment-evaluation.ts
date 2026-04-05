import { runFirstBatchComplexPackagingAlignmentEvaluation } from '@/server/packaging/complexPackagingAlignmentRunner'

const result = runFirstBatchComplexPackagingAlignmentEvaluation()
console.log(JSON.stringify(result, null, 2))
