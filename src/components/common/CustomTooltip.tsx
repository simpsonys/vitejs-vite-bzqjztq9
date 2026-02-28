import { fP, fK } from '../../utils/formatters';

interface CustomTooltipProps {
  active?: boolean;
  payload?: any[];
  label?: string;
  fmt?: 'pct' | 'krw' | 'default';
}

export const CustomTooltip = ({ active, payload, label, fmt }: CustomTooltipProps) => {
  if (active && payload && payload.length) {
    const tooltipStyle = {
      background: "rgba(15, 19, 24, 0.92)", // Increased opacity from 0.5 to 0.92
      border: "1px solid rgba(255, 255, 255, 0.2)",
      borderRadius: 10,
      padding: "10px 14px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)", // Stronger shadow
      backdropFilter: "blur(12px)" // Stronger blur
    };

    return (
      <div style={tooltipStyle}>
        <p style={{ 
          color: "#FFFFFF", // Pure white for better contrast
          fontSize: 12, 
          margin: "0 0 6px",
          fontWeight: 700, // Bolder
          opacity: 0.9
        }}>
          {label}
        </p>
        {payload.map((p, i) => (
          <p key={i} style={{ 
            color: "#FFFFFF", // Pure white
            fontSize: 14, 
            margin: "4px 0", 
            fontWeight: 700,
            textShadow: "0 1px 2px rgba(0,0,0,0.5)" // Text shadow for depth
          }}>
            <span style={{ color: p.color || "#FFFFFF", marginRight: 6 }}>●</span>
            {p.name}: <span style={{ fontFamily: "'IBM Plex Mono',monospace" }}>
              {fmt === "pct" ? fP(p.value) : fmt === "krw" ? fK(p.value) + "원" : p.value}
            </span>
          </p>
        ))}
      </div>
    );
  }
  return null;
};
