export default function PredictionRing({
  percentage = 0,
  size = 110,
  strokeWidth = 10
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  const safePercentage = Math.min(
    Math.max(Number(percentage) || 0, 0),
    100
  );

  const progressOffset =
    circumference -
    (safePercentage / 100) * circumference;

  const getProgressColor = () => {
    if (safePercentage >= 75) return '#4CAF50';
    if (safePercentage >= 65) return '#ff9800';
    return '#f44336';
  };

  return (
    <div
      style={{
        width: size,
        height: size,
        position: 'relative',
        flexShrink: 0
      }}
    >
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{
          transform: 'rotate(-90deg)'
        }}
      >
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke="#2a2a2a"
          strokeWidth={strokeWidth}
        />

        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="transparent"
          stroke={getProgressColor()}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={progressOffset}
          style={{
            transition: 'stroke-dashoffset 0.5s ease'
          }}
        />
      </svg>

      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <span
          style={{
            color: '#fff',
            fontSize: '1.05rem',
            fontWeight: '700'
          }}
        >
          {safePercentage.toFixed(1)}%
        </span>

        <span
          style={{
            color: '#888',
            fontSize: '0.65rem',
            marginTop: '4px'
          }}
        >
          Predicted
        </span>
      </div>
    </div>
  );
}