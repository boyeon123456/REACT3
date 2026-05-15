import { useState } from 'react';
import { formatPoints } from './arcadeShared';
import { ArcadeChoiceButton, ArcadeChoiceGrid, ArcadeGameShell, ArcadePanel, ArcadeResetButton, ArcadeResultCard } from './arcadeUi';

interface Props {
  addPoints: (p: number) => void;
}

const QUESTIONS = [
  { q: '대한민국의 수도는?', options: ['부산', '서울', '인천', '대구'], answer: 1 },
  { q: '1 + 1 = ?', options: ['1', '2', '3', '4'], answer: 1 },
  { q: '지구에서 가장 큰 대륙은?', options: ['아프리카', '북아메리카', '아시아', '유럽'], answer: 2 },
  { q: '태양계에서 가장 큰 행성은?', options: ['지구', '화성', '금성', '목성'], answer: 3 },
  { q: '물의 화학식은?', options: ['CO2', 'H2O', 'O2', 'NaCl'], answer: 1 },
];

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

export default function Quiz({ addPoints }: Props) {
  const [questions, setQuestions] = useState(() => shuffle(QUESTIONS).slice(0, 5));
  const [index, setIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [finished, setFinished] = useState(false);
  const [reward, setReward] = useState(0);

  const current = questions[index];

  const choose = (choice: number) => {
    if (selected !== null || finished) return;

    setSelected(choice);
    const correct = choice === current.answer;
    const nextScore = correct ? score + 1 : score;
    if (correct) setScore(nextScore);

    window.setTimeout(() => {
      if (index + 1 >= questions.length) {
        const earned = nextScore * 35 + (nextScore === questions.length ? 100 : 0);
        addPoints(earned);
        setReward(earned);
        setFinished(true);
      } else {
        setIndex((value) => value + 1);
        setSelected(null);
      }
    }, 750);
  };

  const reset = () => {
    setQuestions(shuffle(QUESTIONS).slice(0, 5));
    setIndex(0);
    setScore(0);
    setSelected(null);
    setFinished(false);
    setReward(0);
  };

  return (
    <ArcadeGameShell
      title="스피드 퀴즈"
      subtitle="짧은 문제를 풀고 정답 수만큼 포인트를 획득합니다."
      stats={[
        { label: '문제', value: `${Math.min(index + 1, questions.length)}/${questions.length}` },
        { label: '정답', value: score, tone: score > 0 ? 'positive' : 'neutral' },
        { label: '만점 보상', value: formatPoints(275), tone: 'positive' },
      ]}
    >
      {!finished ? (
        <ArcadePanel>
          <div className="quiz-question">{current.q}</div>
          <ArcadeChoiceGrid columns="two">
            {current.options.map((option, optionIndex) => {
              const isCorrect = selected !== null && optionIndex === current.answer;
              const isWrong = selected === optionIndex && optionIndex !== current.answer;
              return (
                <ArcadeChoiceButton
                  key={option}
                  onClick={() => choose(optionIndex)}
                  disabled={selected !== null}
                  selected={selected === optionIndex}
                  tone={isCorrect ? 'positive' : isWrong ? 'negative' : 'neutral'}
                >
                  <strong>{String.fromCharCode(65 + optionIndex)}. {option}</strong>
                  <span>{isCorrect ? '정답' : isWrong ? '오답' : '선택하기'}</span>
                </ArcadeChoiceButton>
              );
            })}
          </ArcadeChoiceGrid>
        </ArcadePanel>
      ) : (
        <>
          <ArcadeResultCard
            title="퀴즈 완료"
            delta={reward}
            message={`${questions.length}문제 중 ${score}문제를 맞혔습니다.${score === questions.length ? ' 만점 보너스까지 획득했어요.' : ''}`}
          />
          <ArcadeResetButton onClick={reset} />
        </>
      )}
    </ArcadeGameShell>
  );
}
