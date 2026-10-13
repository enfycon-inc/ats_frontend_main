export function usesAutomaticPods(policy?: { allowPods?: boolean; podDistributionStrategy?: string | null } | null) {
  return policy?.allowPods === true && ['AUTO', 'AUTOMATIC', 'AUTO_ROUND_ROBIN'].includes((policy.podDistributionStrategy || 'AUTO').trim().toUpperCase());
}
