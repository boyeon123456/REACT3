import { useMemo, useState } from 'react';
import { RotateCcw, Sparkles } from 'lucide-react';

interface Props {
  addPoints: (p: number) => void;
}

const PRIZES = [
  { label: '10P', value: 10, color: '#ff6b6b', weight: 10 },
  { label: '50P', value: 50, color: '#ffd166', weight: 15 },
  { label: '100P', value: 100, color: '#7bd389', weight: 20 },
  { label: '200P', value: 200, color: '#4dabf7', weight: 20 },
  { label: '500P', value: 500, color: '#f783ac', weight: 20 },
  { label: '1000P', value: 1000, color: '#9b5de5', weight: 15 },
];

const SEGMENT_ANGLE = 360 / PRIZES.length;
const SPIN_DURATION_MS = 3600;

function pickPrizeIndex() {
  const totalWeight = PRIZES.reduce((sum, prize) => sum + prize.weight, 0);
  const roll = Math.random() * totalWeight;
  let cumulative = 0;

  for (let index = 0; index < PRIZES.length; index += 1) {
    cumulative += PRIZES[index].weight;
    if (roll < cumulative) {
      return index;
    }
  }

  return PRIZES.length - 1;
}

export default function Roulette({ addPoints }: Props) {
  const [angle, setAngle] = useState(0);
  const [resultIndex, setResultIndex] = useState<number | null>(null);
  const [spinning, setSpinning] = useState(false);

  const wheelBackground = useMemo(
    () =>
      `conic-gradient(${PRIZES.map((prize, index) => {
        const start = index * SEGMENT_ANGLE;
        const end = start + SEGMENT_ANGLE;
        return `${prize.color} ${start}deg ${end}deg`;
      }).join(', ')})`,
    []
  );

  const spin = () => {
    if (spinning) return;

    const targetIndex = pickPrizeIndex();
    const targetRotation = 360 * 6 - (targetIndex * SEGMENT_ANGLE + SEGMENT_ANGLE / 2);

    setSpinning(true);
    setResultIndex(null);
    setAngle(targetRotation);

    window.setTimeout(() => {
      const prize = PRIZES[targetIndex];
      setResultIndex(targetIndex);
      setSpinning(false);
      addPoints(prize.value);
    }, SPIN_DURATION_MS);
  };

  const reset = () => {
    setAngle(0);
    setResultIndex(null);
    setSpinning(false);
  };

  const resultPrize = resultIndex !== null ? PRIZES[resultIndex] : null;

  return (
    <div className="game-play-area roulette-game">
      <div className="game-play-header">
        <h3>룰렛</h3>
      </div>

      <p className="roulette-subtitle">가볍게 한 판 돌리고 랜덤 포인트를 받아보세요. 당첨 구간은 확률이 다르지만, 결과는 끝까지 긴장감 있게 보여드려요.</p>

      <div className="roulette-status">
        <div className="roulette-status-card">
          <strong>6칸</strong>
          <span>보상 구간</span>
        </div>
        <div className="roulette-status-card">
          <strong>최대 1,000P</strong>
          <span>한 번에 획득</span>
        </div>
        <div className="roulette-status-card">
          <strong>{spinning ? '회전 중' : '대기 중'}</strong>
          <span>현재 상태</span>
        </div>
      </div>

      <div className="roulette-board">
        <div className="roulette-pointer" aria-hidden="true">
          <span className="roulette-pointer-cap" />
        </div>

        <div className="roulette-wheel-shell">
          <div className={`roulette-wheel ${spinning ? 'is-spinning' : ''}`} style={{ transform: `rotate(${angle}deg)` }}>
            <div className="roulette-wheel-face" style={{ background: wheelBackground }}>
              <div className="roulette-wheel-lines" aria-hidden="true" />

              {PRIZES.map((prize, index) => {
                const degree = index * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 - 90;
                const radian = (degree * Math.PI) / 180;
                const left = 50 + Math.cos(radian) * 36;
                const top = 50 + Math.sin(radian) * 36;

                return (
                  <div key={prize.label} className="roulette-segment-label" style={{ left: `${left}%`, top: `${top}%` }}>
                    <span>{prize.label}</span>
                  </div>
                );
              })}
            </div>

            <div className="roulette-center">
              <strong>SPIN</strong>
              <small>LUCKY</small>
            </div>
          </div>
        </div>
      </div>

      <div className="roulette-legend" aria-label="룰렛 구간 목록">
        {PRIZES.map((prize) => (
          <div key={prize.label} className={`roulette-legend-item ${resultPrize?.label === prize.label ? 'is-hit' : ''}`}>
            <span className="roulette-legend-dot" style={{ backgroundColor: prize.color }} />
            <span>{prize.label}</span>
          </div>
        ))}
      </div>

      <button className="game-start-btn roulette-start-btn" onClick={spin} disabled={spinning}>
        {spinning ? '룰렛이 돌아가는 중...' : '룰렛 돌리기'}
      </button>

      {resultPrize && (
        <div className="game-result-card">
          <div className="result-badge">
            <Sparkles size={16} />
            {resultPrize.label} 구간 당첨
          </div>
          <p className="fortune-text">포인터가 {resultPrize.label} 구간에 멈췄어요. 귀여운 한 판이지만 보상은 꽤 묵직하죠.</p>
          <p className="result-amount is-positive" style={{ color: resultPrize.color }}>
            +{resultPrize.value}P
          </p>
          <p className="result-subcopy">다시 돌리면 새로운 결과로 한 번 더 행운을 시험할 수 있어요.</p>
          <button className="game-retry-btn" onClick={reset}>
            <RotateCcw size={16} /> 다시 돌리기
          </button>
        </div>
      )}
    </div>
  );
}
