import { useEffect, useMemo, useRef, useState } from 'react';
import { Coins, RotateCcw, Sparkles, Trophy } from 'lucide-react';
import {
  formatDelta,
  formatPoints,
  getQuickBetValues,
  type ArcadeSessionReporter,
  validateBet,
} from './arcadeShared';

interface Props {
  addPoints: (p: number) => void;
  currentPoints: number;
  onSessionChange?: ArcadeSessionReporter;
}

type SlotSymbol = {
  id: string;
  mark: string;
  label: string;
  multiplier: number;
  tone: 'legendary' | 'premium' | 'rare' | 'standard';
};

type SpinResult = {
  symbols: SlotSymbol[];
  multiplier: number;
  bet: number;
  payout: number;
  net: number;
  title: string;
  message: string;
  tier: 'jackpot' | 'win' | 'near' | 'lose';
};

const SYMBOLS: SlotSymbol[] = [
  { id: 'seven', mark: '7', label: '럭키 세븐', multiplier: 12, tone: 'legendary' },
  { id: 'diamond', mark: '◆', label: '다이아', multiplier: 8, tone: 'legendary' },
  { id: 'star', mark: '★', label: '스타', multiplier: 5, tone: 'premium' },
  { id: 'bell', mark: '♬', label: '벨', multiplier: 3, tone: 'premium' },
  { id: 'grape', mark: 'G', label: '포도', multiplier: 2, tone: 'rare' },
  { id: 'lemon', mark: 'L', label: '레몬', multiplier: 1.5, tone: 'standard' },
  { id: 'cherry', mark: 'C', label: '체리', multiplier: 1.2, tone: 'standard' },
];

const INITIAL_REELS = [SYMBOLS[0], SYMBOLS[1], SYMBOLS[2]];
const STOP_DELAYS = [760, 1220, 1720];
const MAX_BET = 500;

function getRandomSymbol() {
  return SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
}

function getResult(finalSymbols: SlotSymbol[], bet: number): SpinResult {
  const [first] = finalSymbols;
  const ids = finalSymbols.map((symbol) => symbol.id);
  const isTriple = ids.every((id) => id === ids[0]);
  const uniqueCount = new Set(ids).size;

  if (isTriple) {
    const payout = Math.floor(bet * first.multiplier);
    return {
      symbols: finalSymbols,
      multiplier: first.multiplier,
      bet,
      payout,
      net: payout - bet,
      title: first.multiplier >= 8 ? 'Jackpot' : 'Big Win',
      message: `${first.label} 3개가 완전히 맞물렸어요.`,
      tier: first.multiplier >= 8 ? 'jackpot' : 'win',
    };
  }

  if (uniqueCount === 2) {
    const pairSymbol = finalSymbols.find((symbol, index) => finalSymbols.findIndex((entry) => entry.id === symbol.id) !== index) ?? first;
    const payout = Math.floor(bet * 0.55);
    return {
      symbols: finalSymbols,
      multiplier: 0.55,
      bet,
      payout,
      net: payout - bet,
      title: 'Near Hit',
      message: `${pairSymbol.label} 라인이 2개 맞았어요. 손실을 조금만 남기고 빠져나갑니다.`,
      tier: 'near',
    };
  }

  return {
    symbols: finalSymbols,
    multiplier: 0,
    bet,
    payout: 0,
    net: -bet,
    title: 'Miss',
    message: '이번에는 배당 라인이 끝까지 이어지지 않았어요.',
    tier: 'lose',
  };
}

