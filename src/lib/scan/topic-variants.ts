/**
 * The one place `topic_variants` is cleaned, for all three doors onto it.
 *
 * Three routes wrote this column and each sanitised it differently. `/confirm`
 * lowercased, bounded and capped but never dropped a variant identical to the
 * topic - the exact defect `/questions` carries a comment about, on the route
 * that persists the value rather than the one that renders it - and no door
 * deduped at all. A repeated string becomes two chips under one React key on
 * the confirm screen, both toggling the same cluster, while the footer counts
 * one. See `topic-variants.test.mts` for the table and the cost.
 *
 * No `server-only` and no `@/` import: relative and extensionful, so
 * `node --test` can load it. The bounds and the cap travel as arguments because
 * `TOPIC_VARIANT_COUNT` lives in `anthropic.ts`, which cannot be loaded by the
 * runner - the test asserts every call site passes the shared constants rather
 * than typing a number, which is the half no behavioural assertion can see.
 */

export type VariantLimits = { min: number; max: number; cap: number };

/**
 * The variants to store, given whatever arrived and the topic they belong to.
 *
 * Deduped **before** the cap, deliberately: capping first lets three copies of
 * one phrase eat three of the five slots and silently narrows the spread the
 * visitor confirmed. Order is otherwise preserved, first spelling winning,
 * because that is the order the chip row renders in.
 *
 * `topic` may be null - `/api/scan/start` stores one only when the model was
 * confident - and the fold against it is conditional on that while the dedupe
 * is not. Dropping a variant for matching a topic the row does not carry would
 * lose a real one.
 */
export function normaliseTopicVariants(
  topic: string | null,
  supplied: unknown,
  limits: VariantLimits,
): string[] {
  if (!Array.isArray(supplied)) return [];
  const topicKey = topic ? topic.trim().toLowerCase() : null;
  const out: string[] = [];
  const seen = new Set<string>();
  for (const raw of supplied) {
    if (typeof raw !== "string") continue;
    const v = raw.trim().toLowerCase();
    if (v.length < limits.min || v.length > limits.max) continue;
    if (topicKey !== null && v === topicKey) continue;
    if (seen.has(v)) continue;
    seen.add(v);
    out.push(v);
    if (out.length === limits.cap) break;
  }
  return out;
}
