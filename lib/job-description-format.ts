import DOMPurify from 'isomorphic-dompurify';
import { Marked } from 'marked';
import {
  JOB_DESCRIPTION_TAGS, JOB_DESCRIPTION_ATTRIBUTES, jobDescriptionClasses,
  jobDescriptionStyle, normalizeJobTitle, safeJobDescriptionHref,
} from './job-description-policy';

const markdown = new Marked({ async: false, gfm: true, breaks: true });
const policy = {
  ALLOWED_TAGS: JOB_DESCRIPTION_TAGS,
  ALLOWED_ATTR: JOB_DESCRIPTION_ATTRIBUTES,
  ALLOW_DATA_ATTR: false,
  ALLOW_ARIA_ATTR: false,
  ADD_FORBID_CONTENTS: ['script', 'style', 'textarea', 'option', 'xmp', 'noscript', 'iframe', 'object', 'svg', 'math'],
};

function safeDescriptionDom(html: string): HTMLElement {
  // RETURN_DOM produces a body element; DOMPurify exposes the broader Node type.
  const root = DOMPurify.sanitize(html, { ...policy, RETURN_DOM: true }) as HTMLElement;
  for (const element of root.querySelectorAll('*')) {
    for (const [attribute, filter] of [['class', jobDescriptionClasses], ['style', jobDescriptionStyle]] as const) {
      if (!element.hasAttribute(attribute)) continue;
      const value = filter(element.getAttribute(attribute) || '');
      if (value) element.setAttribute(attribute, value);
      else element.removeAttribute(attribute);
    }
    if (element.hasAttribute('href') && !safeJobDescriptionHref(element.getAttribute('href') || '')) element.removeAttribute('href');
  }
  return root;
}

export function sanitizeJobDescription(html: string): string {
  return safeDescriptionDom(html).innerHTML.trim();
}

export function hasJobDescriptionMarkdown(text: string): boolean {
  return /(?:^|\n) {0,3}(?:#{1,6}\s+|[-*+]\s+|\d+[.)]\s+|`{3})|\*\*\S|__\S|\[[^\]\n]+\]\([^)]+\)|(?:^|\s)[*_][^*_\n]+[*_](?:\s|$)/.test(text);
}

function parseMarkdown(text: string): string {
  return markdown.parse(text, { async: false });
}

/** Convert only input/paste boundaries, never a user's ordinary keystrokes. */
export function formatJobDescription(input: string, jobTitle?: string): string {
  let source = input.replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').trim();
  if (!source) return '';
  // Chat tools sometimes put the entire JD in a Markdown/text fence. Preserve
  // real SQL/Python code fences; only unwrap an explicit document-text wrapper.
  const documentFence = source.match(/^```(?:markdown|md|text|plaintext)\s*\n([\s\S]*?)\n```$/i);
  if (documentFence) source = documentFence[1];
  const structuredHtml = /^<(?:p|div|h[1-6]|ul|ol|table|blockquote|pre)\b/i.test(source);
  const root = safeDescriptionDom(structuredHtml ? source : parseMarkdown(source));
  const convertedLists = new WeakSet<Element>();

  // Repair legacy descriptions that wrapped each raw Markdown line in a <p>
  // or injected the parser's unformatted title in an <h3>.
  for (const block of Array.from(root.querySelectorAll('p,h1,h2,h3,h4,h5,h6'))) {
    if (block.closest('pre,code') || !hasJobDescriptionMarkdown(block.textContent || '')) continue;
    let fragment = block.innerHTML.replace(/<br\s*\/?\s*>/gi, '\n').replace(/&nbsp;|\u00a0/g, ' ');
    if (/^\s*#{1,6}\s+/.test(block.textContent || '')) fragment = block.textContent || '';
    const formatted = safeDescriptionDom(parseMarkdown(fragment));
    if (formatted.children.length === 1 && formatted.firstElementChild?.tagName === 'P') {
      for (const attribute of Array.from(block.attributes)) formatted.firstElementChild.setAttribute(attribute.name, attribute.value);
    }
    for (const list of Array.from(formatted.children)) if (['UL', 'OL'].includes(list.tagName)) convertedLists.add(list);
    block.replaceWith(...Array.from(formatted.childNodes));
  }
  // Mixed legacy HTML can also contain top-level Markdown text between blocks.
  for (const node of Array.from(root.childNodes)) {
    if (node.nodeType === 3 && hasJobDescriptionMarkdown(node.textContent || '')) {
      const formatted = safeDescriptionDom(parseMarkdown(node.textContent || ''));
      node.replaceWith(...Array.from(formatted.childNodes));
    }
  }
  for (const list of Array.from(root.querySelectorAll('ul,ol'))) {
    if (!list.parentNode || !convertedLists.has(list)) continue;
    let next = list.nextSibling;
    while (next) {
      if (next.nodeType === 3 && !next.textContent?.trim()) { next = next.nextSibling; continue; }
      if (next.nodeType !== 1 || (next as Element).tagName !== list.tagName || !convertedLists.has(next as Element)) break;
      const following = next.nextSibling;
      list.append(...Array.from(next.childNodes)); next.remove(); next = following;
    }
  }
  const first = root.firstElementChild;
  const second = first?.nextElementSibling;
  const title = normalizeJobTitle(jobTitle);
  if (first && second && /^H[1-6]$/.test(first.tagName) && /^(?:H[1-6]|P)$/.test(second.tagName)) {
    const firstTitle = normalizeJobTitle(first.textContent);
    const secondTitle = normalizeJobTitle(second.textContent);
    if (firstTitle && firstTitle.toLowerCase() === secondTitle.toLowerCase()
      && (title.toLowerCase() === firstTitle.toLowerCase() || /^\s*Job Title\s*:/i.test(second.textContent || ''))) first.remove();
  }
  return sanitizeJobDescription(root.innerHTML);
}

