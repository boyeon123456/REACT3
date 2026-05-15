import { useState } from 'react';
import { Dices, Sparkles } from 'lucide-react';
import { formatPoints } from './arcadeShared';
import { ArcadeActionBar, ArcadeButton, ArcadeChoiceButton, ArcadeChoiceGrid, ArcadeGameShell, ArcadePanel, ArcadeResetButton, ArcadeResultCard } from './arcadeUi';

interface Props {
  addPoints: (p: number) => void;
}

const FORTUNES = [
  { text: '오늘은 큰 행운이 들어오는 날입니다.', points: 1000, grade: 'SSS', tone: '대박' },
  { text: '예상 못 한 좋은 소식이 찾아올 수 있어요.', points: 950, grade: 'SSS', tone: '대박' },
  { text: '뭘 해도 흐름이 따라주는 운 좋은 날입니다.', points: 900, grade: 'SSS', tone: '대박' },

  { text: '좋은 기회가 생각보다 가까이에 있어요.', points: 800, grade: 'SS', tone: '강운' },
  { text: '오늘은 먼저 움직이는 사람이 이득을 봅니다.', points: 750, grade: 'SS', tone: '강운' },
  { text: '작은 도전이 꽤 큰 보상으로 돌아올 수 있어요.', points: 700, grade: 'SS', tone: '강운' },

  { text: '작은 선택이 괜찮은 결과로 이어집니다.', points: 300, grade: 'S', tone: '상승' },
  { text: '평소보다 감이 좋아지는 하루입니다.', points: 280, grade: 'S', tone: '상승' },
  { text: '기분 좋은 우연이 하루를 바꿔줄 수 있어요.', points: 250, grade: 'S', tone: '상승' },
  { text: '미뤄둔 일을 처리하면 생각보다 잘 풀립니다.', points: 220, grade: 'S', tone: '상승' },

  { text: '차분하게 움직이면 안정적으로 얻어갑니다.', points: 120, grade: 'A', tone: '안정' },
  { text: '크게 튀지는 않아도 손해 없이 지나가는 날입니다.', points: 100, grade: 'A', tone: '안정' },
  { text: '주변 사람의 도움으로 일이 편해질 수 있어요.', points: 90, grade: 'A', tone: '안정' },
  { text: '오늘은 꾸준함이 운보다 강합니다.', points: 80, grade: 'A', tone: '안정' },

  { text: '가볍게 즐기기 좋은 무난한 흐름입니다.', points: 50, grade: 'B', tone: '보통' },
  { text: '특별한 일은 없어도 편안하게 지나갈 하루입니다.', points: 40, grade: 'B', tone: '보통' },
  { text: '큰 기대보다는 소소한 만족을 챙기기 좋아요.', points: 30, grade: 'B', tone: '보통' },
  { text: '오늘은 무리하지 않으면 괜찮은 하루입니다.', points: 20, grade: 'B', tone: '보통' },

  { text: '조금 답답해도 천천히 가면 괜찮습니다.', points: 0, grade: 'C', tone: '잔잔' },
  { text: '결과보다 과정에 집중하면 나쁘지 않은 날입니다.', points: 0, grade: 'C', tone: '잔잔' },
  { text: '오늘은 큰 변화보다 정리가 필요한 하루입니다.', points: -10, grade: 'C', tone: '잔잔' },

  { text: '오늘은 욕심보다 컨디션 관리가 먼저입니다.', points: -30, grade: 'D', tone: '주의' },
  { text: '성급하게 결정하면 손해를 볼 수 있어요.', points: -40, grade: 'D', tone: '주의' },
  { text: '말 한마디를 조심하면 괜한 문제를 피할 수 있습니다.', points: -50, grade: 'D', tone: '주의' },
  { text: '오늘은 쉬어가는 것도 좋은 선택입니다.', points: -60, grade: 'D', tone: '주의' },

  { text: '운이 잠깐 쉬어갑니다. 다음 판을 노려보세요.', points: -100, grade: 'F', tone: '저조' },
  { text: '오늘은 무리한 도전보다 방어가 필요한 날입니다.', points: -120, grade: 'F', tone: '저조' },
  { text: '기대가 크면 실망도 커질 수 있으니 가볍게 가세요.', points: -150, grade: 'F', tone: '저조' },
  { text: '오늘은 운보다 멘탈 관리가 더 중요합니다.', points: -180, grade: 'F', tone: '저조' },

  { text: '이상하게 꼬이는 일이 있어도 금방 지나갑니다.', points: -250, grade: 'FF', tone: '불운' },
  { text: '오늘은 중요한 결정은 잠시 미루는 게 좋아요.', points: -300, grade: 'FF', tone: '불운' },
  { text: '생각보다 일이 느리게 풀릴 수 있습니다.', points: -350, grade: 'FF', tone: '불운' },

  { text: '오늘의 운은 낮지만, 실력으로 버틸 수 있습니다.', points: -500, grade: 'FFF', tone: '위기' },
  { text: '하루가 빡세도 끝까지 가면 배울 건 있습니다.', points: -600, grade: 'FFF', tone: '위기' },
  { text: '오늘은 그냥 조용히 지나가는 게 승리입니다.', points: -700, grade: 'FFF', tone: '위기' }
];

export default function FortuneGame({ addPoints }: Props) {
  const [result, setResult] = useState<(typeof FORTUNES)[number] | null>(null);
  const [drawing, setDrawing] = useState(false);

  const draw = () => {
    if (drawing) return;

    setDrawing(true);
    setResult(null);
    window.setTimeout(() => {
      const picked = FORTUNES[Math.floor(Math.random() * FORTUNES.length)];
      setResult(picked);
      addPoints(picked.points);
      setDrawing(false);
    }, 850);
  };

  return (
    <ArcadeGameShell
      title="오늘의 운세"
      subtitle="하루 한 번처럼 가볍게 뽑는 랜덤 보상 카드입니다."
      stats={[
        { label: '최고 등급', value: 'SSS', tone: 'positive' },
        { label: '최대 보상', value: formatPoints(1000), tone: 'positive' },
        { label: '상태', value: drawing ? '뽑는 중' : result ? '결과 확인' : '대기' },
      ]}
    >
      {!result && (
        <ArcadePanel>
          <ArcadeChoiceGrid>
            {['행운', '집중', '도전'].map((label) => (
              <ArcadeChoiceButton key={label}>
                <strong>{label}</strong>
                <span>오늘의 흐름 확인</span>
              </ArcadeChoiceButton>
            ))}
          </ArcadeChoiceGrid>
          <ArcadeActionBar>
            <ArcadeButton onClick={draw} disabled={drawing}>
              {drawing ? <Dices size={16} className="spin-icon" /> : <Sparkles size={16} />}
              {drawing ? '카드 여는 중' : '운세 뽑기'}
            </ArcadeButton>
          </ArcadeActionBar>
        </ArcadePanel>
      )}

      {result && (
        <>
          <ArcadeResultCard title={`${result.grade} ${result.tone}`} delta={result.points} message={result.text} />
          <ArcadeResetButton onClick={() => setResult(null)} label="한 번 더" />
        </>
      )}
    </ArcadeGameShell>
  );
}
