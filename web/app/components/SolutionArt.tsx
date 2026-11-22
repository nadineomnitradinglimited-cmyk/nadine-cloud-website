// Hero illustrations for the Solutions pages (pure SVG, sharp on every screen, light animations in globals.css).

export function ChatArt() {
  return (
    <svg className="sol-art" viewBox="0 0 420 380" role="img" aria-label="A website chat window where the AI assistant answers a customer">
      <defs>
        <linearGradient id="caG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#38E1FF" /><stop offset="1" stopColor="#0761EE" /></linearGradient>
        <filter id="caGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14" /></filter>
      </defs>
      <rect x="40" y="30" width="340" height="320" rx="22" fill="#0AA8F8" opacity=".22" filter="url(#caGlow)" />
      <rect x="40" y="30" width="340" height="320" rx="22" fill="#0B1F3F" stroke="url(#caG)" strokeWidth="2" />
      <rect x="40" y="30" width="340" height="56" rx="22" fill="#0E2A55" />
      <rect x="40" y="64" width="340" height="22" fill="#0E2A55" />
      <circle cx="74" cy="58" r="16" fill="url(#caG)" />
      <path d="M67 54h14M67 60h9" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" />
      <text x="100" y="54" fill="#fff" fontFamily="Inter, Arial" fontSize="14" fontWeight="700">AI Assistant</text>
      <circle cx="104" cy="68" r="4" fill="#2DFFB0" />
      <text x="113" y="72" fill="#9DB3D3" fontFamily="Inter, Arial" fontSize="11">Online · replies instantly</text>
      <g fontFamily="Inter, Arial" fontSize="12.5">
        <rect className="sol-pop d1" x="60" y="104" width="220" height="38" rx="14" fill="#16345F" />
        <text className="sol-pop d1" x="74" y="128" fill="#DFF6FF">Hi! 👋 How can I help you today?</text>
        <rect className="sol-pop d2" x="170" y="154" width="190" height="38" rx="14" fill="url(#caG)" />
        <text className="sol-pop d2" x="184" y="178" fill="#fff">Are you open on Saturday?</text>
        <rect className="sol-pop d3" x="60" y="204" width="270" height="56" rx="14" fill="#16345F" />
        <text className="sol-pop d3" x="74" y="227" fill="#DFF6FF">Yes — Saturday 08:00 to 13:00.</text>
        <text className="sol-pop d3" x="74" y="246" fill="#DFF6FF">Shall I book you a time?</text>
        <rect className="sol-pop d4" x="214" y="272" width="146" height="38" rx="14" fill="url(#caG)" />
        <text className="sol-pop d4" x="228" y="296" fill="#fff">Yes, 10:00 please</text>
      </g>
      <g className="sol-typing">
        <rect x="60" y="318" width="64" height="22" rx="11" fill="#16345F" />
        <circle cx="78" cy="329" r="3.5" fill="#38E1FF" /><circle cx="92" cy="329" r="3.5" fill="#38E1FF" /><circle cx="106" cy="329" r="3.5" fill="#38E1FF" />
      </g>
    </svg>
  );
}

