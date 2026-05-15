import { useEffect, useMemo, useState } from 'react';
import { RotateCcw, Shield, Sparkles, TriangleAlert } from 'lucide-react';
import {
  formatDelta,
  formatPoints,
  getBetLimit,
  getQuickBetValues,
  getRiskLabel,
  type ArcadeRisk,
  type ArcadeSessionReporter,
  validateBet,
} from './arcadeShared';

interface Props {
  addPoints: (p: number) => void;
  currentPoints: number;
  onSessionChange?: ArcadeSessionReporter;
}

type FlipSide = 'heads' | 'tails';
type RiskMode = 'safe' | 'standard' | 'wild';

const RISK_MODES: Record<
  RiskMode,
  { label: string; risk: ArcadeRisk; chance: number; multiplier: number; description: string; icon: typeof Shield }
> = {
  safe: { label: '세이프', risk: 'low', chance: 0.68, multiplier: 1.4, description: '적중률이 높지만 수익은 낮아요.', icon: Shield },
  standard: { label: '스탠다드', risk: 'mid', chance: 0.5, multiplier: 1.95, description: '정석 50:50 감각으로 승부합니다.', icon: Sparkles },
  wild: { label: '와일드', risk: 'high', chance: 0.34, multiplier: 2.9, description: '한 번에 크게 먹거나 크게 잃는 모드예요.', icon: TriangleAlert },
};

