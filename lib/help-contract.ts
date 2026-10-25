export const HELP_GUIDE_IDS = [
  "recruiter", "account-manager", "delivery-head", "tenant-admin",
  "branch-admin", "unit-admin", "pod-lead", "bdm",
] as const;

export type HelpGuideId = typeof HELP_GUIDE_IDS[number];
export interface HelpText { id: string; title: string; body: string }
export interface HelpMarker {
  x: number; y: number; width: number; height: number;
  title: string; body: string;
}
export interface HelpPage {
  id: string; title: string; caption: string; description: string;
  image: { src: string; width: number; height: number; capturedOn: string };
  markers: readonly HelpMarker[];
}
export interface HelpGuide {
  id: HelpGuideId; name: string; summary: string; intro: string;
  sections: readonly HelpText[]; faqs: readonly HelpText[];
  pages: readonly HelpPage[];
}
export interface HelpTask {
  id: string; guideIds: readonly HelpGuideId[]; title: string;
  where: string; prerequisites: string; steps: readonly string[];
  result: string; troubleshooting: string;
}
export interface HelpSelection {
  guideId: HelpGuideId;
  pageId: string;
  taskId?: string;
  faqId?: string;
}
export type HelpSearchResult = {
  kind: "guide" | "page" | "task" | "faq";
  guideId: HelpGuideId; id: string; title: string; summary: string;
};
