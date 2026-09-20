/**
 * A price label, split into the figure and the words that qualify it.
 *
 * No JSX and no imports, for the reason `plural.ts` and `tier-text.ts` have
 * none: it is reachable from `node --test`, and this is the one piece of
 * string handling on the site that decides what size a number is printed at.
 *
 * The board's treatment is a 36px figure with a quiet "/mo" beside it, and
 * "from" is the same kind of word - a qualifier on the number, not part of it.
 * Both are de-emphasised and neither is dropped, so the card keeps the board's
 * typography and still says the whole of what `pricing.ts` says.
 *
 * Getting this wrong has a direction. `c2bf546` and the deleted `priceFor`
 * were both the same bug: a floor rendered as a flat price, which is a number
 * an agency quotes their client before finding out it moves. So the rule here
 * is that a qualifier is never silently dropped - anything this cannot parse
 * is returned whole, at figure size, rather than trimmed to the part that
 * looked like a number.
 */

export type PriceParts = {
  /** "from", or whatever qualifier opened the label. Empty when there is none. */
  prefix: string;
  /** The part set in the big type. Never empty for a label holding a price. */
  figure: string;
  /** "/mo", or whatever suffix closed the label. Empty when there is none. */
  suffix: string;
};

/** Qualifiers that open a label, longest first so a prefix of one cannot win. */
const PREFIXES = ["from "];

/** Qualifiers that close one. */
const SUFFIXES = ["/mo", "/month"];

/**
 * Whether the label states a price at all.
 *
 * "Book a call" has no number to size against and is rendered as it is. The
 * test is the currency mark rather than a digit, because a label like
 * "2 seats included" is not a price and must not be set in 36px type.
 */
export function isPriceLabel(label: string): boolean {
  return label.includes("$");
}

/**
 * Whether the label states a floor rather than a flat price.
 *
 * The same judgement `splitPriceLabel` already makes, exported because a
 * second reader was making it privately and making it differently.
 * `PackagePage`'s `serviceSchema` chose between an `AggregateOffer` with a
 * `lowPrice` and an `Offer` with a flat `price` on `priceLabel.startsWith
 * ("from")` - case-sensitive, against a `splitPriceLabel` that lowercases
 * first and whose own test pins `"From $99/mo"` as a floor.
 *
 * So the two disagreed on exactly the label this file's header says the
 * repo has already shipped twice: a floor rendered as a flat price. On the
 * schema path it is worse than on the card, because the wrong answer is a
 * machine-readable `price: 99` with a monthly `UnitPriceSpecification` under
 * it, published to the engines this product exists to be read by, while the
 * card beside it correctly says "From".
 *
 * Derived from `splitPriceLabel` rather than written again here, so a third
 * reader cannot be added without this one moving too. Two copies of one
 * function is this repo's named species and the untested copy is always the
 * one missing the guard.
 */
export function isFloorLabel(label: string): boolean {
  return splitPriceLabel(label).prefix !== "";
}

export function splitPriceLabel(label: string): PriceParts {
  if (!isPriceLabel(label)) return { prefix: "", figure: label, suffix: "" };

  let rest = label;
  const prefix = PREFIXES.find((p) => rest.toLowerCase().startsWith(p)) ?? "";
  if (prefix) rest = rest.slice(prefix.length);

  const suffix = SUFFIXES.find((s) => rest.toLowerCase().endsWith(s)) ?? "";
  if (suffix) rest = rest.slice(0, rest.length - suffix.length);

  /**
   * There is deliberately no "the figure came out empty" guard here. It cannot:
   * `isPriceLabel` has already required a `$`, and no entry in either list
   * above contains one, so the `$` is always still in `rest`. A guard with no
   * reachable effect is decoration, and this repo has spent a run finding that
   * out the other way round.
   */
  return {
    // Sliced off the label rather than taken from the table, so the label's
    // own capitalisation survives: "From $99/mo" must not render as "from".
    prefix: label.slice(0, prefix.length),
    figure: rest,
    suffix: suffix ? label.slice(label.length - suffix.length) : "",
  };
}
