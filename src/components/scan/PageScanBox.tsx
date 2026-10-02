import { scanReady } from "@/lib/scan/readiness";

import LiveScanChecker from "./LiveScanChecker";
import ScanBox, { type ScanBoxCopy } from "./ScanBox";

/**
 * A page's scan card (R181): the live checker in that card's wording when the
 * funnel can run a scan, else the GET to /scan it always was - the same split
 * HeroSection makes between LiveScanChecker and RequestScanForm. `id` is the
 * dormant card's only; the live one takes its ids from useId.
 */
export default function PageScanBox({ id, ...copy }: ScanBoxCopy & { id: string }) {
  return scanReady() ? <LiveScanChecker box={copy} /> : <ScanBox id={id} {...copy} />;
}
