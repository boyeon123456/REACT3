import { useState } from 'react';
import { Play, RotateCcw } from 'lucide-react';

interface GaltonBoardProps {
  addPoints: (p: number) => void;
  currentPoints: number;
}

const ROWS = 10;
const SLOT_MULTIPLIERS = [100, 50, 10, 5, 2, 0, 2, 5, 10, 50, 100];

export function GaltonBoard({ addPoints, currentPoints }: GaltonBoardProps) {
  const [ballPos, setBallPos] = useState({ x: 0, y: -1 });
  const [dropping, setDropping] = useState(false);
  const [result, setResult] = useState<{ slot: number; multiplier: number; earned: number } | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [betError, setBetError] = useState('');

  const parsedBet = parseInt(betAmount, 10) || 0;

  const drop = () => {
    if (dropping) return;

    const bet = parseInt(betAmount, 10);
    if (!bet || bet <= 0) {
      setBetError('베팅 금액을 입력해 주세요.');
      return;
    }

    if (bet > currentPoints) {
      setBetError('보유 포인트보다 큰 금액은 베팅할 수 없어요.');
      return;
    }

    setBetError('');
    addPoints(-bet);
    setDropping(true);
    setResult(null);
    setBallPos({ x: 0, y: 0 });

    let currentCol = 0;
    let currentRow = 0;

    const interval = window.setInterval(() => {
      if (currentRow >= ROWS) {
        window.clearInterval(interval);
        const finalSlot = currentCol;
        const multiplier = SLOT_MULTIPLIERS[finalSlot];
        const earned = bet * multiplier;

        if (earned > 0) {
          addPoints(earned);
        }

        setResult({ slot: finalSlot, multiplier, earned });
        setDropping(false);
        return;
      }

      currentCol += Math.random() > 0.5 ? 1 : 0;
      currentRow += 1;
      setBallPos({ x: currentCol, y: currentRow });
    }, 200);
  };

  const reset = () => {
    setResult(null);
    setBallPos({ x: 0, y: -1 });
    setBetAmount('');
    setBetError('');
    setDropping(false);
  };

  return (
    <div className="galton-container">
      <div className="game-play-header galton-header">
        <h3>갈튼 보드</h3>
      </div>
      <p className="galton-subtitle">공이 핀 사이를 튕기며 떨어지고, 마지막 칸의 배수만큼 포인트를 받습니다.</p>

      {!dropping && result === null && (
        <div className="bet-section galton-bet-section">
          <p className="bet-balance">
            보유 포인트 <strong>{currentPoints}P</strong>
          </p>
          <div className="bet-input-row">
            <input
              type="number"
              className="bet-input"
              placeholder="베팅 금액 입력"
              value={betAmount}
              min={1}
              max={currentPoints}
              onChange={(e) => {
                setBetAmount(e.target.value);
                setBetError('');
              }}
            />
            <span className="bet-unit">P</span>
          </div>
          <div className="bet-quick-btns">
            {[10, 50, 100, 500].map((value) => (
              <button
                key={value}
                className="bet-quick-btn"
                onClick={() => setBetAmount(String(Math.min(value, currentPoints)))}
              >
                {value}P
              </button>
            ))}
            <button className="bet-quick-btn" onClick={() => setBetAmount(String(currentPoints))}>
              MAX
            </button>
          </div>
          {betError && <p className="bet-error">{betError}</p>}
        </div>
      )}

      <div className="board-visualizer galton-board-visualizer">
        <div className="galton-drop-zone">
          <span className="galton-drop-ball" aria-hidden="true" />
          <span className="galton-drop-text">{dropping ? '낙하 중' : 'DROP'}</span>
        </div>

        <svg viewBox={`0 -1 ${ROWS + 1} ${ROWS + 2}`} className="galton-svg" aria-label="갈튼 보드">
          {[...Array(ROWS + 1)].map((_, row) =>
            [...Array(row + 1)].map((_, col) => (
              <circle
                key={`pin-${row}-${col}`}
                cx={col + (ROWS - row) / 2}
                cy={row}
                r="0.1"
                className="pin"
              />
            ))
          )}
          {ballPos.y >= 0 && (
            <circle
              cx={ballPos.x + (ROWS - ballPos.y) / 2}
              cy={ballPos.y}
              r="0.22"
              className="ball"
            />
          )}
        </svg>

        <div className="galton-slots">
          {SLOT_MULTIPLIERS.map((multiplier, index) => (
            <div
              key={multiplier + index}
              className={`galton-slot ${result?.slot === index ? 'slot-active' : ''} ${
                multiplier >= 10 ? 'slot-high' : multiplier >= 3 ? 'slot-mid' : multiplier === 0 ? 'slot-zero' : ''
              }`}
            >
              <span className="galton-slot-label">{multiplier}x</span>
            </div>
          ))}
        </div>
      </div>

      <div className="controls galton-controls">
        {!dropping && result === null && (
          <button className="game-start-btn galton-start-btn" onClick={drop} disabled={!parsedBet || parsedBet > currentPoints}>
            <Play size={18} /> 공 떨어뜨리기
          </button>
        )}

        {result !== null && (
          <div className="fortune-result galton-result">
            <p className="fortune-text">
              {result.multiplier >= 10
                ? '대박 구간에 정확히 들어갔어요.'
                : result.multiplier >= 3
                  ? '수익 구간으로 잘 들어왔어요.'
                  : result.multiplier >= 1
                    ? '본전 근처에서 마무리됐어요.'
                    : '이번에는 꽝 칸으로 떨어졌어요.'}
            </p>
            <p className="fortune-points">
              {result.multiplier}x 배수로 +{result.earned}P 획득
              <span className={parsedBet > result.earned ? 'loss-text' : 'profit-text'}>
                {' '}
                ({result.earned - parsedBet >= 0 ? '+' : ''}
                {result.earned - parsedBet}P)
              </span>
            </p>
            <button className="game-retry-btn" onClick={reset}>
              <RotateCcw size={16} /> 다시 하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
