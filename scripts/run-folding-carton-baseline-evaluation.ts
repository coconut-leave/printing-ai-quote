import { runComplexPackagingAlignmentEvaluation } from '@/server/packaging/complexPackagingAlignmentRunner'
import { SECOND_PHASE_FIRST_BATCH_ALIGNMENT_SAMPLE_SET_DRAFT } from '@/server/packaging/secondPhaseAlignmentEvaluationDraft'

const baselineSample = SECOND_PHASE_FIRST_BATCH_ALIGNMENT_SAMPLE_SET_DRAFT.find(
  (sample) => sample.sampleId === 'folding_carton_0401_mkly_color_box'
)

if (!baselineSample) {
  throw new Error('folding_carton_0401_mkly_color_box baseline sample not found')
}

const result = runComplexPackagingAlignmentEvaluation(
  [{ sample: baselineSample }],
  {
    requiredPackagingTypes: ['folding_carton'],
    requiredDecisions: ['quoted'],
  }
)

console.log(JSON.stringify(result, null, 2))