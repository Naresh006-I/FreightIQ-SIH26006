/**
 * SailHero — SAIL steel plant banner shown at the top of every feature page.
 * Uses a real publicly accessible SAIL steel plant image via URL,
 * with a navy gradient overlay so text stays readable.
 */

export default function SailHero({ title, subtitle, badge }) {
  return (
    <div style={{
      position: 'relative',
      width: '100%',
      height: 160,
      borderRadius: 10,
      overflow: 'hidden',
      marginBottom: 24,
      boxShadow: '0 4px 16px rgba(0,48,135,0.18)',
    }}>
      {/* Background — SAIL Bhilai steel plant image (public Wikimedia, CC-BY-SA) */}
      <img
        src="https://upload.wikimedia.org/wikipedia/commons/thumb/3/3e/Blast_Furnace_at_SAIL%2C_Bhilai_Steel_Plant.jpg/1280px-Blast_Furnace_at_SAIL%2C_Bhilai_Steel_Plant.jpg"
        alt="SAIL Steel Plant"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%',
          objectFit: 'cover', objectPosition: 'center 40%',
        }}
        onError={e => {
          // Fallback to a solid navy gradient if image fails
          e.currentTarget.style.display = 'none'
        }}
      />

      {/* Navy gradient overlay */}
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(90deg, rgba(0,30,87,0.88) 0%, rgba(0,48,135,0.70) 50%, rgba(0,30,87,0.55) 100%)',
      }} />

      {/* Content */}
      <div style={{
        position: 'relative', zIndex: 2,
        height: '100%',
        display: 'flex', alignItems: 'center',
        padding: '0 32px',
        gap: 24,
      }}>
        {/* SAIL circular seal */}
        <SailSeal />

        <div>
          {badge && (
            <div style={{
              display: 'inline-block', background: '#C8A84B',
              color: '#003087', fontSize: 10, fontWeight: 800,
              padding: '2px 10px', borderRadius: 2,
              letterSpacing: '0.1em', textTransform: 'uppercase',
              marginBottom: 8,
            }}>
              {badge}
            </div>
          )}
          <h2 style={{
            color: 'white', fontWeight: 800, fontSize: 22,
            margin: 0, lineHeight: 1.2, letterSpacing: '0.04em',
          }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{
              color: 'rgba(255,255,255,0.75)', fontSize: 13,
              margin: '6px 0 0', lineHeight: 1.5,
            }}>
              {subtitle}
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

/* Circular SAIL seal SVG — diamond + arch + circular text */
function SailSeal() {
  return (
    <svg width="90" height="90" viewBox="0 0 90 90" fill="none"
         xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
      {/* Outer circle */}
      <circle cx="45" cy="45" r="43" fill="rgba(255,255,255,0.12)"
              stroke="rgba(255,255,255,0.55)" strokeWidth="1.5" />

      {/* Circular text — top arc: "Steel Authority of India" */}
      <path id="topArc" d="M 10,45 A 35,35 0 0,1 80,45" fill="none" />
      <text fill="white" fontSize="7" fontWeight="600" letterSpacing="1.5"
            fontFamily="Arial, sans-serif">
        <textPath href="#topArc" startOffset="8%">
          Steel Authority of India
        </textPath>
      </text>

      {/* Circular text — bottom arc: "Limited" */}
      <path id="botArc" d="M 18,55 A 30,30 0 0,0 72,55" fill="none" />
      <text fill="white" fontSize="7" fontWeight="600" letterSpacing="3"
            fontFamily="Arial, sans-serif">
        <textPath href="#botArc" startOffset="18%">
          Limited
        </textPath>
      </text>

      {/* Inner SAIL diamond logo */}
      {/* Blue diamond */}
      <rect x="28" y="28" width="24" height="24" rx="1"
            fill="white" opacity="0.9"
            transform="rotate(45 40 40)" />
      {/* Navy inner diamond */}
      <rect x="32" y="32" width="16" height="16" rx="0.5"
            fill="#003087"
            transform="rotate(45 40 40)" />
      {/* White arch inside */}
      <polyline points="33,44 40,35 47,44"
                fill="none" stroke="white" strokeWidth="3"
                strokeLinecap="round" strokeLinejoin="round" />

      {/* सेल SAIL text */}
      <text x="45" y="72" textAnchor="middle" fontSize="8" fontWeight="700"
            fill="white" fontFamily="Arial, sans-serif">
        सेल SAIL
      </text>
    </svg>
  )
}
