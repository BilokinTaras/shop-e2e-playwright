import { readFileSync, writeFileSync, existsSync } from 'node:fs';

import AxeBuilder from '@axe-core/playwright';
import type { Page } from '@playwright/test';

export const A11Y_BASELINE_FILE = 'tests/a11y/baseline.json';
const WCAG_TAGS = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'];

export interface Violation {
  rule: string;
  impact: string;
  help: string;
  targets: string[];
}

interface BaselineEntry {
  page: string;
  rule: string;
  /** Why this existing violation is accepted for now and where it is tracked. */
  reason: string;
}

/** Runs axe-core with WCAG 2.1 A/AA rules and returns violations in a stable, comparable form. */
export async function scanWcag(page: Page): Promise<Violation[]> {
  const results = await new AxeBuilder({ page }).withTags(WCAG_TAGS).analyze();
  return results.violations
    .map((v) => ({
      rule: v.id,
      impact: v.impact ?? 'unknown',
      help: v.help,
      targets: v.nodes.map((n) => n.target.join(' ')).sort(),
    }))
    .sort((a, b) => a.rule.localeCompare(b.rule));
}

function loadBaseline(): BaselineEntry[] {
  return existsSync(A11Y_BASELINE_FILE)
    ? (JSON.parse(readFileSync(A11Y_BASELINE_FILE, 'utf8')) as BaselineEntry[])
    : [];
}

/**
 * Splits violations into accepted (reviewed baseline) and new ones. A page/rule pair is the unit of
 * acceptance: target selectors in the starter change with every build, rules and pages do not.
 * With A11Y_UPDATE_BASELINE=1 the current violations are appended to the baseline for review.
 */
export function compareWithBaseline(
  pageName: string,
  violations: Violation[],
): { newOnes: Violation[]; accepted: Violation[] } {
  const baseline = loadBaseline();
  const accepted = violations.filter((v) => baseline.some((b) => b.page === pageName && b.rule === v.rule));
  const newOnes = violations.filter((v) => !accepted.includes(v));
  if (process.env.A11Y_UPDATE_BASELINE === '1' && newOnes.length) {
    const updated = [
      ...baseline,
      ...newOnes.map((v) => ({ page: pageName, rule: v.rule, reason: `TODO review: ${v.help}` })),
    ];
    writeFileSync(A11Y_BASELINE_FILE, `${JSON.stringify(updated, null, 2)}\n`);
  }
  return { newOnes, accepted };
}
