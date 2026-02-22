import { T } from '../../constants/theme';

interface ErrorScreenProps {
  message: string;
  onRetry: () => void;
}

export const ErrorScreen = ({ message, onRetry }: ErrorScreenProps) => {
  return (
    <div style={{
      minHeight: "100vh",
      background: T.bg,
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      gap: 16,
      padding: 24
    }}>
      <div style={{ fontSize: 40 }}>⚠️</div>
      <p style={{
        color: T.text,
        fontSize: 16,
        fontWeight: 700,
        textAlign: "center"
      }}>
        데이터 불러오기 실패
      </p>
      <p style={{
        color: T.textSec,
        fontSize: 12,
        textAlign: "center",
        maxWidth: 320
      }}>
        {message}
      </p>
      <button
        onClick={onRetry}
        style={{
          padding: "10px 24px",
          borderRadius: 10,
          background: T.accentDim,
          border: `1px solid ${T.borderActive}`,
          color: T.accent,
          fontSize: 13,
          fontWeight: 700,
          cursor: "pointer"
        }}
      >
        다시 시도
      </button>
    </div>
  );
};
