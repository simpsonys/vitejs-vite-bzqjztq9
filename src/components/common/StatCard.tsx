import { T } from '../../constants/theme';

interface StatCardProps {
  label: string;
  value: string;
  color?: string;
  sub?: string;
  large?: boolean;
  isMobile?: boolean;
}

export const StatCard = ({ label, value, color, sub, large, isMobile }: StatCardProps) => {
  const pad = isMobile ? "8px 10px" : (large ? "16px 18px" : "10px 12px");
  const labelSize = isMobile ? 11 : (large ? 11 : 11);
  const valueSize = isMobile ? 16 : (large ? 20 : 17);
  const subSize = isMobile ? 10 : (large ? 11 : 10);
  const labelMarginBottom = isMobile ? 2 : 3;
  const subMarginTop = isMobile ? 2 : 3;

  return (
    <div style={{
      background: T.card,
      borderRadius: 12,
      padding: pad,
      border: `1px solid ${T.border}`,
      flex: 1,
      minWidth: 0,
      display: "flex",
      flexDirection: "column",
      justifyContent: "center"
    }}>
      <p style={{
        color: T.textDim,
        fontSize: labelSize,
        margin: `0 0 ${labelMarginBottom}px`,
        fontWeight: 600,
        letterSpacing: "0.4px"
      }}>
        {label}
      </p>
      <p style={{
        color: color || T.text,
        fontSize: valueSize,
        fontWeight: 800,
        margin: 0,
        letterSpacing: "-0.5px",
        fontFamily: "'IBM Plex Mono',monospace"
      }}>
        {value}
      </p>
      {sub && (
        <p style={{
          color: T.textSec,
          fontSize: subSize,
          margin: `${subMarginTop}px 0 0`
        }}>
          {sub}
        </p>
      )}
    </div>
  );
};
