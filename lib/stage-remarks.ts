export interface StageRemark {
  id: number;
  stage: string;
  remarkText: string;
  remarkType?: string;
}

// Keep stored IDs intact (including global selections). Deduplicate only the
// presentation of authorized suggestions, independent of their legacy outcome.
export function stageRemarkSuggestions<T extends StageRemark>(remarks: T[], stage?: string) {
  const normalize = (value: string) => value.trim().toLowerCase() === 'internal_review' ? 'review' : value.trim().toLowerCase();
  const seen = new Set<string>();
  return remarks.filter(remark => {
    if (!stage || normalize(remark.stage) !== normalize(stage)) return false;
    const text = remark.remarkText.trim().toLowerCase();
    if (!text || seen.has(text)) return false;
    seen.add(text);
    return true;
  });
}
