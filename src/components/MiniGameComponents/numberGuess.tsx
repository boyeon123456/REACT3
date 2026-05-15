import { useState } from 'react';
import { Send } from 'lucide-react';
import { formatPoints } from './arcadeShared';
import { ArcadeButton, ArcadeGameShell, ArcadePanel, ArcadeResetButton, ArcadeResultCard } from './arcadeUi';

interface Props {
  addPoints: (p: number) => void;
}

const MAX_TRIES = 7;

function createTarget() {
  return Math.floor(Math.random() * 100) + 1;
}

export default function NumberGuess({ addPoints }: Props) {
  const [target, setTarget] = useState(createTarget);
  const [guess, setGuess] = useState('');
  const [tries, setTries] = useState(0);
  const [hint, setHint] = useState('1부터 100 사이의 숫자를 추리해 보세요.');
  const [finished, setFinished] = useState(false);
  const [won, setWon] = useState(false);
  const [reward, setReward] = useState(0);

  const remaining = MAX_TRIES - tries;

  const reset = () => {
    setTarget(createTarget());
    setGuess('');
    setTries(0);
    setHint('1부터 100 사이의 숫자를 추리해 보세요.');
    setFinished(false);
    setWon(false);
    setReward(0);
  };

  const submit = () => {
    if (finished) return;

    const value = Number.parseInt(guess, 10);
    if (!Number.isFinite(value) || value < 1 || value > 100) {
      setHint('1부터 100 사이 숫자만 입력할 수 있어요.');
      return;
    }

    const nextTries = tries + 1;
    setTries(nextTries);
    setGuess('');

    if (value === target) {
      const earned = Math.max(620 - (nextTries - 1) * 85, 80);
      addPoints(earned);
      setReward(earned);
      setWon(true);
      setFinished(true);
      setHint(`${nextTries}번 만에 정답을 맞혔어요.`);
      return;
    }

    if (nextTries >= MAX_TRIES) {
      setWon(false);
      setFinished(true);
      setHint(`실패. 정답은 ${target}였습니다.`);
      return;
    }

    setHint(value < target ? `더 큰 숫자입니다. 남은 기회 ${MAX_TRIES - nextTries}번.` : `더 작은 숫자입니다. 남은 기회 ${MAX_TRIES - nextTries}번.`);
  };

  return (
    <ArcadeGameShell
      title="숫자 맞히기"
      subtitle="힌트를 보고 정답을 빠르게 좁히는 추리 게임입니다."
      stats={[
        { label: '시도', value: `${tries}/${MAX_TRIES}` },
        { label: '남은 기회', value: remaining, tone: remaining <= 2 ? 'warning' : 'neutral' },
        { label: '최대 보상', value: formatPoints(620), tone: 'positive' },
      ]}
    >
      <ArcadePanel>
        <p className="arcade-modern-helper">{hint}</p>

        {!finished && (
          <div className="arcade-modern-input-row">
            <input
              type="number"
              className="arcade-modern-input"
              placeholder="숫자 입력"
              value={guess}
              min={1}
              max={100}
              onChange={(event) => setGuess(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Enter') submit();
              }}
            />
            <ArcadeButton onClick={submit} disabled={!guess}>
              <Send size={16} />
              제출
            </ArcadeButton>
          </div>
        )}

        {finished && <ArcadeResetButton onClick={reset} />}
      </ArcadePanel>

      {finished && (
        <ArcadeResultCard
          title={won ? '정답 성공' : '아쉬운 실패'}
          delta={won ? reward : 0}
          message={won ? '빠르게 맞힐수록 보상이 크게 올라갑니다.' : '다음 판에서는 힌트를 더 좁혀서 노려보세요.'}
        />
      )}
    </ArcadeGameShell>
  );
}
