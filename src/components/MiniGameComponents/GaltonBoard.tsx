import { useMemo, useState } from 'react';
import { Play, RotateCcw, Sparkles } from 'lucide-react';
import { formatDelta, formatPoints, getBetLimit, getQuickBetValues, getRiskLabel, validateBet } from './arcadeShared';

interface GaltonBoardProps {
  addPoints: (p: number) => void;
  currentPoints: number;
}

const ROWS = 10;
const RISK = 'high' as const;
const SLOT_MULTIPLIERS = [100, 50, 10, 5, 2, 0, 2, 5, 10, 50, 100];

export function GaltonBoard({ addPoints, currentPoints }: GaltonBoardProps) {
  const [ballPos, setBallPos] = useState({ x: 0, y: -1 });
  const [dropping, setDropping] = useState(false);
  const [result, setResult] = useState<{ slot: number; multiplier: number; earned: number } | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [betError, setBetError] = useState('');

  const parsedBet = Number.parseInt(betAmount, 10) || 0;
  const maxBet = getBetLimit(currentPoints, RISK);
  const quickBets = useMemo(() => getQuickBetValues(currentPoints, maxBet), [currentPoints, maxBet]);

  const drop = () => {
    if (dropping) return;

    const validation = validateBet(betAmount, currentPoints, { max: maxBet });
    if (!validation.ok) {
      setBetError(validation.error);
      return;
    }

    const bet = validation.bet;
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

        if (earned > 0) addPoints(earned);

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

  const netAmount = result ? result.earned - parsedBet : 0;

  return (
    <div className="game-play-area galton-container arcade-game">
      <div className="game-play-header galton-header">
        <h3>갈톤 보드</h3>
      </div>
      <p className="galton-subtitle">공이 핀을 지나며 슬롯에 떨어집니다. 중앙은 0배, 가장자리는 100배인 고위험 고보상 게임입니다.</p>

      {!dropping && result === null && (
        <div className="bet-section galton-bet-section arcade-shell">
          <div className="game-pill-row">
            <span className="game-pill">보유 {formatPoints(currentPoints)}</span>
            <span className="game-pill">최대 베팅 {formatPoints(maxBet)}</span>
            <span className="game-pill">손익 -100% ~ +9900%</span>
            <span className="game-pill">{getRiskLabel(RISK)}</span>
          </div>

          <div className="bet-input-group">
            <label className="bet-input-label">베팅 금액</label>
            <div className="bet-input-row">
              <input
                type="number"
                className="bet-input"
                placeholder="베팅 금액 입력"
                value={betAmount}
                min={1}
                max={maxBet}
                onChange={(event) => {
                  setBetAmount(event.target.value);
                  setBetError('');
                }}
              />
              <span className="bet-unit">P</span>
            </div>
          </div>

          <div className="bet-quick-btns">
            {quickBets.map((value) => (
              <button key={value} className="bet-quick-btn" onClick={() => setBetAmount(String(value))}>
                {formatPoints(value)}
              </button>
            ))}
          </div>

          {betError && <p className="bet-error">{betError}</p>}
        </div>
      )}

      <div className="board-visualizer galton-board-visualizer">
        <div className="galton-drop-zone">
          <span className="galton-drop-ball" aria-hidden="true" />
          <span className="galton-drop-text">{dropping ? 'DROP NOW' : 'READY TO DROP'}</span>
        </div>

        <svg viewBox={`0 -1 ${ROWS + 1} ${ROWS + 2}`} className="galton-svg" aria-label="갈톤 보드">
          {[...Array(ROWS + 1)].map((_, row) =>
            [...Array(row + 1)].map((__, col) => <circle key={`pin-${row}-${col}`} cx={col + (ROWS - row) / 2} cy={row} r="0.1" className="pin" />)
          )}
          {ballPos.y >= 0 && <circle cx={ballPos.x + (ROWS - ballPos.y) / 2} cy={ballPos.y} r="0.22" className="ball" />}
        </svg>

        <div className="galton-slots">
          {SLOT_MULTIPLIERS.map((multiplier, index) => (
            <div
              key={multiplier + index}
              className={`galton-slot ${result?.slot === index ? 'slot-active' : ''} ${multiplier >= 10 ? 'slot-high' : multiplier >= 3 ? 'slot-mid' : multiplier === 0 ? 'slot-zero' : ''}`}
            >
              <span className="galton-slot-label">{multiplier}x</span>
            </div>
          ))}
        </div>
      </div>

      <div className="controls galton-controls">
        {!dropping && result === null && (
          <button className="game-start-btn galton-start-btn" onClick={drop} disabled={!parsedBet || parsedBet > maxBet}>
            <Play size={18} /> 공 떨어뜨리기
          </button>
        )}

        {result !== null && (
          <div className="game-result-card arcade-result-card">
            <div className="result-badge">
              <Sparkles size={16} />
              {result.multiplier}x 슬롯 도착
            </div>

            <div className="galton-summary-row">
              <div className="galton-summary-card">
                <strong>{result.multiplier}x</strong>
                <span>배수</span>
              </div>
              <div className="galton-summary-card">
                <strong>{formatPoints(result.earned)}</strong>
                <span>지급</span>
              </div>
              <div className="galton-summary-card">
                <strong className={netAmount >= 0 ? 'profit-text' : 'loss-text'}>{formatDelta(netAmount)}</strong>
                <span>손익</span>
              </div>
            </div>

            <p className="fortune-text">{result.multiplier >= 10 ? '가장자리 고배당 구간에 도착했어요.' : result.multiplier >= 2 ? '중간 배수 구간에 도착했어요.' : '이번엔 중앙 저배당 구간에 떨어졌어요.'}</p>
            <p className={`result-amount ${netAmount >= 0 ? 'is-positive' : 'is-negative'}`}>{formatDelta(netAmount)}</p>
            <button className="game-retry-btn" onClick={reset}>
              <RotateCcw size={16} /> 다시 하기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
