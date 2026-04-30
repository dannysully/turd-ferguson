export default function FrameworkDiagram() {
  return (
    <svg
      viewBox="0 0 600 280"
      width="600"
      height="280"
      aria-label="Diagram showing one campaign producing two inputs (on-site content and guest listicle) funnelling into one play, which produces three outcomes (Google organic, AI Overview, LLM visibility)"
      role="img"
      className="w-full max-w-[600px]"
    >
      {/* ---- Column 1: two input nodes ---- */}

      {/* On-site content node */}
      <rect x="8" y="40" width="158" height="72" rx="8" fill="#1D9E75" />
      <text
        x="87"
        y="68"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="13"
        fontFamily="Georgia, serif"
        fontWeight="600"
      >
        On-site content
      </text>
      <text
        x="87"
        y="88"
        textAnchor="middle"
        fill="rgba(255,255,255,0.75)"
        fontSize="11"
        fontFamily="system-ui, sans-serif"
      >
        Structured for AI Overview
      </text>

      {/* Guest listicle node */}
      <rect x="8" y="168" width="158" height="72" rx="8" fill="#1D9E75" />
      <text
        x="87"
        y="196"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="13"
        fontFamily="Georgia, serif"
        fontWeight="600"
      >
        Guest listicle
      </text>
      <text
        x="87"
        y="216"
        textAnchor="middle"
        fill="rgba(255,255,255,0.75)"
        fontSize="11"
        fontFamily="system-ui, sans-serif"
      >
        On a high-DA publication
      </text>

      {/* ---- Connectors col 1 → col 2 ---- */}
      {/* From on-site content to center node */}
      <line
        x1="166"
        y1="76"
        x2="218"
        y2="140"
        stroke="#B4B2A9"
        strokeWidth="1.5"
        markerEnd="url(#arrow)"
      />
      {/* From guest listicle to center node */}
      <line
        x1="166"
        y1="204"
        x2="218"
        y2="140"
        stroke="#B4B2A9"
        strokeWidth="1.5"
        markerEnd="url(#arrow)"
      />

      {/* ---- Column 2: one play node ---- */}
      <rect x="220" y="104" width="158" height="72" rx="8" fill="#0D1B2A" />
      <text
        x="299"
        y="132"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="13"
        fontFamily="Georgia, serif"
        fontWeight="600"
      >
        One play
      </text>
      <text
        x="299"
        y="152"
        textAnchor="middle"
        fill="rgba(255,255,255,0.75)"
        fontSize="11"
        fontFamily="system-ui, sans-serif"
      >
        Single retainer
      </text>

      {/* ---- Connectors col 2 → col 3 ---- */}
      {/* To Google organic */}
      <line
        x1="378"
        y1="140"
        x2="428"
        y2="76"
        stroke="#B4B2A9"
        strokeWidth="1.5"
        markerEnd="url(#arrow)"
      />
      {/* To AI Overview */}
      <line
        x1="378"
        y1="140"
        x2="428"
        y2="140"
        stroke="#B4B2A9"
        strokeWidth="1.5"
        markerEnd="url(#arrow)"
      />
      {/* To LLM visibility */}
      <line
        x1="378"
        y1="140"
        x2="428"
        y2="204"
        stroke="#B4B2A9"
        strokeWidth="1.5"
        markerEnd="url(#arrow)"
      />

      {/* ---- Column 3: three outcome nodes ---- */}

      {/* Google organic */}
      <rect x="430" y="40" width="162" height="72" rx="8" fill="#D85A30" />
      <text
        x="511"
        y="68"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="13"
        fontFamily="Georgia, serif"
        fontWeight="600"
      >
        Google organic
      </text>
      <text
        x="511"
        y="88"
        textAnchor="middle"
        fill="rgba(255,255,255,0.75)"
        fontSize="11"
        fontFamily="system-ui, sans-serif"
      >
        #1 ranking
      </text>

      {/* AI Overview */}
      <rect x="430" y="104" width="162" height="72" rx="8" fill="#D85A30" />
      <text
        x="511"
        y="132"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="13"
        fontFamily="Georgia, serif"
        fontWeight="600"
      >
        AI Overview
      </text>
      <text
        x="511"
        y="152"
        textAnchor="middle"
        fill="rgba(255,255,255,0.75)"
        fontSize="11"
        fontFamily="system-ui, sans-serif"
      >
        Top cited source
      </text>

      {/* LLM visibility */}
      <rect x="430" y="168" width="162" height="72" rx="8" fill="#D85A30" />
      <text
        x="511"
        y="196"
        textAnchor="middle"
        fill="#ffffff"
        fontSize="13"
        fontFamily="Georgia, serif"
        fontWeight="600"
      >
        LLM visibility
      </text>
      <text
        x="511"
        y="216"
        textAnchor="middle"
        fill="rgba(255,255,255,0.75)"
        fontSize="11"
        fontFamily="system-ui, sans-serif"
      >
        0 → 14% in ChatGPT
      </text>

      {/* Arrowhead marker */}
      <defs>
        <marker
          id="arrow"
          markerWidth="6"
          markerHeight="6"
          refX="5"
          refY="3"
          orient="auto"
        >
          <path d="M0,0 L0,6 L6,3 z" fill="#B4B2A9" />
        </marker>
      </defs>
    </svg>
  );
}
