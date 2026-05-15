import { useEffect, useMemo, useRef, useState } from 'react';
import { RotateCcw, Sparkles, Zap } from 'lucide-react';
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

type Phase = 'bet' | 'playing' | 'resolving' | 'result';

type ClickSummary = {
  clicks: number;
  crits: number;
  highestCombo: number;
  payout: number;
  net: number;
  performance: 'low' | 'mid' | 'high' | 'elite';
};

const ROUND_SECONDS = 12;
const MAX_BET = 500;

function evaluateRun(bet: number, clicks: number, crits: number, highestCombo: number): ClickSummary {
  const accuracyBonus = Math.floor(clicks / 5) * 8;
  const comboBonus = highestCombo * 9;
  const critBonus = crits * 22;
  const finishBonus = clicks >= 90 ? 180 : clicks >= 70 ? 110 : clicks >= 50 ? 60 : 0;
  const baseReturn = Math.floor(bet * 0.45);
  const payout = Math.max(0, Math.min(Math.floor(bet * 2.8), baseReturn + accuracyBonus + comboBonus + critBonus + finishBonus));
  const net = payout - bet;

  let performance: ClickSummary['performance'] = 'low';
  if (net >= Math.floor(bet * 0.7) || clicks >= 90) performance = 'elite';
  else if (net >= Math.floor(bet * 0.25) || clicks >= 65) performance = 'high';
  else if (net >= 0 || clicks >= 40) performance = 'mid';

  return { clicks, crits, highestCombo, payout, net, performance };
}

