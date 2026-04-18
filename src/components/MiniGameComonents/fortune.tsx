// src/components/games/FortuneGame.tsx
import { useState } from 'react';
import { Dices } from 'lucide-react';
import { RotateCcw } from 'lucide-react';

interface Props {
  addPoints: (p: number) => void;
}

export default function FortuneGame({ addPoints }: Props) {
  const fortunes = [
    { text: '오늘 하루 대박운! 🌟', points: 100, grade: 'S' },
    { text: '좋은 일이 생길 조짐! ✨', points: 50, grade: 'A' },
    { text: '평범한 하루가 될 거예요 😊', points: 30, grade: 'B' },
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
          <p className="fortune-points">+{result.points}P 획득!</p>
          <button className="game-retry-btn" onClick={() => setResult(null)}>
            <RotateCcw size={16} /> 한번 더
          </button>
        </div>
      )}
    </div>
  );
}