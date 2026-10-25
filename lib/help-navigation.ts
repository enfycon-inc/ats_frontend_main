import { HELP_GUIDES, HELP_TASKS } from "./help-content";
import type { HelpGuideId, HelpSearchResult, HelpSelection } from "./help-contract";

export function getHelpGuide(id: string | null | undefined) {
  return HELP_GUIDES.find(guide => guide.id === id) ?? HELP_GUIDES[0];
}

/** URL selections are documentation references, never a role or access override. */
export function readHelpSelection(params: Pick<URLSearchParams, "get">): HelpSelection {
  const guide = getHelpGuide(params.get("guide"));
  const page = guide.pages.find(item => item.id === params.get("article")) ?? guide.pages[0];
  const task = HELP_TASKS.find(item => item.id === params.get("task") && item.guideIds.includes(guide.id));
  const faq = guide.faqs.find(item => item.id === params.get("faq"));
  return { guideId: guide.id, pageId: page.id, taskId: task?.id, faqId: faq?.id };
}

export function helpHref(selection: HelpSelection): string {
  const query = new URLSearchParams({ guide: selection.guideId, article: selection.pageId });
  if (selection.taskId) query.set("task", selection.taskId);
  if (selection.faqId) query.set("faq", selection.faqId);
  return `/help?${query.toString()}`;
}

function normalize(text: string): string {
  return text.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function matchesHelpText(query: string, ...parts: readonly string[]): boolean {
  const text = normalize(parts.join(" "));
  return normalize(query).split(" ").filter(Boolean).every(term => text.includes(term));
}

type SearchEntry = HelpSearchResult & { text: string };
const index: readonly SearchEntry[] = HELP_GUIDES.flatMap(guide => [
  { kind: "guide" as const, guideId: guide.id, id: guide.id, title: `${guide.name} guide`, summary: guide.intro, text: [guide.name, guide.summary, guide.intro, ...guide.sections.flatMap(section => [section.title, section.body])].join(" ") },
  ...guide.pages.map(page => ({ kind: "page" as const, guideId: guide.id, id: page.id, title: page.title, summary: page.description, text: [guide.name, page.title, page.description, page.caption, ...page.markers.flatMap(marker => [marker.title, marker.body])].join(" ") })),
  ...HELP_TASKS.filter(task => task.guideIds.includes(guide.id)).map(task => ({ kind: "task" as const, guideId: guide.id, id: task.id, title: task.title, summary: task.where, text: [guide.name, task.title, task.where, task.prerequisites, ...task.steps, task.result, task.troubleshooting].join(" ") })),
  ...guide.faqs.map(faq => ({ kind: "faq" as const, guideId: guide.id, id: faq.id, title: faq.title, summary: faq.body, text: [guide.name, faq.title, faq.body].join(" ") })),
]);

export function searchHelp(query: string, guideId?: HelpGuideId): HelpSearchResult[] {
  if (!normalize(query)) return [];
  return index
    .filter(item => (!guideId || item.guideId === guideId) && matchesHelpText(query, item.text))
    .map(item => ({ item, score: (matchesHelpText(query, item.title) ? 10 : 0) + (item.kind === "task" ? 3 : item.kind === "faq" ? 2 : 0) }))
    .sort((a, b) => b.score - a.score || a.item.title.localeCompare(b.item.title))
    .map(({ item }) => ({ kind: item.kind, guideId: item.guideId, id: item.id, title: item.title, summary: item.summary }));
}

export function helpSearchSelection(result: HelpSearchResult): HelpSelection {
  const guide = getHelpGuide(result.guideId);
  return {
    guideId: guide.id,
    pageId: result.kind === "page" ? result.id : guide.pages[0].id,
    taskId: result.kind === "task" ? result.id : undefined,
    faqId: result.kind === "faq" ? result.id : undefined,
  };
}
