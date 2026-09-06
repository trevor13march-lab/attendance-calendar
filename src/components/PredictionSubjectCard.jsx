import PredictionRing from './PredictionRing';

export default function PredictionSubjectCard({ subject }) {
  const {
    subject: subjectName,
    attended,
    delivered,
    predictedAttended,
    predictedDelivered,
    predictedPercentage
  } = subject;

  const currentPercentage =
    delivered > 0
      ? ((attended / delivered) * 100).toFixed(1)
      : 0;

  const difference =
    predictedPercentage - Number(currentPercentage);

  return (
    <div
      style={{
        backgroundColor: '#1e1e1e',
        border: '1px solid #333',
        borderRadius: '16px',
        padding: '18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '16px',
        marginBottom: '14px'
      }}
    >
      <div style={{ flex: 1 }}>
        <h3
          style={{
            margin: '0 0 14px',
            color: '#fff'
          }}
        >
          {subjectName}
        </h3>

        <div
          style={{
            display: 'flex',
            gap: '20px',
            color: '#aaa',
            fontSize: '0.85rem'
          }}
        >
          <div>
            <div>Current</div>
            <strong style={{ color: '#fff' }}>
              {attended} / {delivered}
            </strong>

            <div>{currentPercentage}%</div>
          </div>

          <div>
            <div>Predicted</div>
            <strong style={{ color: '#fff' }}>
              {predictedAttended} / {predictedDelivered}
            </strong>
          </div>
        </div>

        <div
          style={{
            marginTop: '14px',
            color:
              difference > 0
                ? '#4CAF50'
                : difference < 0
                  ? '#f44336'
                  : '#888',
            fontSize: '0.8rem'
          }}
        >
          {difference > 0 ? '+' : ''}
          {difference.toFixed(1)}% from current
        </div>
      </div>

      <PredictionRing
        percentage={predictedPercentage}
        size={105}
        strokeWidth={9}
      />
    </div>
  );
}