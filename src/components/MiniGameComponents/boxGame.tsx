import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { formatDelta, formatPoints, getBetLimit, getQuickBetValues, getRiskLabel, validateBet } from './arcadeShared';

interface Props {
  addPoints: (p: number) => void;
  currentPoints: number;
}

const BOXES = 5;
const RISK = 'high' as const;
const PRIZES = [
  { label: '큰 손실', value: -100, color: '#E74C3C', prob: 0.15 },
  { label: '작은 손실', value: -10, color: '#E67E22', prob: 0.2 },
  { label: '원금', value: 0, color: '#95A5A6', prob: 0.25 },
  { label: '소액 보상', value: 20, color: '#3498DB', prob: 0.25 },
  { label: '큰 보상', value: 100, color: '#27AE60', prob: 0.25 },
  { label: '5배 보상', value: 5, color: '#27AE60', prob: 0.35, isMultiplier: true },
];

function pickPrize() {
  const rand = Math.random();
  let cumulative = 0;
  for (const prize of PRIZES) {
    cumulative += prize.prob;
    if (rand < cumulative) return prize;
  }
  return PRIZES[0];
}

export default function BoxGame({ addPoints, currentPoints }: Props) {
  const [betAmount, setBetAmount] = useState('');
  const [betError, setBetError] = useState('');
  const [phase, setPhase] = useState<'bet' | 'pick' | 'result'>('bet');
  const [prizes, setPrizes] = useState<typeof PRIZES>([]);
  const [lastPrize, setLastPrize] = useState<(typeof PRIZES)[0] | null>(null);

  const parsedBet = Number.parseInt(betAmount, 10) || 0;
  const maxBet = getBetLimit(currentPoints, RISK);
  const quickBets = useMemo(() => getQuickBetValues(currentPoints, maxBet), [currentPoints, maxBet]);
  const netAmount = lastPrize ? (lastPrize.isMultiplier ? parsedBet * lastPrize.value - parsedBet : lastPrize.value - parsedBet) : 0;

  const startGame = () => {
    const validation = validateBet(betAmount, currentPoints, { max: maxBet });
    if (!validation.ok) {
      setBetError(validation.error);
      return;
    }

    setBetError('');
    addPoints(-validation.bet);
    setPrizes(Array.from({ length: BOXES }, () => pickPrize()));
    setPhase('pick');
  };

  const openBox = (index: number) => {
    const prize = prizes[index];
    setLastPrize(prize);
    if (prize.isMultiplier) addPoints(parsedBet * prize.value);
    else addPoints(prize.value);
    setPhase('result');
  };

  const reset = () => {
    setPrizes([]);
    setBetAmount('');
    setBetError('');
    setLastPrize(null);
    setPhase('bet');
  };

  return (
    <div className="game-play-area arcade-game">
      <div className="game-play-header">
        <h3>상자 열기</h3>
      </div>

      {phase === 'bet' && (
        <div className="game-shell-card arcade-shell">
          <div className="game-pill-row">
            <span className="game-pill">보유 {formatPoints(currentPoints)}</span>
            <span className="game-pill">최대 베팅 {formatPoints(maxBet)}</span>
            <span className="game-pill">손익 -100% ~ +4900%</span>
            <span className="game-pill">{getRiskLabel(RISK)}</span>
          </div>
          <p className="game-note">상자 하나를 골라 배당을 확인합니다. 대박 구간은 크지만 손실도 그대로 남는 고위험 게임이에요.</p>
          <div className="bet-input-row">
            <input
              type="number"
              className="bet-input"
              placeholder="베팅 금액"
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
          <div className="bet-quick-btns">
            {quickBets.map((value) => (
              <button key={value} className="bet-quick-btn" onClick={() => setBetAmount(String(value))}>
                {formatPoints(value)}
              </button>
            ))}
          </div>
          {betError && <p className="bet-error">{betError}</p>}
          <button className="game-start-btn" onClick={startGame} disabled={!parsedBet}>
            상자 고르기
          </button>
        </div>
      )}

      {phase === 'pick' && (
        <>
          <p className="game-status-copy">상자 하나를 골라 보상을 확인해 보세요.</p>
          <div className="pick-grid">
            {Array.from({ length: BOXES }).map((_, index) => (
              <button key={index} className="pick-tile box-pick-tile" onClick={() => openBox(index)}>
                ?
              </button>
            ))}
          </div>
        </>
      )}

      {phase === 'result' && lastPrize && (
        <div className="game-result-card arcade-result-card">
          <p className="fortune-text" style={{ color: lastPrize.color }}>
            {lastPrize.label}
          </p>
          <p className={`result-amount ${netAmount >= 0 ? 'is-positive' : 'is-negative'}`}>{formatDelta(netAmount)}</p>
          <p className="result-subcopy">베팅 {formatPoints(parsedBet)} 기준 최종 손익입니다.</p>
          <button className="game-retry-btn" onClick={reset}>
            <RotateCcw size={16} /> 다시 하기
          </button>
        </div>
      )}
    </div>
  );
}