export default function ClickGame({ addPoints, currentPoints, onSessionChange }: Props) {
  const [betAmount, setBetAmount] = useState('');
  const [betError, setBetError] = useState('');
  const [phase, setPhase] = useState<Phase>('bet');
  const [clicks, setClicks] = useState(0);
  const [crits, setCrits] = useState(0);
  const [combo, setCombo] = useState(0);
  const [highestCombo, setHighestCombo] = useState(0);
  const [timeLeft, setTimeLeft] = useState(ROUND_SECONDS);
  const [summary, setSummary] = useState<ClickSummary | null>(null);
  const [pulse, setPulse] = useState(false);
  const [floatingHit, setFloatingHit] = useState<string | null>(null);
  const timerRef = useRef<number | null>(null);
  const comboResetRef = useRef<number | null>(null);
  const clicksRef = useRef(0);
  const critsRef = useRef(0);
  const comboRef = useRef(0);
  const highestComboRef = useRef(0);

  const parsedBet = Number.parseInt(betAmount, 10) || 0;
  const quickBets = useMemo(() => getQuickBetValues(Math.min(currentPoints, MAX_BET)), [currentPoints]);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      if (comboResetRef.current) window.clearTimeout(comboResetRef.current);
    };
  }, []);

  useEffect(() => {
    onSessionChange?.({
      phase: phase === 'bet' ? 'bet' : phase,
      betAmount: parsedBet || undefined,
      statusLabel:
        phase === 'bet'
          ? '베팅 준비'
          : phase === 'playing'
            ? `${timeLeft}초 남음`
            : phase === 'resolving'
              ? '결과 계산 중'
              : summary
                ? summary.performance === 'elite'
                  ? '엘리트 러시'
                  : summary.performance === 'high'
                    ? '핫핸드'
                    : summary.performance === 'mid'
                      ? '안정적 클리어'
                      : '리듬 회복 필요'
                : '결과 대기',
      progressLabel: phase === 'playing' ? `${clicks} taps / combo x${highestCombo || combo || 1}` : undefined,
      recentDelta: summary?.net,
      recentMessage:
        phase === 'result' && summary
          ? `${summary.clicks}회 입력, 치명타 ${summary.crits}회`
          : '리듬을 유지할수록 보너스가 빠르게 커져요.',
      tone: summary ? (summary.net > 0 ? 'positive' : summary.net < 0 ? 'negative' : 'neutral') : 'neutral',
    });
  }, [clicks, combo, highestCombo, onSessionChange, parsedBet, phase, summary, timeLeft]);

  const resetComboTimer = () => {
    if (comboResetRef.current) window.clearTimeout(comboResetRef.current);
    comboResetRef.current = window.setTimeout(() => {
      setCombo(0);
    }, 700);
  };

  const finishRound = (bet: number, nextClicks: number, nextCrits: number, nextHighestCombo: number) => {
    setPhase('resolving');
    const result = evaluateRun(bet, nextClicks, nextCrits, nextHighestCombo);

    window.setTimeout(() => {
      addPoints(result.payout);
      setSummary(result);
      setPhase('result');
    }, 650);
  };

  const startGame = () => {
    const validation = validateBet(betAmount, currentPoints, { max: MAX_BET });
    if (!validation.ok) {
      setBetError(validation.error);
      return;
    }

    setBetError('');
    setClicks(0);
    setCrits(0);
    setCombo(0);
    setHighestCombo(0);
    setSummary(null);
    setTimeLeft(ROUND_SECONDS);
    setPulse(false);
    setFloatingHit(null);
    addPoints(-validation.bet);
    setPhase('playing');

    timerRef.current = window.setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          if (timerRef.current) window.clearInterval(timerRef.current);
          if (comboResetRef.current) window.clearTimeout(comboResetRef.current);
          const finalClicks = clicksRef.current;
          const finalCrits = critsRef.current;
          const finalHighestCombo = highestComboRef.current;
          finishRound(validation.bet, finalClicks, finalCrits, finalHighestCombo);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  useEffect(() => {
    clicksRef.current = clicks;
  }, [clicks]);

  useEffect(() => {
    critsRef.current = crits;
  }, [crits]);

  useEffect(() => {
    comboRef.current = combo;
  }, [combo]);

  useEffect(() => {
    highestComboRef.current = highestCombo;
  }, [highestCombo]);

  const handleTap = () => {
    if (phase !== 'playing') return;

    const nextClicks = clicksRef.current + 1;
    const nextCombo = comboRef.current + 1;
    const isCrit = Math.random() < Math.min(0.12 + nextCombo * 0.01, 0.38);
    const nextCrits = critsRef.current + (isCrit ? 1 : 0);
    const nextHighestCombo = Math.max(highestComboRef.current, nextCombo);

    setClicks(nextClicks);
    setCombo(nextCombo);
    setHighestCombo(nextHighestCombo);
    setPulse(true);
    setFloatingHit(isCrit ? `CRIT +${14 + nextCombo}` : `+${4 + Math.min(nextCombo, 12)}`);

    if (isCrit) {
      setCrits(nextCrits);
    }

    window.setTimeout(() => setPulse(false), 120);
    window.setTimeout(() => setFloatingHit(null), 240);
    resetComboTimer();
  };

  const reset = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    if (comboResetRef.current) window.clearTimeout(comboResetRef.current);
    setBetAmount('');
    setBetError('');
    setClicks(0);
    setCrits(0);
    setCombo(0);
    setHighestCombo(0);
    setTimeLeft(ROUND_SECONDS);
    setSummary(null);
    setPhase('bet');
  };

  return (
    <div className="game-play-area arcade-game click-game">
      <div className="game-play-header">
        <h3>클릭 러시</h3>
        {phase === 'playing' && <span className="game-timer">{timeLeft}초</span>}
      </div>

      {phase === 'bet' && (
        <div className="game-shell-card arcade-shell">
          <div className="game-pill-row">
            <span className="game-pill">보유 포인트 {formatPoints(currentPoints)}</span>
            <span className="game-pill">최대 베팅 {formatPoints(MAX_BET)}</span>
            <span className="game-pill">손익 -100% ~ +180%</span>
            <span className="game-pill">손맛 중심 실력형</span>
          </div>
          <p className="game-note">
            빠르게 연속 입력할수록 콤보가 붙고, 리듬을 타면 치명타 보너스가 터집니다. 마지막 12초까지 템포를 유지해
            높은 회수율을 노려보세요.
          </p>
          <div className="bet-input-row">
            <input
              type="number"
              className="bet-input"
              placeholder="베팅 금액"
              value={betAmount}
              min={1}
              max={Math.min(currentPoints, MAX_BET)}
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
            러시 시작
          </button>
        </div>
      )}

      {phase === 'playing' && (
        <div className="game-shell-card arcade-shell click-stage-shell">
          <div className="click-scoreboard">
            <div className="click-score-item">
              <span>총 탭</span>
              <strong>{clicks}</strong>
            </div>
            <div className="click-score-item">
              <span>콤보</span>
              <strong>x{Math.max(combo, 1)}</strong>
            </div>
            <div className="click-score-item">
              <span>치명타</span>
              <strong>{crits}</strong>
            </div>
          </div>

          <div className={`click-arena ${pulse ? 'is-pulsing' : ''}`}>
            {floatingHit && <div className="click-floating-hit">{floatingHit}</div>}
            <button className="click-button" onClick={handleTap} aria-label="클릭 러시 버튼">
              <span className="click-button-core">
                <Zap size={34} />
              </span>
              <span className="click-button-label">TAP</span>
            </button>
          </div>

          <div className="click-combo-bar">
            <div className="click-combo-fill" style={{ width: `${Math.min(100, combo * 10)}%` }} />
          </div>
          <p className="game-status-copy">콤보 유지 시간은 짧아요. 쉬지 말고 템포를 이어가세요.</p>
        </div>
      )}

      {phase === 'resolving' && (
        <div className="game-result-card arcade-result-card">
          <div className="result-badge">
            <Sparkles size={16} />
            판정 중
          </div>
          <p className="fortune-text">콤보와 치명타를 집계해서 최종 보상을 계산하고 있어요.</p>
        </div>
      )}

      {phase === 'result' && summary && (
        <div className="game-result-card arcade-result-card">
          <div className="result-badge">
            <Sparkles size={16} />
            {summary.performance === 'elite'
              ? '엘리트 러시'
              : summary.performance === 'high'
                ? '핫핸드'
                : summary.performance === 'mid'
                  ? '안정적인 클리어'
                  : '다시 도전'}
          </div>
          <p className="fortune-text">
            총 {summary.clicks}회 입력, 최고 콤보 x{summary.highestCombo}, 치명타 {summary.crits}회.
          </p>
          <p className={`result-amount ${summary.net >= 0 ? 'is-positive' : 'is-negative'}`}>{formatDelta(summary.net)}</p>
          <p className="result-subcopy">지급 포인트 {formatPoints(summary.payout)} / 베팅 포인트 {formatPoints(parsedBet)}</p>
          <button className="game-retry-btn" onClick={reset}>
            <RotateCcw size={16} /> 다시 하기
          </button>
        </div>
      )}
    </div>
  );
}
