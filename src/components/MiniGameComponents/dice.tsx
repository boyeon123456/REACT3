import { useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { formatPoints } from './arcadeShared';
import { ArcadeActionBar, ArcadeButton, ArcadeGameShell, ArcadePanel, ArcadeResetButton, ArcadeResultCard } from './arcadeUi';

interface Props {
  addPoints: (p: number) => void;
}

const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];

export default function DiceGame({ addPoints }: Props) {
  const [rolling, setRolling] = useState(false);
  const [dice, setDice] = useState<number[]>([0, 0]);
  const [finished, setFinished] = useState(false);
  const [reward, setReward] = useState(0);
  const timerRef = useRef<number | null>(null);

  const total = dice[0] + dice[1] + 2;

  const roll = () => {
    if (rolling) return;

    setRolling(true);
    setFinished(false);
    setReward(0);

    let tick = 0;
    timerRef.current = window.setInterval(() => {
      const next = [Math.floor(Math.random() * 6), Math.floor(Math.random() * 6)];
      setDice(next);
      tick += 1;

      if (tick >= 14) {
        if (timerRef.current) window.clearInterval(timerRef.current);
        const finalDice = [Math.floor(Math.random() * 6), Math.floor(Math.random() * 6)];
        const finalTotal = finalDice[0] + finalDice[1] + 2;
        const earned = finalTotal >= 11 ? finalTotal * 12 : finalTotal >= 8 ? finalTotal * 8 : finalTotal * 5;

        setDice(finalDice);
        setReward(earned);
        addPoints(earned);
        setRolling(false);
        setFinished(true);
      }
    }, 70);
  };

  const reset = () => {
    if (timerRef.current) window.clearInterval(timerRef.current);
    setDice([0, 0]);
    setReward(0);
    setRolling(false);
    setFinished(false);
  };

  return (
    <ArcadeGameShell
      title="주사위 챌린지"
      subtitle="두 주사위를 굴려 합계가 높을수록 더 큰 보상을 받습니다."
      stats={[
        { label: '현재 합계', value: total },
        { label: '최대 보상', value: formatPoints(144), tone: 'positive' },
        { label: '상태', value: rolling ? '굴리는 중' : finished ? '결과 확인' : '대기' },
      ]}
    >
      <ArcadePanel>
        <div className="modern-dice-stage" aria-label="주사위 결과">
          <span className="modern-die">{DICE_FACES[dice[0]]}</span>
          <span className="modern-die">{DICE_FACES[dice[1]]}</span>
        </div>

        <p className="arcade-modern-helper">11 이상이면 보너스 배율이 붙습니다. 짧게 한 판 돌리기 좋은 보상형 게임이에요.</p>

        <ArcadeActionBar>
          <ArcadeButton onClick={roll} disabled={rolling}>
            <Sparkles size={16} />
            {rolling ? '굴리는 중' : '주사위 굴리기'}
          </ArcadeButton>
          {finished && <ArcadeResetButton onClick={reset} />}
        </ArcadeActionBar>
      </ArcadePanel>

      {finished && <ArcadeResultCard title={`${total}점 달성`} delta={reward} message="높은 합계일수록 보상이 크게 올라갑니다." />}
    </ArcadeGameShell>
  );
}
