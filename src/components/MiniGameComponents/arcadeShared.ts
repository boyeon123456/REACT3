export type ArcadePhase = 'idle' | 'bet' | 'playing' | 'resolving' | 'result';

export type ArcadeTone = 'neutral' | 'positive' | 'negative';
export type ArcadeRisk = 'low' | 'mid' | 'high';

export type ArcadeSessionSnapshot = {
  phase: ArcadePhase;
  betAmount?: number;
  statusLabel?: string;
  progressLabel?: string;
  recentDelta?: number;
  recentMessage?: string;
  tone?: ArcadeTone;
};

export type ArcadeSessionReporter = (snapshot: ArcadeSessionSnapshot) => void;

type BetValidationOptions = {
  min?: number;
  max?: number;
};

export const RISK_BET_LIMITS: Record<ArcadeRisk, number> = {
  low: 1000,
  mid: 700,
  high: 500,
};

export function formatPoints(value: number) {
  return `${value.toLocaleString()}P`;
}

export function formatDelta(value: number) {
  if (value === 0) return '0P';
  return `${value > 0 ? '+' : ''}${value.toLocaleString()}P`;
}

export function getBetLimit(balance: number, risk: ArcadeRisk, override?: number) {
  return Math.max(0, Math.min(balance, override ?? RISK_BET_LIMITS[risk]));
}

export function getQuickBetValues(balance: number, maxBet = balance) {
  const cap = Math.max(0, Math.min(balance, maxBet));
  const values = [10, 50, 100, 250, 500, Math.floor(cap / 2), cap];
  return [...new Set(values.filter((value) => value > 0 && value <= cap))].sort((a, b) => a - b);
}

export function getRiskLabel(risk: ArcadeRisk) {
  if (risk === 'low') return '낮은 위험';
  if (risk === 'mid') return '중간 위험';
  return '높은 위험';
}

export function getPayoutRangeLabel(min: number, max: number) {
  const minLabel = min > 0 ? `+${formatPoints(min)}` : formatPoints(min);
  const maxLabel = max > 0 ? `+${formatPoints(max)}` : formatPoints(max);
  return `${minLabel} ~ ${maxLabel}`;
}

export function validateBet(rawValue: string, balance: number, options: BetValidationOptions = {}) {
  const min = options.min ?? 1;
  const max = options.max ?? balance;
  const bet = Math.floor(Number(rawValue));

  if (!Number.isFinite(bet) || bet < min) {
    return { ok: false as const, bet: 0, error: `최소 ${min}P 이상 베팅해 주세요.` };
  }

  if (bet > balance) {
    return { ok: false as const, bet, error: '보유 포인트보다 큰 금액은 베팅할 수 없어요.' };
  }

  if (bet > max) {
    return { ok: false as const, bet, error: `이 게임의 최대 베팅은 ${max.toLocaleString()}P예요.` };
  }

  return { ok: true as const, bet, error: '' };
}

export function getPhaseLabel(phase: ArcadePhase) {
  switch (phase) {
    case 'bet':
      return 'BETTING';
    case 'playing':
      return 'PLAYING';
    case 'resolving':
      return 'RESOLVING';
    case 'result':
      return 'RESULT';
    case 'idle':
    default:
      return 'READY';
  }
}
