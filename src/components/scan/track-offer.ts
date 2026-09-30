import { formatPrice, type Market } from "../../config/sector-pricing.ts";
import { SELECTION_DEFAULT, withSelection } from "../../config/sector-selection.ts";

/**
 * The result screen's "Track this cluster from tomorrow" card, per scan
 * market (R139, Danny, 30 Sep 2026, danny.md line 127). A UK scan shows the
 * GBP price "plus VAT" - Stripe Tax adds it on its page (R129) - and its link
 * carries `market=uk`, so /checkout and the session price it in GBP. A US scan
 * is as it was: USD, no VAT, and a link with no market (the default).
 *
 * Pure, and the prices are passed in (ResultView passes pricing.ts's
 * TRACKED_PRICE), so both markets are tested without a render.
 */
export function trackOffer(scanMarket: string, prices: Record<Market, number>, checkoutHref: string, token: string): { market: Market; price: string; vat: boolean; href: string } {
  const market: Market = scanMarket.toUpperCase() === "UK" ? "uk" : "us";
  return {
    market,
    price: formatPrice(prices[market], market),
    vat: market === "uk",
    href: withSelection(checkoutHref, { ...SELECTION_DEFAULT, market }) + "&scan=" + encodeURIComponent(token),
  };
}
