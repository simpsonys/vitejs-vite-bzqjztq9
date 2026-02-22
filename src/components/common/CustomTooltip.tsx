import { T } from '../../constants/theme';
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
      borderRadius: 8,
      padding: "8px 12px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
      backdropFilter: "blur(4px)"
    };

    return (
      <div style={tooltipStyle}>
        <p style={{ color: T.textDim, fontSize: 11, margin: "0 0 4px" }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color || T.text, fontSize: 13, margin: "2px 0", fontWeight: 600 }}>
            {p.name}: {fmt === "pct" ? fP(p.value) : fmt === "krw" ? fK(p.value) + "원" : p.value}
          </p>
        ))}
      </div>
    );
  }
  return null;
};
