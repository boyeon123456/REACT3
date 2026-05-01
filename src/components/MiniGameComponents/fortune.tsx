// src/components/games/FortuneGame.tsx
import { useState } from 'react';
import { Dices } from 'lucide-react';
import { RotateCcw } from 'lucide-react';

interface Props {
  addPoints: (p: number) => void;
}

export default function FortuneGame({ addPoints }: Props) {
  const fortunes = [
    { text: '신이 내린 운! 🌟🌟🌟', points: 10000, grade: 'SSS' },
    { text: '오늘 하루 대박운! 🌟', points: 100, grade: 'S' },
    { text: '대박! 로또 1등 당첨운! 🌟', points: 500, grade: 'SS' },
    { text: '로또 2등 당첨! 🌟', points: 250, grade: 'S' },
    { text: '좋은 일이 생길 조짐! ✨', points: 50, grade: 'A' },
    { text: '행운이 따를거에요! ✨', points: 50, grade: 'A' },
    { text: '금전운이 상승할거에요! ✨', points: 50, grade: 'A' },
    { text: '사랑이 싹틀거에요! ✨', points: 50, grade: 'A' },
    { text: '기대되는 하루!✨', points: 50, grade: 'A' },
    { text: '작은 행운이 따를거에요✨', points: 50, grade: 'A' },
    { text: '오늘은 왠지 잘 될거같은 날! ✨', points: 50, grade: 'A' },
    { text: '좋은 친구를 사귈거에요✨', points: 50, grade: 'A' },
    { text: '새로운 인연이 생길거에요✨', points: 50, grade: 'A' },
    { text: '길을 가다가 돈을 주울거에요✨', points: 50, grade: 'A' },
    { text: '재미있는 일이 일어날거에요✨', points: 50, grade: 'A' },
    { text: '시험에 합격할거에요✨', points: 50, grade: 'A' },
    { text: '운동회에서 1등할거에요✨', points: 50, grade: 'A' },
    { text: '짝사랑이 이루어질거에요✨', points: 50, grade: 'A' },
    { text: '오랜만에 친구를 만날거에요✨', points: 50, grade: 'A' },
    { text: '뜻밖에 선물을 받을거에요✨', points: 50, grade: 'A' },
    { text: '공부하면 성적이 오를거에요✨', points: 50, grade: 'A' },
    { text: '용돈을 두둑히 받을거에요✨', points: 50, grade: 'A' },
    { text: '운동회에서 2등할거에요✨', points: 50, grade: 'A' },
    { text: '소소한 행복을 느낄거에요✨', points: 50, grade: 'A' },
    { text: '행복한 하루가 될거에요💕', points: 50, grade: 'A' },
    { text: '평범한 하루가 될 거예요 😊', points: 10, grade: 'B' },
    { text: '무난무난한 하루 😊', points: 10, grade: 'B' },
    { text: '그냥 그래요.. 😊', points: 10, grade: 'B' },
    { text: '화이팅!✨', points: 10, grade: 'B' },
    { text: '내일은 더 좋은 일이 있을거에요✨', points: 10, grade: 'B' },
    { text: '사랑해!💕', points: 10, grade: 'B' },
    { text: '오늘은 왠지 안좋은 기운이...🤔', points: -5, grade: 'C' },
    { text: "오늘따라 우울하네요...", points: -30, grade: 'C' },
    { text: "오늘 하루 조심! 🌧️", points: -10, grade: 'D' },
    { text: "내일까지 비 올거래요", points: -100, grade: 'F' }
  ];
  const [result, setResult] = useState<typeof fortunes[0] | null>(null);
  const [spinning, setSpinning] = useState(false);

  const draw = () => {
    setSpinning(true);
    setResult(null);
    setTimeout(() => {
      const res = fortunes[Math.floor(Math.random() * fortunes.length)];
      setResult(res);
      addPoints(res.points);
      setSpinning(false);
    }, 1500);
  };

  return (
    <div className="game-play-area">
      <div className="game-play-header"><h3>🎲 오늘의 운세</h3></div>
      {!result && !spinning && (
        <button className="game-start-btn" onClick={draw}>운세 뽑기</button>
      )}
      {spinning && (
        <div className="fortune-spinner">
          <Dices size={48} className="spin-icon" />
        </div>
      )}
      {result && (
        <div className="fortune-result">
          <div className={`fortune-grade grade-${result.grade}`}>{result.grade}</div>
          <p className="fortune-text">{result.text}</p>
          <p className="fortune-points">{result.points > 0 ? '+' + result.points : result.points}P 획득!</p>
          <button className="game-retry-btn" onClick={() => setResult(null)}>
            <RotateCcw size={16} /> 한번 더
          </button>
        </div>
      )}
    </div>
  );
}