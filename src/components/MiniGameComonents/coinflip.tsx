import { useState } from 'react';
import { RotateCcw } from 'lucide-react';

interface Props {
  addPoints: (p: number) => void;
  currentPoints: number;
}

export default function CoinFlip({ addPoints, currentPoints }: Props) {
  const [choice, setChoice] = useState<'heads' | 'tails' | null>(null);
  const [result, setResult] = useState<'heads' | 'tails' | null>(null);
  const [flipping, setFlipping] = useState(false);
  const [betAmount, setBetAmount] = useState('');
  const [betError, setBetError] = useState('');

  const parsedBet = parseInt(betAmount, 10) || 0;

  const flip = () => {
    if (!choice) return;

    const bet = parseInt(betAmount, 10);
    if (!bet || bet <= 0) {
      setBetError('베팅 금액을 입력해 주세요.');
      return;
    }

    if (bet > currentPoints) {
      setBetError('보유 포인트보다 큰 금액은 베팅할 수 없어요.');
      return;
    }

    setBetError('');
    addPoints(-bet);
    setFlipping(true);
    setResult(null);

    window.setTimeout(() => {
      const nextResult: 'heads' | 'tails' = Math.random() > 0.5 ? 'heads' : 'tails';
      setResult(nextResult);

      if (nextResult === choice) {
        addPoints(bet * 2);
      }

      setFlipping(false);
    }, 1200);
  };

  const reset = () => {
    setChoice(null);
    setResult(null);
    setBetAmount('');
    setBetError('');
    setFlipping(false);
  };

  const won = result !== null && result === choice;

  return (
    <div className="game-play-area coinflip-game">
      <div className="game-play-header coinflip-header">
        <h3>동전 던지기</h3>
      </div>
      <p className="coinflip-subtitle">앞면 또는 뒷면을 고르고, 맞히면 베팅한 포인트의 2배를 받습니다.</p>

      {result === null && (
        <div className="coinflip-panel">
          <p className="bet-balance">
            보유 포인트 <strong>{currentPoints}P</strong>
          </p>

          <div className="coin-choices">
            <button
              className={`coin-btn ${choice === 'heads' ? 'selected' : ''}`}
              onClick={() => setChoice('heads')}
            >
              <span className="coin-btn-emoji">🪙</span>
              <span className="coin-btn-title">앞면</span>
              <span className="coin-btn-desc">HEADS</span>
            </button>
            <button
              className={`coin-btn ${choice === 'tails' ? 'selected' : ''}`}
              onClick={() => setChoice('tails')}
            >
              <span className="coin-btn-emoji">🌙</span>
              <span className="coin-btn-title">뒷면</span>
              <span className="coin-btn-desc">TAILS</span>
            </button>
          </div>

          <div className="bet-input-row coinflip-bet-row">
            <input
              type="number"
              className="bet-input"
              placeholder="베팅 금액"
              value={betAmount}
              min={1}
              max={currentPoints}
              onChange={(e) => {
                setBetAmount(e.target.value);
                setBetError('');
              }}
            />
            <span className="bet-unit">P</span>
          </div>

          <div className="bet-quick-btns">
            {[10, 50, 100, 500].map((value) => (
              <button
                key={value}
                className="bet-quick-btn"
                onClick={() => setBetAmount(String(Math.min(value, currentPoints)))}
              >
                {value}P
              </button>
            ))}
            <button className="bet-quick-btn" onClick={() => setBetAmount(String(currentPoints))}>
              MAX
            </button>
          </div>

          {betError && <p className="bet-error">{betError}</p>}

          {flipping ? (
            <div className="coinflip-stage">
              <div className="coinflip-coin coinflip-coin-spinning">🪙</div>
              <p className="coinflip-stage-text">동전을 던지는 중...</p>
            </div>
          ) : (
            <button className="game-start-btn coinflip-start-btn" onClick={flip} disabled={!choice || !parsedBet}>
              동전 던지기
            </button>
          )}
        </div>
      )}

      {result !== null && (
        <div className="fortune-result coinflip-result">
          <div className="coinflip-result-card">
            <div className="coinflip-result-emoji">{result === 'heads' ? '🪙' : '🌙'}</div>
            <p className="fortune-text">{result === 'heads' ? '앞면' : '뒷면'}이 나왔어요.</p>
            <p className={`fortune-points ${won ? 'win' : 'lose'}`}>
              {won ? `성공! +${parsedBet * 2}P 획득` : `아쉽지만 -${parsedBet}P`}
            </p>
          </div>
          <button className="game-retry-btn" onClick={reset}>
            <RotateCcw size={16} /> 다시 하기
          </button>
        </div>
      )}
    </div>
  );
}
