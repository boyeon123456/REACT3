import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Sparkles, TrendingUp } from 'lucide-react';
import { formatPoints } from './arcadeShared';
import { ArcadeActionBar, ArcadeButton, ArcadeChoiceButton, ArcadeChoiceGrid, ArcadeGameShell, ArcadePanel, ArcadeResetButton, ArcadeResultCard } from './arcadeUi';

interface Props {
  addPoints: (p: number) => void;
  currentPoints: number;
}

const COST = 50;

const PRIZES = [
  { grade: 'SSR', label: '전설 카드', prob: 0.03, points: 700, color: '#f59e0b' },
  { grade: 'SR', label: '희귀 카드', prob: 0.1, points: 260, color: '#8b5cf6' },
  { grade: 'R', label: '레어 카드', prob: 0.2, points: 110, color: '#2563eb' },
  { grade: 'N', label: '일반 카드', prob: 0.67, points: 25, color: '#64748b' },
] as const;

type Prize = (typeof PRIZES)[number];

function pickPrize(): Prize {
  const rand = Math.random();
  let cumulative = 0;
  for (const prize of PRIZES) {
    cumulative += prize.prob;
    if (rand < cumulative) return prize;
  }
  return PRIZES[PRIZES.length - 1];
}

export default function Gatcha({ addPoints, currentPoints }: Props) {
  const [phase, setPhase] = useState<'idle' | 'opening' | 'result'>('idle');
  const [results, setResults] = useState<Prize[]>([]);
  const [error, setError] = useState('');
  const [spent, setSpent] = useState(0);

  const totalReward = results.reduce((sum, prize) => sum + prize.points, 0);
  const net = totalReward - spent;

  const pull = (count: 1 | 10) => {
    const cost = COST * count;
    if (phase === 'opening') return;
    if (cost > currentPoints) {
      setError(`포인트가 부족해요. ${formatPoints(cost)}가 필요합니다.`);
      return;
    }

    setError('');
    setSpent(cost);
    setResults([]);
    addPoints(-cost);
    setPhase('opening');

    window.setTimeout(() => {
      const drawn = Array.from({ length: count }, pickPrize);
      const reward = drawn.reduce((sum, prize) => sum + prize.points, 0);
      addPoints(reward);
      setResults(drawn);
      setPhase('result');
    }, 900);
  };

  const reset = () => {
    setPhase('idle');
    setResults([]);
    setError('');
    setSpent(0);
  };

  return (
    <ArcadeGameShell
      title="카드 뽑기"
      subtitle="카드를 열어 등급별 포인트를 받습니다. 10회 뽑기는 결과를 한 번에 보여줍니다."
      stats={[
        { label: '보유 포인트', value: formatPoints(currentPoints) },
        { label: '1회 비용', value: formatPoints(COST) },
        { label: 'SSR 보상', value: formatPoints(700), tone: 'positive' },
      ]}
    >
      <ArcadePanel>
        <ArcadeChoiceGrid columns="four">
          {PRIZES.map((prize) => (
            <ArcadeChoiceButton key={prize.grade}>
              <strong style={{ color: prize.color }}>{prize.grade}</strong>
              <span>{Math.round(prize.prob * 100)}% / {formatPoints(prize.points)}</span>
            </ArcadeChoiceButton>
          ))}
        </ArcadeChoiceGrid>

        {error && <p className="arcade-modern-error">{error}</p>}

        {phase === 'idle' && (
          <ArcadeActionBar>
            <ArcadeButton onClick={() => pull(1)}>
              <Sparkles size={16} />
              1회 뽑기
            </ArcadeButton>
            <ArcadeButton variant="secondary" onClick={() => pull(10)}>
              <TrendingUp size={16} />
              10회 뽑기
            </ArcadeButton>
          </ArcadeActionBar>
        )}

        {phase === 'opening' && <ArcadeResultCard title="카드 오픈 중" message="결과를 정리하고 있어요." />}

        {phase === 'result' && (
          <div className="modern-gatcha-grid">
            {results.map((prize, index) => (
              <div key={`${prize.grade}-${index}`} className="modern-gatcha-card" style={{ '--card-color': prize.color } as CSSProperties}>
                <strong>{prize.grade}</strong>
                <span>{prize.label}</span>
                <span>+{formatPoints(prize.points)}</span>
              </div>
            ))}
          </div>
        )}
      </ArcadePanel>

      {phase === 'result' && (
        <>
          <ArcadeResultCard title="이번 뽑기 손익" delta={net} message={`사용 ${formatPoints(spent)}, 획득 ${formatPoints(totalReward)}`} />
          <ArcadeResetButton onClick={reset} label="다시 뽑기" />
        </>
      )}
    </ArcadeGameShell>
  );
}
