import { CARD, GRID12, H2, MICRO, SHELL, T } from "@/config/tokens";

/**
 * "Two ways into an answer" - join a page that already feeds answers, or
 * create the page that should exist. The second card is the one with the
 * accent border, because creating the missing page is the half nobody else
 * sells and the half that makes alwaysmentioned worth buying.
 */

const item: React.CSSProperties = {
  fontSize: "13.5px",
  lineHeight: 1.55,
  paddingTop: "9px",
  borderTop: `1px solid ${T.hair}`,
};

const list: React.CSSProperties = {
  margin: "14px 0 0",
  padding: 0,
  listStyle: "none",
  display: "flex",
  flexDirection: "column",
  gap: "9px",
};

export default function TwoWays() {
  return (
    <section style={{ ...SHELL, marginTop: "40px" }}>
      <div className="board-head" style={{ ...GRID12, marginBottom: "16px" }}>
        <h2 style={{ ...H2, gridColumn: "span 4" }}>Two ways into an answer</h2>
        <p style={{ gridColumn: "span 8", margin: 0, fontSize: "14px", lineHeight: 1.6, color: T.soft }}>
          Getting into the pages already being cited is the obvious half. The other half is writing the page that
          should exist in that category and does not - it earns its own ranking, and the engines pick it up as a
          source because of it.
        </p>
      </div>

      <div className="two-up">
        <div style={{ ...CARD, padding: "24px" }}>
          <div style={MICRO}>Join a page that already feeds answers</div>
          <p style={{ margin: "10px 0 0", fontSize: "14px", lineHeight: 1.65, color: T.soft }}>
            The scan names the listicles, round-ups and review pages the engines keep drawing on. Where inclusion is
            an editorial conversation, we have it. Fastest route, capped by what already exists.
          </p>
          <ul style={list}>
            <li style={{ ...item, color: T.soft }}>Listicle and round-up inclusion</li>
            <li style={{ ...item, color: T.soft }}>Correcting a mention that is wrong or out of date</li>
            <li style={{ ...item, color: T.soft }}>Link insertion into an article already being cited</li>
          </ul>
        </div>

        <div style={{ ...CARD, border: `1px solid ${T.accent}`, padding: "24px" }}>
          <div style={{ ...MICRO, color: T.accent }}>Create the page that should exist</div>
          <p style={{ margin: "10px 0 0", fontSize: "14px", lineHeight: 1.65, color: T.ink }}>
            Where no page covers the cut a buyer is asking about, we write one on a third-party site with the
            authority to rank for it. It ranks in its own right, and that is exactly what makes an engine treat it as
            a source.
          </p>
          <ul style={list}>
            <li style={{ ...item, color: T.ink }}>A comparison or &ldquo;best for&rdquo; page for the cut nobody has covered</li>
            <li style={{ ...item, color: T.ink }}>An alternatives page on a site the engines already trust</li>
            <li style={{ ...item, color: T.ink }}>Placed on a domain chosen for topical fit, not just for its DR</li>
          </ul>
        </div>
      </div>

      <p style={{ margin: "16px 0 0", fontSize: "13.5px", lineHeight: 1.65, color: T.soft }}>
        Both are editorial placements on sites we do not own. Neither is content on your own site, because that is
        not where the answers come from.
      </p>
    </section>
  );
}
