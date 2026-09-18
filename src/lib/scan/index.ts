/**
 * Shared scan types, and the domain helper the UI needs alongside them.
 *
 * There was an adapter switch here, SCAN_SOURCE=fixture|live. The live half
 * posted to a product API at SCAN_API_BASE that was never built; the fixture
 * half backed a second checker on the homepage that returned an empty result
 * for every domain except our own. Both are gone.
 *
 * The real funnel is src/app/api/scan/*, driven by pipeline.ts. The fixture
 * data now belongs to /example alone, which imports it directly.
 */

export * from "./contract";
export { ScanError } from "./contract";
export { normalizeDomain } from "./mapper";
