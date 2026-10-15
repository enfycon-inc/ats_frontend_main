import type { DeliveryPipeline, DeliveryStage } from './delivery-dashboard-contract';

export const deliveryStageLabels: Record<DeliveryStage, string> = {
  all: 'Total submissions', review: 'Internal review', l1: 'L1', l2: 'L2', l3: 'L3', final: 'Final', closed: 'Closed unsuccessful',
};

export function hasPendingDeliveryReview(pipeline: DeliveryPipeline | null | undefined, canReview: boolean): boolean {
  return canReview && pipeline != null && pipeline.review > 0;
}

export function visibleDeliveryStage(stage: DeliveryStage, pipeline: DeliveryPipeline | null | undefined, canReview: boolean): DeliveryStage {
  if (stage === 'review' && (!canReview || (pipeline != null && pipeline.review === 0))) return 'all';
  return stage;
}

export function stageShare(value: number, total: number): number {
  return total > 0 ? Math.min(100, Math.max(0, value / total * 100)) : 0;
}

export function submissionCoverage(done: number, required: number | null): number | null {
  return required !== null && required > 0 ? done / required * 100 : null;
}
