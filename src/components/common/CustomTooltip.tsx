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
      background: "rgba(15, 19, 24, 0.5)",
      border: "1px solid rgba(200, 200, 200, 0.3)",
      borderRadius: 10,
      padding: "10px 14px",
      boxShadow: "0 8px 24px rgba(0,0,0,0.4)",
      backdropFilter: "blur(12px)"
    };

    return (
      <div style={tooltipStyle}>
        <p style={{ 
          color: "#FFFFFF",
          fontSize: 12, 
          margin: "0 0 6px",
          fontWeight: 700,
          textShadow: "0 1px 3px rgba(255,255,255,0.3)"
        }}>
          {label}
        </p>
        {payload.map((p, i) => (
          <p key={i} style={{ 
            color: p.color || "#FFFFFF",
            fontSize: 14, 
            margin: "4px 0", 
            fontWeight: 700,
            textShadow: "0 1px 3px rgba(255,255,255,0.3)"
          }}>
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
