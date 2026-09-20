import { isFloorLabel } from "./price-label.ts";
import type { Tier } from "./pricing.ts";
import { ORG_REF, SITE_REF, SITE_URL } from "./schema.ts";

/**
 * The offer node on a package page: what this site tells a machine its own
 * plans cost.
 *
 * ## Why it is here rather than in `PackagePage.tsx`
 *
 * It was in the component, which meant nothing could run it. Node's runner
 * cannot parse JSX, and a test written beside a `.tsx` retypes the logic,
 * which is the blind-tripwire recipe this repo keeps finding. Splitting is
 * the answer the other ten times it has come up.
 *
 * The `Tier` import is type-only and therefore erased, which is the whole
 * reason this module loads at all: `pricing.ts` imports `@/components/
 * TierName`, so a `.mts` test cannot import it and `price-surfaces.test.mts`
 * parses it as source instead. The values here come from `schema.ts`, which
 * imports only `./contact.ts` and already loads under the runner.
 *
 * ## The three rules, unchanged from the component
 *
 * - **The name is `plainName`**, the TIER_PLAIN form, because JSON-LD is one
 *   of the contexts that strips colour.
 * - **The price is the one on the page.** `alwaystracked` reads "from $99/mo",
 *   so it gets an AggregateOffer with a lowPrice rather than an Offer with a
 *   flat price that the label itself contradicts.
 * - **`alwayseverywhere` gets no offer.** Its price is "Book a call". An offer
 *   node with no price says less than no offer node, and inventing one is the
 *   thing we do not do.
 *
 * `description` is the page's own standfirst. Nothing here is a new claim.
 *
 * ## What changed on the way out
 *
 * The floor test was `tier.priceLabel.startsWith("from")`, typed here, beside
 * a `price-label.ts` that answers the same question case-insensitively and a
 * `price-label.test.mts` that pins `"From $99/mo"` as a floor. `pricing.ts`
 * cites this function approvingly for the `basePrice === null` test it shares
 * with `priceProse` - and nobody had looked at its other test. It is
 * `isFloorLabel` now. See that function's header for the direction the
 * disagreement failed in.
 */
export function serviceSchema(tier: Tier, standfirst: string) {
  const url = SITE_URL + tier.href;
  const offers =
    tier.basePrice === null
      ? undefined
      : isFloorLabel(tier.priceLabel)
        ? {
            "@type": "AggregateOffer",
            priceCurrency: "USD",
            lowPrice: tier.basePrice,
            url,
          }
        : {
            "@type": "Offer",
            priceCurrency: "USD",
            price: tier.basePrice,
            url,
            priceSpecification: {
              "@type": "UnitPriceSpecification",
              priceCurrency: "USD",
              price: tier.basePrice,
              // Monthly, stated in a field rather than only in the /mo of
              // the label. MON is the UN/CEFACT code for a month.
              billingDuration: 1,
              billingIncrement: 1,
              unitCode: "MON",
            },
          };

  return {
    "@context": "https://schema.org",
    "@type": "Service",
    "@id": url + "#service",
    name: tier.plainName,
    url,
    isPartOf: SITE_REF,
    description: standfirst,
    serviceType: "Answer engine optimisation",
    provider: ORG_REF,
    ...(offers ? { offers } : {}),
  };
}
