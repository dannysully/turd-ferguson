import { MOTION_SCRIPT } from "./motion-script";

/**
 * The entrance trigger, mounted.
 *
 * The script itself is in `./motion-script.ts`, and it moved there for the
 * reason `namesBrand` moved out of `engines.ts`: it could not be tested where
 * it was. This file is a `.tsx`, so `node --test` cannot load it, so the one
 * piece of imperative code on the site that every page's motion depends on had
 * no check at all - and the defect that actually shipped in it, a hidden
 * responsive twin holding a stagger slot, is exactly the kind a test catches
 * and a reading of the source does not. It sat in the queue as an inference
 * for two runs before anyone could measure it in a browser.
 *
 * Nothing else changed. It is still one inline script, still evaluated before
 * first paint, still plain DOM code with no hydration behind it.
 */
export default function Motion() {
  return <script dangerouslySetInnerHTML={{ __html: MOTION_SCRIPT }} />;
}
