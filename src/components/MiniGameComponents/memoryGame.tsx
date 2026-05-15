import { useEffect, useState } from 'react';
import { formatPoints } from './arcadeShared';
import { ArcadeGameShell, ArcadePanel, ArcadeResetButton, ArcadeResultCard } from './arcadeUi';

interface Props {
  addPoints: (p: number) => void;
}

const EMOJIS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
const TOTAL_PAIRS = 8;

type MemoryCard = {
  id: number;
  mark: string;
  flipped: boolean;
  matched: boolean;
};

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function createInitialCards(): MemoryCard[] {
  return shuffle([...EMOJIS, ...EMOJIS]).map((mark, index) => ({
    id: index,
    mark,
    flipped: true,
    matched: false,
  }));
}

export default function MemoryGame({ addPoints }: Props) {
  const [cards, setCards] = useState<MemoryCard[]>(createInitialCards);
  const [selected, setSelected] = useState<number[]>([]);
  const [moves, setMoves] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [finished, setFinished] = useState(false);
  const [showing, setShowing] = useState(true);
  const [reward, setReward] = useState(0);

  const initGame = () => {
    setCards(createInitialCards());
    setSelected([]);
    setMoves(0);
    setMatchedCount(0);
    setFinished(false);
    setShowing(true);
    setReward(0);
  };

  useEffect(() => {
    if (!showing) return undefined;

    const timeout = window.setTimeout(() => {
      setCards((prev) => prev.map((card) => ({ ...card, flipped: false })));
      setShowing(false);
    }, 2200);

    return () => window.clearTimeout(timeout);
  }, [showing]);

  const flip = (index: number) => {
    if (showing || selected.length >= 2 || cards[index].flipped || cards[index].matched || finished) return;

    const nextCards = [...cards];
    nextCards[index] = { ...nextCards[index], flipped: true };
    setCards(nextCards);

    const nextSelected = [...selected, index];
    setSelected(nextSelected);

    if (nextSelected.length !== 2) return;

    setMoves((value) => value + 1);
    const [first, second] = nextSelected;

    if (nextCards[first].mark === nextCards[second].mark) {
      const matched = nextCards.map((card, cardIndex) => (cardIndex === first || cardIndex === second ? { ...card, matched: true } : card));
      const nextMatchedCount = matchedCount + 1;
      setCards(matched);
      setMatchedCount(nextMatchedCount);
      setSelected([]);

      if (nextMatchedCount === TOTAL_PAIRS) {
        const nextMoves = moves + 1;
        const earned = Math.max(360 - nextMoves * 10, 80);
        addPoints(earned);
        setReward(earned);
        setFinished(true);
      }
      return;
    }

    window.setTimeout(() => {
      setCards((prev) => prev.map((card, cardIndex) => ((cardIndex === first || cardIndex === second) && !card.matched ? { ...card, flipped: false } : card)));
      setSelected([]);
    }, 650);
  };

  return (
    <ArcadeGameShell
      title="기억력 매치"
      subtitle="처음 2초 동안 위치를 기억하고 같은 카드를 찾아보세요."
      stats={[
        { label: '시도', value: moves },
        { label: '맞춘 짝', value: `${matchedCount}/${TOTAL_PAIRS}`, tone: matchedCount > 0 ? 'positive' : 'neutral' },
        { label: '최대 보상', value: formatPoints(360), tone: 'positive' },
      ]}
    >
      <ArcadePanel>
        <p className="arcade-modern-helper">{showing ? '카드 위치를 기억하세요.' : '같은 문자를 가진 카드 두 장을 선택하세요.'}</p>
        <div className="modern-card-grid">
          {cards.map((card, index) => (
            <button
              key={card.id}
              type="button"
              className={`modern-memory-card ${card.flipped ? 'is-open' : ''} ${card.matched ? 'is-matched' : ''}`}
              onClick={() => flip(index)}
              disabled={showing || card.flipped || card.matched || finished}
            >
              {card.flipped || card.matched ? card.mark : ''}
            </button>
          ))}
        </div>
      </ArcadePanel>

      {finished && (
        <>
          <ArcadeResultCard title="전체 매치 완료" delta={reward} message={`${moves}번 시도로 모든 짝을 찾았습니다.`} />
          <ArcadeResetButton onClick={initGame} />
        </>
      )}
    </ArcadeGameShell>
  );
}