export default function SlotMachine({ addPoints, currentPoints, onSessionChange }: Props) {
  const [reels, setReels] = useState<SlotSymbol[]>(INITIAL_REELS);
  const [lockedReels, setLockedReels] = useState(3);
  const [spinning, setSpinning] = useState(false);
  const [phase, setPhase] = useState<'bet' | 'playing' | 'resolving' | 'result'>('bet');
  const [result, setResult] = useState<SpinResult | null>(null);
  const [betAmount, setBetAmount] = useState('');
  const [betError, setBetError] = useState('');
  const [teaser, setTeaser] = useState('세 라인을 완전히 맞춰야 큰 배당이 열립니다.');
  const intervalRef = useRef<number | null>(null);
  const timeoutRefs = useRef<number[]>([]);

  const parsedBet = Number.parseInt(betAmount, 10) || 0;
  const quickBets = useMemo(() => getQuickBetValues(currentPoints, MAX_BET), [currentPoints]);
  const potentialMax = parsedBet > 0 ? Math.floor(parsedBet * SYMBOLS[0].multiplier) : 0;

  const payoutRows = useMemo(
    () =>
      SYMBOLS.map((symbol) => ({
        ...symbol,
        combo: `${symbol.mark}${symbol.mark}${symbol.mark}`,
      })),
    []
  );

  useEffect(() => {
    return () => {
      if (intervalRef.current) window.clearInterval(intervalRef.current);
      timeoutRefs.current.forEach((timer) => window.clearTimeout(timer));
    };
  }, []);

  useEffect(() => {
    onSessionChange?.({
      phase: phase === 'bet' ? 'bet' : phase,
      betAmount: parsedBet || undefined,
      statusLabel: spinning ? '릴 회전 중' : result ? result.title : '배당표 확인',
      progressLabel: parsedBet ? `최대 ${formatPoints(potentialMax)}` : '베팅 준비',
      recentDelta: result?.net,
      recentMessage: result?.message ?? teaser,
      tone: result ? (result.net > 0 ? 'positive' : result.net < 0 ? 'negative' : 'neutral') : 'neutral',
    });
  }, [onSessionChange, parsedBet, phase, potentialMax, result, spinning, teaser]);

  const setQuickBet = (value: number) => {
    if (spinning) return;
    setBetAmount(String(value));
    setBetError('');
  };

  const spin = () => {
    const validation = validateBet(betAmount, currentPoints, { max: MAX_BET });
    if (!validation.ok) {
      setBetError(validation.error);
      return;
    }

    if (spinning) return;

    const finalSymbols = [getRandomSymbol(), getRandomSymbol(), getRandomSymbol()];
    let stoppedCount = 0;

    timeoutRefs.current.forEach((timer) => window.clearTimeout(timer));
    timeoutRefs.current = [];

    setBetError('');
    setResult(null);
    setTeaser('릴이 멈추기 전까지 중간 라인이 계속 흔들립니다.');
    setSpinning(true);
    setPhase('playing');
    setLockedReels(0);
    addPoints(-validation.bet);

    intervalRef.current = window.setInterval(() => {
      setReels((current) =>
        current.map((currentSymbol, index) => {
          if (index < stoppedCount) return finalSymbols[index];
          return getRandomSymbol() ?? currentSymbol;
        })
      );
    }, 80);

    STOP_DELAYS.forEach((delay, index) => {
      const timer = window.setTimeout(() => {
        stoppedCount = index + 1;
        setLockedReels(stoppedCount);
        setReels((current) => current.map((currentSymbol, reelIndex) => (reelIndex <= index ? finalSymbols[reelIndex] : currentSymbol)));

        if (stoppedCount === 2) {
          const firstTwoMatch = finalSymbols[0].id === finalSymbols[1].id || finalSymbols[1].id === finalSymbols[2].id;
          if (firstTwoMatch) {
            setTeaser('두 개가 먼저 붙었어요. 마지막 한 칸이 긴장감을 끌어올립니다.');
          }
        }

        if (stoppedCount === 3) {
          if (intervalRef.current) window.clearInterval(intervalRef.current);
          setPhase('resolving');
          const nextResult = getResult(finalSymbols, validation.bet);
          setResult(nextResult);
          setTeaser(nextResult.message);

          window.setTimeout(() => {
            if (nextResult.payout > 0) addPoints(nextResult.payout);
            setSpinning(false);
            setPhase('result');
          }, 360);
        }
      }, delay);
      timeoutRefs.current.push(timer);
    });
  };

  const reset = () => {
    if (spinning) return;
    setReels(INITIAL_REELS);
    setLockedReels(3);
    setResult(null);
    setBetError('');
    setTeaser('세 라인을 완전히 맞춰야 큰 배당이 열립니다.');
    setPhase('bet');
  };

  return (
    <div className="game-play-area slot-machine-game arcade-game">
      <div className="slot-console" data-result-tier={result?.tier || 'idle'}>
        <div className="slot-topbar">
          <div>
            <span className="slot-kicker">Neon Pocket Slots</span>
            <h3>슬롯 머신</h3>
          </div>
          <div className="slot-balance">
            <Coins size={16} />
            <span>{formatPoints(currentPoints)}</span>
          </div>
        </div>

        <div className="slot-machine-window" aria-label="슬롯 릴">
          <div className="slot-payline" aria-hidden="true" />
          {reels.map((symbol, index) => (
            <div key={`${symbol.id}-${index}`} className={`slot-reel ${spinning && index >= lockedReels ? 'is-spinning' : ''} is-${symbol.tone}`}>
              <span className="slot-symbol">{symbol.mark}</span>
              <small>{symbol.label}</small>
            </div>
          ))}
        </div>

        <div className="slot-status-strip">
          <div>
            <span>베팅</span>
            <strong>{parsedBet > 0 ? formatPoints(parsedBet) : '-'}</strong>
          </div>
          <div>
            <span>최대 수익</span>
            <strong>{potentialMax > 0 ? formatPoints(potentialMax) : '-'}</strong>
          </div>
          <div>
            <span>상태</span>
            <strong>{spinning ? '회전 중' : result ? result.title : '대기'}</strong>
          </div>
        </div>

        <div className="slot-bet-panel">
          <label className="slot-input-label" htmlFor="slot-bet-input">
            베팅 금액
          </label>
          <div className="slot-input-row">
            <input
              id="slot-bet-input"
              type="number"
              className="slot-bet-input"
              placeholder="0"
              value={betAmount}
              min={1}
              max={Math.min(currentPoints, MAX_BET)}
              disabled={spinning}
              onChange={(event) => {
                setBetAmount(event.target.value);
                setBetError('');
              }}
            />
            <span>P</span>
          </div>

          <div className="slot-quick-grid">
            {quickBets.map((value) => (
              <button type="button" key={value} onClick={() => setQuickBet(value)} disabled={spinning}>
                {value >= 1000 ? `${Math.floor(value / 1000)}K` : value}
              </button>
            ))}
          </div>

          {betError && <p className="slot-error">{betError}</p>}

          <button className="slot-spin-button" type="button" onClick={spin} disabled={spinning || !parsedBet}>
            {spinning ? (
              <>
                <Sparkles size={18} />
                회전 중
              </>
            ) : (
              <>
                <Trophy size={18} />
                SPIN
              </>
            )}
          </button>
        </div>

        <p className="slot-teaser">{teaser}</p>

        <div className="slot-payout-list" aria-label="슬롯 배당표">
          {payoutRows.map((row) => {
            const isHit = result?.symbols.every((symbol) => symbol.id === row.id);
            return (
              <div key={row.id} className={`slot-payout-row ${isHit ? 'is-hit' : ''} is-${row.tone}`}>
                <span className="slot-payout-combo">{row.combo}</span>
                <span>{row.label}</span>
                <strong>{row.multiplier}x</strong>
              </div>
            );
          })}
        </div>

        {result && (
          <div className={`slot-result-card is-${result.tier}`}>
            <span className="slot-result-eyebrow">{result.title}</span>
            <p>{result.message}</p>
            <div className="slot-result-metrics">
              <div>
                <span>지급</span>
                <strong>{formatPoints(result.payout)}</strong>
              </div>
              <div>
                <span>배당</span>
                <strong>{result.multiplier > 0 ? `${result.multiplier}x` : '-'}</strong>
              </div>
              <div>
                <span>순수익</span>
                <strong className={result.net >= 0 ? 'is-profit' : 'is-loss'}>{formatDelta(result.net)}</strong>
              </div>
            </div>
            <button className="slot-reset-button" type="button" onClick={reset}>
              <RotateCcw size={16} /> 결과 닫기
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
