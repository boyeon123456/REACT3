import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { formatDelta, formatPoints, getBetLimit, getQuickBetValues, getRiskLabel, validateBet } from './arcadeShared';

interface Props {
  addPoints: (p: number) => void;
  currentPoints: number;
}

const CUP_COUNT = 5;
const RISK = 'mid' as const;
const PRIZES = [-150, -100, -50, 0, 50, 100, 150, 200, 250, 300];

export default function Bakara({ addPoints, currentPoints }: Props) {
  const [betAmount, setBetAmount] = useState('');
  const [betError, setBetError] = useState('');
  const [phase, setPhase] = useState<'bet' | 'pick' | 'reveal'>('bet');
  const [prizes, setPrizes] = useState<number[]>([]);
  const [revealed, setRevealed] = useState<number[]>([]);
  const [chosen, setChosen] = useState<number | null>(null);

  const parsedBet = Number.parseInt(betAmount, 10) || 0;
  const maxBet = getBetLimit(currentPoints, RISK);
  const quickBets = useMemo(() => getQuickBetValues(currentPoints, maxBet), [currentPoints, maxBet]);
  const selectedPrize = chosen === null ? 0 : prizes[chosen] ?? 0;

  const startGame = () => {
    const validation = validateBet(betAmount, currentPoints, { max: maxBet });
    if (!validation.ok) {
      setBetError(validation.error);
      return;
    }

    setBetError('');
    addPoints(-validation.bet);
    setPrizes([...PRIZES].sort(() => Math.random() - 0.5).slice(0, CUP_COUNT));
    setRevealed([]);
    setChosen(null);
    setPhase('pick');
  };

  const pick = (index: number) => {
    setChosen(index);
    const prize = prizes[index];
    if (prize > 0) addPoints(parsedBet + prize);
    else addPoints(Math.max(0, parsedBet + prize));
    setRevealed(Array.from({ length: CUP_COUNT }, (_, value) => value));
    setPhase('reveal');
  };

  const reset = () => {
    setPrizes([]);
    setRevealed([]);
    setChosen(null);
    setBetAmount('');
    setBetError('');
    setPhase('bet');
  };

  const getPrizeLabel = (value: number) => (value > 0 ? `+${value}P` : `${value}P`);
  const getPrizeColor = (value: number) => (value < 0 ? '#E74C3C' : value === 0 ? '#95A5A6' : '#27AE60');

  return (
    <div className="game-play-area arcade-game">
      <div className="game-play-header">
        <h3>컵 고르기</h3>
      </div>

      {phase === 'bet' && (
        <div className="game-shell-card arcade-shell">
          <div className="game-pill-row">
            <span className="game-pill">보유 {formatPoints(currentPoints)}</span>
            <span className="game-pill">최대 베팅 {formatPoints(maxBet)}</span>
            <span className="game-pill">손익 -150P ~ +300P</span>
            <span className="game-pill">{getRiskLabel(RISK)}</span>
          </div>
          <p className="game-note">{CUP_COUNT}개의 컵 중 하나를 골라 숨겨진 보너스를 확인합니다.</p>
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
            시작
          </button>
        </div>
      )}

      {(phase === 'pick' || phase === 'reveal') && (
        <>
          <p className="game-status-copy">{phase === 'pick' ? '컵 하나를 골라 주세요.' : '결과를 확인해 보세요.'}</p>
          <div className="pick-grid">
            {Array.from({ length: CUP_COUNT }).map((_, index) => (
              <div key={index} className="pick-tile-wrap">
                <button className={`pick-tile cup-pick-tile ${chosen === index ? 'selected' : ''}`} onClick={() => phase === 'pick' && pick(index)}>
                  컵
                </button>
                {revealed.includes(index) && (
                  <div className="pick-tile-result" style={{ color: getPrizeColor(prizes[index]) }}>
                    {getPrizeLabel(prizes[index])}
                  </div>
                )}
              </div>
            ))}
          </div>

          {phase === 'reveal' && chosen !== null && (
            <div className="game-result-card arcade-result-card">
              <p className="fortune-text" style={{ color: getPrizeColor(selectedPrize) }}>
                {selectedPrize > 0 ? '좋은 컵을 골랐어요!' : selectedPrize === 0 ? '본전이에요.' : '이번엔 손해가 났어요.'}
              </p>
              <p className={`result-amount ${selectedPrize >= 0 ? 'is-positive' : 'is-negative'}`}>{formatDelta(selectedPrize)}</p>
              <button className="game-retry-btn" onClick={reset}>
                <RotateCcw size={16} /> 다시 하기
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
