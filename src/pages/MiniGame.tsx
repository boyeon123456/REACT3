import { useState, useRef } from 'react';
import { Target, Dices, RotateCcw, Trophy, CircleGauge } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { db } from '../firebase';
import { doc, updateDoc, increment, getDoc } from 'firebase/firestore';
import './MiniGame.css';

function ClickGame({ addPoints }: { addPoints: (p: number) => void }) {
  const [clicks, setClicks] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [started, setStarted] = useState(false);
  const [finished, setFinished] = useState(false);
  const timerRef = useRef<number | null>(null);

  const start = () => {
    setClicks(0); setTimeLeft(10); setStarted(true); setFinished(false);
    timerRef.current = window.setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          setFinished(true); setStarted(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const completeGame = () => {
    const earned = Math.floor(clicks / 10);
    if (earned > 0) addPoints(earned);
  };

  if (finished && timeLeft === 10) { }

  const reset = () => { setClicks(0); setTimeLeft(10); setStarted(false); setFinished(false); };

  return (
    <div className="game-play-area">
      <div className="game-play-header">
        <h3>⚡ 광클릭 레이스</h3>
        <span className="game-timer">{timeLeft}초</span>
      </div>
      <div className="click-display">
        <span className="click-count">{clicks}</span>
        <span className="click-label">클릭</span>
      </div>
      {!started && !finished && <button className="game-start-btn" onClick={start}>시작하기</button>}
      {started && <button className="game-click-btn" onClick={() => {
        setClicks(c => c + 1);
        if (timeLeft === 0 && !finished) {
          setFinished(true);
          completeGame();
        }
      }}>클릭!</button>}
      {finished && (
        <div className="game-result">
          <p className="result-text">🎉 결과: <strong>{clicks}회</strong></p>
          <p className="fortune-points">+{Math.floor(clicks / 10)}P 획득!</p>
          <button className="game-retry-btn" onClick={reset}><RotateCcw size={16} /> 다시하기</button>
        </div>
      )}
    </div>
  );
}

function FortuneGame({ addPoints }: { addPoints: (p: number) => void }) {
  const fortunes = [
    { text: '오늘 하루 대박운! 모든 일이 잘 풀립니다 🌟', points: 100, grade: 'S' },
    { text: '좋은 일이 생길 조짐! 기대해도 좋아요 ✨', points: 50, grade: 'A' },
    { text: '평범한 하루가 될 거예요. 꾸준히 가봅시다 😊', points: 30, grade: 'B' },
  ];
  const [result, setResult] = useState<typeof fortunes[0] | null>(null);
  const [spinning, setSpinning] = useState(false);

  const draw = () => {
    setSpinning(true); setResult(null);
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
      {!result && !spinning && <button className="game-start-btn" onClick={draw}>운세 뽑기</button>}
      {spinning && <div className="fortune-spinner"><Dices size={48} className="spin-icon" /></div>}
      {result && (
        <div className="fortune-result">
          <div className={`fortune-grade grade-${result.grade}`}>{result.grade}</div>
          <p className="fortune-text">{result.text}</p>
          <p className="fortune-points">+{result.points}P 획득!</p>
          <button className="game-retry-btn" onClick={() => setResult(null)}><RotateCcw size={16} /> 한번 더</button>
        </div>
      )}
    </div>
  );
}

function RouletteGame({ addPoints }: { addPoints: (p: number) => void }) {
  const segments = [
    { label: '꽝 😢', multiplier: 0 },
    { label: '1배 🙂', multiplier: 1 },
    { label: '2배 😄', multiplier: 2 },
    { label: '3배 🎉', multiplier: 3 },
    { label: '5배 🔥', multiplier: 5 },
    { label: '10배 💎', multiplier: 10 },
  ];
  const [result, setResult] = useState<typeof segments[0] | null>(null);
  const [spinning, setSpinning] = useState(false);
  const BASE_POINTS = 10;

  const spin = () => {
    setSpinning(true); setResult(null);
    setTimeout(() => {
      const picked = segments[Math.floor(Math.random() * segments.length)];
      setResult(picked);
      const earned = BASE_POINTS * picked.multiplier;
      if (earned > 0) addPoints(earned);
      setSpinning(false);
    }, 1500);
  };

  return (
    <div className="game-play-area">
      <div className="game-play-header"><h3>🎡 돌림판</h3></div>
      {!result && !spinning && <button className="game-start-btn" onClick={spin}>돌리기!</button>}
      {spinning && <div className="fortune-spinner"><CircleGauge size={48} className="spin-icon" /></div>}
      {result && (
        <div className="fortune-result">
          <p className="fortune-text">{result.label}</p>
          <p className="fortune-points">
            {result.multiplier === 0 ? '아쉽네요...' : `+${BASE_POINTS * result.multiplier}P 획득!`}
          </p>
          <button className="game-retry-btn" onClick={() => setResult(null)}>
            <RotateCcw size={16} /> 한번 더
          </button>
        </div>
      )}
    </div>
  );
}

const games = [
  { id: 'fortune', title: '오늘의 운세 뽑기', desc: '하루 한 번! 내 운세와 포인트를 확인하세요.', icon: Dices, color: '#FF9F43', points: '+10~100P' },
  { id: 'click', title: '광클릭 레이스', desc: '10초 동안 가장 많이 클릭한 사람이 승리!', icon: Target, color: '#0ABDE3', points: '클릭 수 비례' },
  { id: 'roulette', title: '돌림판', desc: '운을 시험해볼 시간!', icon: CircleGauge, color: '#e30a0aff', points: '1x~10x' },
];

export default function MiniGame() {
  const user = useAuthStore(state => state.user);
  const loginFn = useAuthStore(state => state.login);
  const [activeGame, setActiveGame] = useState<string | null>(null);

  const addPoints = async (amount: number) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, { points: increment(amount) });
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        let newLevel = data.level;
        if (data.points > 1500) newLevel = 5;
        else if (data.points > 800) newLevel = 4;
        else if (data.points > 400) newLevel = 3;
        else if (data.points > 100) newLevel = 2;

        if (newLevel !== data.level) {
          await updateDoc(userRef, { level: newLevel });
        }
        loginFn({ ...user, points: data.points, level: newLevel });
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="minigame-page animate-fade-in">
      <div className="board-header">
        <h1 className="page-title">🎮 미니게임</h1>
        <p className="page-desc">포인트를 모으고 랭킹을 올려보세요!</p>
      </div>

      <div className="points-display">
        <Trophy size={24} className="text-primary" />
        <div className="points-text">
          <span className="points-label">내 포인트</span>
          <span className="points-value">{user ? (user.points || 0).toLocaleString() : 0} P</span>
        </div>
        <div className="level-bar-container">
          <div className="level-info">
            <span>Lv.{user ? user.level || 1 : 1}</span>
            {!user && <span>로그인 필요</span>}
          </div>
        </div>
      </div>

      {activeGame && (
        <div className="active-game-container">
          <button className="close-game" onClick={() => setActiveGame(null)}>← 게임 목록으로</button>
          {!user ? (
            <div style={{ padding: '50px', textAlign: 'center' }}>로그인 후 이용할 수 있습니다.</div>
          ) : (
            <>
              {activeGame === 'click' && <ClickGame addPoints={addPoints} />}
              {activeGame === 'fortune' && <FortuneGame addPoints={addPoints} />}
              {activeGame === 'roulette' && <RouletteGame addPoints={addPoints} />}
            </>
          )}
        </div>
      )}

      {!activeGame && (
        <div className="game-grid">
          {games.map(game => (
            <div key={game.id} className="game-card" onClick={() => setActiveGame(game.id)}>
              <div className="game-icon-wrap" style={{ backgroundColor: `${game.color}20`, color: game.color }}>
                <game.icon size={40} />
              </div>
              <div className="game-content">
                <h3 className="game-title">{game.title}</h3>
                <p className="game-desc">{game.desc}</p>
              </div>
              <div className="game-footer">
                <span className="game-points">{game.points}</span>
                <button className="play-btn">플레이</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}