export function SystemArt() {
  const bars = [52, 78, 64, 96, 70, 110, 88];
  return (
    <svg className="sol-art" viewBox="0 0 440 360" role="img" aria-label="A business system dashboard with sales, stock and a chart">
      <defs>
        <linearGradient id="saG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#38E1FF" /><stop offset="1" stopColor="#0761EE" /></linearGradient>
        <filter id="saGlow" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="14" /></filter>
      </defs>
      <rect x="20" y="20" width="400" height="320" rx="18" fill="#0AA8F8" opacity=".2" filter="url(#saGlow)" />
      <rect x="20" y="20" width="400" height="320" rx="18" fill="#0B1F3F" stroke="url(#saG)" strokeWidth="2" />
      <circle cx="42" cy="40" r="5" fill="#FF5F57" /><circle cx="58" cy="40" r="5" fill="#FEBC2E" /><circle cx="74" cy="40" r="5" fill="#28C840" />
      <rect x="20" y="58" width="84" height="282" fill="#0E2A55" />
      {[0, 1, 2, 3, 4].map((i) => (
        <rect key={i} x="34" y={78 + i * 34} width={i === 0 ? 56 : 46} height="12" rx="6" fill={i === 0 ? "url(#saG)" : "#1C3E6E"} />
      ))}
      <g fontFamily="Inter, Arial">
        {[["SALES TODAY", "K 8,420"], ["IN STOCK", "1,284"], ["EXPIRING", "12"]].map(([l, v], i) => (
          <g key={l}>
            <rect x={120 + i * 98} y="72" width="88" height="60" rx="10" fill="#16345F" />
            <text x={130 + i * 98} y="94" fill="#9DB3D3" fontSize="9" fontWeight="700" letterSpacing="1">{l}</text>
            <text x={130 + i * 98} y="120" fill={i === 2 ? "#FFC04D" : "#fff"} fontSize="17" fontWeight="800">{v}</text>
          </g>
        ))}
      </g>
      <rect x="120" y="146" width="284" height="118" rx="10" fill="#16345F" />
      {bars.map((h, i) => (
        <rect key={i} className="sol-bar" style={{ animationDelay: `${i * 0.12}s` }} x={138 + i * 37} y={252 - h * 0.9} width="22" height={h * 0.9} rx="4" fill="url(#saG)" />
      ))}
      {[0, 1].map((i) => (
        <g key={i}>
          <rect x="120" y={276 + i * 26} width="284" height="20" rx="6" fill="#132D55" />
          <rect x="132" y={282 + i * 26} width={i ? 90 : 120} height="8" rx="4" fill="#2A5A96" />
          <rect x="350" y={282 + i * 26} width="40" height="8" rx="4" fill={i ? "#2DFFB0" : "#38E1FF"} />
        </g>
      ))}
    </svg>
  );
}

export function FlowArt() {
  const steps = [
    { x: 40, y: 60, t: "New sale", s: "K 1,250" },
    { x: 240, y: 60, t: "Invoice sent", s: "automatic" },
    { x: 240, y: 230, t: "Payment received", s: "mobile money" },
    { x: 40, y: 230, t: "Receipt + report", s: "to your inbox" },
  ];
  return (
    <svg className="sol-art" viewBox="0 0 420 340" role="img" aria-label="An automation flow: new sale, invoice sent, payment received, receipt and report">
      <defs>
        <linearGradient id="faG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#38E1FF" /><stop offset="1" stopColor="#0761EE" /></linearGradient>
        <filter id="faGlow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="10" /></filter>
      </defs>
      <circle cx="210" cy="170" r="70" fill="#0AA8F8" opacity=".18" filter="url(#faGlow)" />
      <circle cx="210" cy="170" r="38" fill="#0B1F3F" stroke="url(#faG)" strokeWidth="2" />
      <path d="M197 170a13 13 0 1 1 13 13M210 157v-6M210 189v-6M223 170h6M191 170h-6" stroke="#38E1FF" strokeWidth="2.5" strokeLinecap="round" fill="none" className="sol-spin" />
      <g fill="none" stroke="#38E1FF" strokeWidth="2.5" strokeLinecap="round" className="sol-flow">
        <path d="M180 90h60" /><path d="M310 120v110" /><path d="M240 260h-60" /><path d="M110 230V120" />
      </g>
      <g fontFamily="Inter, Arial">
        {steps.map((st, i) => (
          <g key={st.t}>
            <rect x={st.x} y={st.y} width="140" height="60" rx="14" fill="#0B1F3F" stroke={i === 2 ? "#2DFFB0" : "#1E6FF0"} strokeWidth="1.8" />
            <circle cx={st.x + 22} cy={st.y + 30} r="11" fill={i === 2 ? "#2DFFB0" : "url(#faG)"} />
            <text x={st.x + 18} y={st.y + 34.5} fill="#06203F" fontSize="12" fontWeight="800">{i + 1}</text>
            <text x={st.x + 42} y={st.y + 27} fill="#fff" fontSize="12.5" fontWeight="700">{st.t}</text>
            <text x={st.x + 42} y={st.y + 44} fill="#9DB3D3" fontSize="10.5">{st.s}</text>
          </g>
        ))}
      </g>
    </svg>
  );
}
