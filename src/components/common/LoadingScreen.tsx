import { T } from '../../constants/theme';

export const LoadingScreen = () => {
  return (
    <div style={{
      minHeight: "100vh",
      background: T.bg,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 20
    }}>
      <div style={{
        width: 48,
        height: 48,
        borderRadius: "50%",
        border: `3px solid ${T.border}`,
        borderTop: `3px solid ${T.accent}`,
        animation: "spin 0.9s linear infinite"
      }} />
      <p style={{
        color: T.textSec,
        fontSize: 13,
        fontFamily: "'IBM Plex Mono',monospace"
      }}>
        Google Sheets 데이터 불러오는 중...
      </p>
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );
};
