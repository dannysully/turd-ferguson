/**
 * X reads twitter:image and does not fall back to og:image, and the root
 * layout declares a summary_large_image card - so without this file the
 * largest-format card on the one platform that names it stays empty.
 *
 * One design in one file: this re-exports the Open Graph card rather than
 * repeating it, so the two can never drift.
 */
import Image, { alt, contentType, size } from "./opengraph-image";

export { alt, contentType, size };
export default Image;
