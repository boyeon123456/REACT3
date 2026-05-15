import { useMemo, useState } from 'react';
import { RotateCcw } from 'lucide-react';
import { formatDelta, formatPoints, getBetLimit, getQuickBetValues, getRiskLabel, validateBet } from './arcadeShared';

interface Props {
  addPoints: (p: number) => void;
  currentPoints: number;
}

type RPS = 'rock' | 'paper' | 'scissors';

const RISK = 'mid' as const;
const OPTIONS: { id: RPS; label: string; emoji: string }[] = [
  { id: 'rock', label: '바위', emoji: 'R' },
  { id: 'paper', label: '보', emoji: 'P' },
  { id: 'scissors', label: '가위', emoji: 'S' },
];

const beats: Record<RPS, RPS> = { rock: 'scissors', scissors: 'paper', paper: 'rock' };
const pickComputerChoice = (): RPS => OPTIONS[Math.floor(Math.random() * OPTIONS.length)].id;

export default function RockPaperScissors({ addPoints, currentPoints }: Props) {
  const [choice, setChoice] = useState<RPS | null>(null);
  const [compChoice, setCompChoice] = useState<RPS | null>(null);
  const [outcome, setOutcome] = useState<'win' | 'lose' | 'draw' | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [betError, setBetError] = useState('');

  const parsedBet = Number.parseInt(betAmount, 10) || 0;
  const maxBet = getBetLimit(currentPoints, RISK);
  const quickBets = useMemo(() => getQuickBetValues(currentPoints, maxBet), [currentPoints, maxBet]);

  const play = (selected: RPS) => {
    const validation = validateBet(betAmount, currentPoints, { max: maxBet });
    if (!validation.ok) {
      setBetError(validation.error);
      return;
    }

    const bet = validation.bet;
    const computer = pickComputerChoice();
    setChoice(selected);
    setCompChoice(computer);
    setBetError('');

    let result: 'win' | 'lose' | 'draw';
    if (selected === computer) result = 'draw';
    else if (beats[selected] === computer) result = 'win';
    else result = 'lose';

    setOutcome(result);
    addPoints(-bet);
    if (result === 'win') addPoints(bet * 2);
    else if (result === 'draw') addPoints(bet);
  };

  const reset = () => {
    setChoice(null);
    setCompChoice(null);
    setOutcome(null);
    setBetAmount('');
    setBetError('');
  };

  const getNet = () => {
    if (outcome === 'win') return parsedBet;
    if (outcome === 'draw') return 0;
    return -parsedBet;
  };

  return (
    <div className="game-play-area arcade-game">
      <div className="game-play-header">
        <h3>가위바위보</h3>
      </div>

      {outcome === null && (
        <div className="game-shell-card arcade-shell">
          <div className="game-pill-row">
            <span className="game-pill">보유 {formatPoints(currentPoints)}</span>
            <span className="game-pill">최대 베팅 {formatPoints(maxBet)}</span>
            <span className="game-pill">손익 -100% ~ +100%</span>
            <span className="game-pill">{getRiskLabel(RISK)}</span>
          </div>
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
          <p className="game-status-copy">원하는 선택을 골라 한 판 승부를 보세요.</p>
          <div className="coin-choices rps-choices">
            {OPTIONS.map((option) => (
              <button key={option.id} className="coin-btn rps-btn" onClick={() => play(option.id)} disabled={!parsedBet}>
                <span className="coin-btn-emoji">{option.emoji}</span>
                <span className="coin-btn-title">{option.label}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {outcome !== null && choice && compChoice && (
        <div className="game-result-card arcade-result-card">
          <div className="rps-result-row">
            <div>
              <strong>{OPTIONS.find((option) => option.id === choice)?.emoji}</strong>
              <span>나</span>
            </div>
            <span>VS</span>
            <div>
              <strong>{OPTIONS.find((option) => option.id === compChoice)?.emoji}</strong>
              <span>상대</span>
            </div>
          </div>
          <p className="fortune-text">{outcome === 'win' ? '승리했어요!' : outcome === 'draw' ? '무승부예요.' : '이번 판은 졌어요.'}</p>
          <p className={`result-amount ${outcome === 'lose' ? 'is-negative' : 'is-positive'}`}>{formatDelta(getNet())}</p>
          <button className="game-retry-btn" onClick={reset}>
            <RotateCcw size={16} /> 다시 하기
          </button>
        </div>
      )}
    </div>
  );
}
