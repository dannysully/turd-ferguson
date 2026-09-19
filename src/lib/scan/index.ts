/**
 * Shared scan types for the UI.
 *
 * There was an adapter switch here, SCAN_SOURCE=fixture or live, and a mapper
 * beside it that assembled a result from three DataForSEO aggregate
 * endpoints. The live half posted to a product API at SCAN_API_BASE that was
 * never built; the fixture half backed a second homepage checker and
 * /example. All of those are deleted, and the adapter interface, ScanError
 * and the mapper had no caller left.
 *
 * The real funnel is src/app/api/scan, driven by pipeline.ts.
 *
 * This file used to re-export a second normalizeDomain from the mapper - one
 * that stripped neither a port, nor credentials, nor a trailing dot, and knew
 * only http and https. It was the one a component reaching for
 * "@/lib/scan" would have got, and it disagreed with the one the server
 * actually runs. The single implementation is ./domain.
 */

export * from "./contract";
