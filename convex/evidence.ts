// Source references and quote validation.
// A confirmed condition proves that its quote exists in the fetched page. It does not prove the page is correct.
import { quoteExists } from "../lib/rules";
import type { ConditionV } from "./validators";

export function verifyConditions(conditions: ConditionV[], pageContent: string | null): ConditionV[] {
  return conditions.map((c) => {
    if (c.value === null) return { ...c, status: "unknown" as const };
    if (!pageContent) return { ...c, status: "unverified" as const }; // a failed fetch cannot supply verified conditions
    return { ...c, status: quoteExists(c.quote, pageContent) ? ("confirmed" as const) : ("unverified" as const) };
  });
}