export default function CoinFlip({ addPoints, currentPoints, onSessionChange }: Props) {
  const [choice, setChoice] = useState<FlipSide | null>(null);
  const [riskMode, setRiskMode] = useState<RiskMode>('standard');
  const [result, setResult] = useState<FlipSide | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [phase, setPhase] = useState<'bet' | 'playing' | 'resolving' | 'result'>('bet');
  const [betAmount, setBetAmount] = useState('');
  const [betError, setBetError] = useState('');
  const [recentDelta, setRecentDelta] = useState<number | undefined>(undefined);
  const [recentMessage, setRecentMessage] = useState('리스크 모드와 앞/뒤를 고른 뒤 한 번의 승부를 걸어보세요.');

  const parsedBet = Number.parseInt(betAmount, 10) || 0;
  const mode = RISK_MODES[riskMode];
  const maxBet = getBetLimit(currentPoints, mode.risk);
  const quickBets = useMemo(() => getQuickBetValues(currentPoints, maxBet), [currentPoints, maxBet]);
  const won = result !== null && result === choice;

  useEffect(() => {
    onSessionChange?.({
      phase: phase === 'bet' ? 'bet' : phase,
      betAmount: parsedBet || undefined,
      statusLabel: flipping ? '코인 플립 중' : phase === 'result' ? (won ? '예측 성공' : '예측 실패') : `${mode.label} 모드`,
      progressLabel: choice ? `${choice === 'heads' ? '앞면' : '뒷면'} 선택` : '면 선택 대기',
      recentDelta,
      recentMessage,
      tone: recentDelta === undefined ? 'neutral' : recentDelta > 0 ? 'positive' : 'negative',
    });
  }, [choice, flipping, mode.label, onSessionChange, parsedBet, phase, recentDelta, recentMessage, won]);

  const flip = () => {
    if (!choice) {
      setBetError('먼저 앞면 또는 뒷면을 선택해 주세요.');
      return;
    }

    const validation = validateBet(betAmount, currentPoints, { max: maxBet });
    if (!validation.ok) {
      setBetError(validation.error);
      return;
    }

    setBetError('');
    setFlipping(true);
    setPhase('playing');
    setResult(null);
    setRecentDelta(undefined);
    setRecentMessage(`${mode.label} 모드로 동전을 던지고 있어요.`);
    addPoints(-validation.bet);

    window.setTimeout(() => {
      const isWin = Math.random() < mode.chance;
      const nextResult = isWin ? choice : choice === 'heads' ? 'tails' : 'heads';
      const payout = isWin ? Math.floor(validation.bet * mode.multiplier) : 0;
      const net = payout - validation.bet;

      setPhase('resolving');
      setResult(nextResult);
      setRecentDelta(net);
      setRecentMessage(isWin ? `${mode.label} 모드 적중. ${formatPoints(payout)}를 회수했어요.` : `${mode.label} 모드 실패. 다음 라운드에 다시 노려보세요.`);

      window.setTimeout(() => {
        if (payout > 0) addPoints(payout);
        setFlipping(false);
        setPhase('result');
      }, 420);
    }, 1250);
  };

  const reset = () => {
    setChoice(null);
    setResult(null);
    setBetAmount('');
    setBetError('');
    setFlipping(false);
    setRecentDelta(undefined);
    setRecentMessage('리스크 모드와 앞/뒤를 고른 뒤 한 번의 승부를 걸어보세요.');
    setPhase('bet');
    setRiskMode('standard');
  };

  return (
    <div className="game-play-area coinflip-game arcade-game">
      <div className="game-play-header coinflip-header">
        <h3>코인 플립</h3>
      </div>

      <p className="coinflip-subtitle">확률과 배당을 고르고 한 번에 승부하는 고위험 고보상 게임입니다.</p>

      {phase !== 'result' && (
        <div className="coinflip-panel arcade-shell">
          <div className="game-pill-row">
            <span className="game-pill">보유 {formatPoints(currentPoints)}</span>
            <span className="game-pill">최대 베팅 {formatPoints(maxBet)}</span>
            <span className="game-pill">손익 -100% ~ +{Math.round((mode.multiplier - 1) * 100)}%</span>
            <span className="game-pill">{getRiskLabel(mode.risk)}</span>
          </div>

          <div className="risk-mode-grid">
            {(Object.entries(RISK_MODES) as [RiskMode, (typeof RISK_MODES)[RiskMode]][]).map(([key, value]) => {
              const Icon = value.icon;
              return (
                <button key={key} className={`risk-mode-card ${riskMode === key ? 'selected' : ''}`} onClick={() => setRiskMode(key)} disabled={flipping}>
                  <Icon size={18} />
                  <strong>{value.label}</strong>
                  <span>{Math.round(value.chance * 100)}%</span>
                  <small>{value.multiplier.toFixed(2)}x</small>
                </button>
              );
            })}
          </div>

          <p className="game-status-copy">{mode.description}</p>

          <div className="coin-choices">
            <button className={`coin-btn ${choice === 'heads' ? 'selected' : ''}`} onClick={() => setChoice('heads')} disabled={flipping}>
              <span className="coin-btn-emoji">앞</span>
              <span className="coin-btn-title">앞면</span>
              <span className="coin-btn-desc">HEADS</span>
            </button>
            <button className={`coin-btn ${choice === 'tails' ? 'selected' : ''}`} onClick={() => setChoice('tails')} disabled={flipping}>
              <span className="coin-btn-emoji">뒤</span>
              <span className="coin-btn-title">뒷면</span>
              <span className="coin-btn-desc">TAILS</span>
            </button>
          </div>

          <div className="bet-input-group">
            <label className="bet-input-label">베팅 금액</label>
            <div className="bet-input-row coinflip-bet-row">
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
          </div>

          <div className="bet-quick-btns">
            {quickBets.map((value) => (
              <button key={value} className="bet-quick-btn" onClick={() => setBetAmount(String(value))}>
                {formatPoints(value)}
              </button>
            ))}
          </div>

          {betError && <p className="bet-error">{betError}</p>}

          {flipping ? (
            <div className="coinflip-stage">
              <div className="coinflip-coin coinflip-coin-spinning">{choice === 'heads' ? '앞' : '뒤'}</div>
              <p className="coinflip-stage-text">동전이 회전하고 있어요.</p>
            </div>
          ) : (
            <button className="game-start-btn coinflip-start-btn" onClick={flip} disabled={!choice || !parsedBet}>
              코인 던지기
            </button>
          )}
        </div>
      )}

      {phase === 'result' && result !== null && (
        <div className="fortune-result coinflip-result">
          <div className="coinflip-result-card arcade-result-card">
            <div className="coinflip-result-coin">
              <div className="coinflip-result-emoji">{result === 'heads' ? '앞' : '뒤'}</div>
            </div>
            <div className="result-badge">
              <Sparkles size={16} />
              {result === 'heads' ? '앞면' : '뒷면'} 결과
            </div>
            <p className="fortune-text">{won ? '예측 성공. 선택한 면이 그대로 나왔어요.' : '아쉽게 빗나갔어요. 다음 라운드를 노려보세요.'}</p>
            <p className={`result-amount ${won ? 'is-positive' : 'is-negative'}`}>{formatDelta(recentDelta ?? 0)}</p>
            <p className="result-subcopy">{won ? `${mode.label} 모드 배당 ${mode.multiplier.toFixed(2)}x 적용` : `${mode.label} 모드 적중률 ${Math.round(mode.chance * 100)}%`}</p>
          </div>
          <button className="game-retry-btn" onClick={reset}>
            <RotateCcw size={16} /> 다시 하기
          </button>
        </div>
      )}
    </div>
  );
}
