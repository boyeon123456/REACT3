import { useState, useCallback, useEffect } from 'react';
import {
  Target,
  Dices,
  RotateCcw,
  Trophy,
  CircleGauge,
  LayoutGrid,
  LocateFixed,
  Aperture,
  Grip,
  Atom,
  Eye,
  Box,
  RectangleEllipsis,
  Rows3,
  Grid2x2,
  ScrollText,
  Car,
  Crown,
  Medal,
  Spade,
  Volleyball,
  AudioLines,
  Hammer,
} from 'lucide-react';
import { doc, updateDoc, increment, getDoc, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { useAuthStore } from '../store/authStore';
import { db } from '../firebase';
import { checkAndAwardBadges } from '../hooks/useBadgeCheck';
import './MiniGame.css';
import FortuneGame from '../components/MiniGameComonents/fortune';
import ClickGame from '../components/MiniGameComonents/click';
import RouletteGame from '../components/MiniGameComonents/roulette';
import { GaltonBoard } from '../components/MiniGameComonents/GaltonBoard';
import CoinFlipGame from '../components/MiniGameComonents/coinflip';
import DiceGame from '../components/MiniGameComonents/dice';
import NumberGuessGame from '../components/MiniGameComonents/numberGuess';
import SlotMachineGame from '../components/MiniGameComonents/slotMachine';
import RockPaperScissorsGame from '../components/MiniGameComonents/rockPaperScissors';
import GatchaGame from '../components/MiniGameComonents/gatcha';
import NumberMemoryGame from '../components/MiniGameComonents/memoryGame';
import BoxGame from '../components/MiniGameComonents/boxGame';
import BakaraGame from '../components/MiniGameComonents/bakara';
import LadderGame from '../components/MiniGameComonents/ladderGame';
import MineSweeperGame from '../components/MiniGameComonents/mineSweeper';
import QuizGame from '../components/MiniGameComonents/quiz';
import CrossTheRoadGame from '../components/MiniGameComonents/crossTheRoad';
import BlackjackGame from '../components/MiniGameComonents/BlackJack';

type GameId =
  | 'fortune'
  | 'click'
  | 'roulette'
  | 'GaltonBoard'
  | 'coinflip'
  | 'dice'
  | 'numberGuess'
  | 'slotMachine'
  | 'rockPaperScissors'
  | 'gatcha'
  | 'memoryGame'
  | 'boxGame'
  | 'bakara'
  | 'ladderGame'
  | 'mineSweeper'
  | 'quiz'
  | 'crossTheRoad'
  | 'blackjack'
  | 'timing'
  | 'watermelon'
  | '2048';

type GameMeta = {
  id: GameId;
  title: string;
  desc: string;
  icon: typeof Target;
  color: string;
  points: string;
  status?: 'live' | 'soon';
};

const games: GameMeta[] = [
  { id: 'fortune', title: '오늘의 운세', desc: '가볍게 운세를 뽑고 포인트를 받아보세요.', icon: Dices, color: '#FF9F43', points: '+10~100P' },
  { id: 'click', title: '클릭 레이스', desc: '10초 동안 최대한 빠르게 클릭해서 점수를 올려보세요.', icon: Target, color: '#0ABDE3', points: '클릭 수 비례' },
  { id: 'roulette', title: '돌림판', desc: '화살표가 멈추는 구간의 포인트를 획득합니다.', icon: CircleGauge, color: '#E30A0A', points: '10P~1000P' },
  { id: 'GaltonBoard', title: '갈튼 보드', desc: '공이 떨어진 칸의 배수만큼 포인트를 얻는 확률 게임입니다.', icon: LayoutGrid, color: '#F39C12', points: '0x~100x' },
  { id: 'coinflip', title: '동전 던지기', desc: '앞면과 뒷면을 고르고 2배 보상을 노려보세요.', icon: RotateCcw, color: '#98C1D9', points: '2배' },
  { id: 'dice', title: '주사위', desc: '주사위를 굴려 나온 수만큼 보상을 받습니다.', icon: Dices, color: '#2A9D8F', points: '+10~60P' },
  { id: 'numberGuess', title: '숫자 맞히기', desc: '1부터 100 사이 숫자를 추리해 맞혀보세요.', icon: LocateFixed, color: '#FF4D4F', points: '+10~500P' },
  { id: 'slotMachine', title: '슬롯머신', desc: '릴을 돌려 높은 배당 조합을 노려보세요.', icon: Aperture, color: '#FFD700', points: '0x~1000x' },
  { id: 'rockPaperScissors', title: '가위바위보', desc: '컴퓨터를 상대로 간단하게 한 판 승부를 해보세요.', icon: Grip, color: '#00C2A8', points: '1x~2x' },
  { id: 'gatcha', title: '가챠', desc: '등급별 보상을 뽑는 랜덤 게임입니다.', icon: Atom, color: '#13A90E', points: '확률형' },
  { id: 'memoryGame', title: '기억력 게임', desc: '순서를 외워 정답을 맞히는 미니게임입니다.', icon: Eye, color: '#355CFF', points: '정답 수 비례' },
  { id: 'boxGame', title: '상자 열기', desc: '상자를 열어 숨겨진 보상을 찾아보세요.', icon: Box, color: '#AC702B', points: '-100~10x' },
  { id: 'bakara', title: '바카라', desc: '플레이어와 뱅커 중 승자를 예측하는 카드 게임입니다.', icon: RectangleEllipsis, color: '#A8A8A8', points: '확률형' },
  { id: 'ladderGame', title: '사다리 타기', desc: '사다리 결과에 따라 포인트가 달라집니다.', icon: Rows3, color: '#AC6527', points: '-10~100P' },
  { id: 'mineSweeper', title: '지뢰 찾기', desc: '지뢰를 피하며 안전한 칸을 열어보세요.', icon: Grid2x2, color: '#A9E413', points: '+200~1000P' },
  { id: 'quiz', title: '퀴즈', desc: '간단한 문제를 풀고 포인트를 받아보세요.', icon: ScrollText, color: '#B611ED', points: '+10~50P' },
  { id: 'crossTheRoad', title: '길 건너기', desc: '장애물을 피하며 끝까지 도전해보세요.', icon: Car, color: '#FF0000', points: '+10~500P' },
  { id: 'blackjack', title: '블랙잭', desc: '21에 가깝게 맞춰 승부하는 카드 게임입니다.', icon: Spade, color: '#0C0FDF', points: '0~1000P' },
  { id: 'timing', title: '타이밍', desc: '정확한 순간을 맞히는 반응형 게임입니다.', icon: Target, color: '#1BE4FF', points: '-100~500P', status: 'soon' },
  { id: 'watermelon', title: '수박 게임', desc: '과일을 합쳐 더 큰 과일을 만들어보세요.', icon: Volleyball, color: '#FFA500', points: '0~500P', status: 'soon' },
  { id: '2048', title: '2048', desc: '숫자를 합쳐 2048 타일을 만들어보세요.', icon: AudioLines, color: '#D3F15B', points: '+50~1000P', status: 'soon' },
];

const RANK_ICONS = [
  <Crown key="rank-1" size={18} color="#FFD700" />,
  <Crown key="rank-2" size={18} color="#C0C0C0" />,
  <Medal key="rank-3" size={18} color="#CD7F32" />,
];

function ComingSoonGame({ title }: { title: string }) {
  return (
    <div className="game-play-area game-placeholder">
      <div className="game-play-header game-placeholder-header">
        <h3>{title}</h3>
      </div>
      <div className="game-placeholder-card">
        <Hammer size={40} />
        <strong>준비 중인 게임이에요</strong>
        <p>이 게임은 목록은 정리해두었고, 플레이 화면은 곧 연결할 예정입니다.</p>
      </div>
    </div>
  );
}

export default function MiniGame() {
  const user = useAuthStore((state) => state.user);
  const loginFn = useAuthStore((state) => state.login);
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [viewTab, setViewTab] = useState<'games' | 'leaderboard'>('games');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  const activeGameMeta = games.find((game) => game.id === activeGame) || null;

  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('points', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snap) => {
      setLeaderboard(snap.docs.map((d, i) => ({ rank: i + 1, ...d.data(), id: d.id })));
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!activeGame) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeGame]);

  const addPoints = useCallback(async (amount: number) => {
    if (!user) return;

    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        points: increment(amount),
        gameCount: increment(1),
      });

      const snap = await getDoc(userRef);
      if (!snap.exists()) return;

      const data = snap.data();
      let newLevel = 1;

      if (data.points > 1500) newLevel = 5;
      else if (data.points > 800) newLevel = 4;
      else if (data.points > 400) newLevel = 3;
      else if (data.points > 100) newLevel = 2;

      if (newLevel !== data.level) {
        await updateDoc(userRef, { level: newLevel });
      }

      const newBadges = await checkAndAwardBadges(
        user.id,
        data.points,
        data.gameCount || 0,
        0,
        data.badges || []
      );

      if (newBadges.length > 0) {
        console.log('새 배지 획득:', newBadges);
      }

      loginFn({
        ...user,
        points: data.points,
        level: newLevel,
        gameCount: data.gameCount || 0,
        badges: data.badges || [],
      });
    } catch (err) {
      console.error('포인트 업데이트 실패:', err);
    }
  }, [user, loginFn]);

  const renderActiveGame = () => {
    if (!activeGame || !user) return null;

    switch (activeGame) {
      case 'click':
        return <ClickGame addPoints={addPoints} currentPoints={user.points || 0} />;
      case 'fortune':
        return <FortuneGame addPoints={addPoints} />;
      case 'roulette':
        return <RouletteGame addPoints={addPoints} />;
      case 'GaltonBoard':
        return <GaltonBoard addPoints={addPoints} currentPoints={user.points || 0} />;
      case 'coinflip':
        return <CoinFlipGame addPoints={addPoints} currentPoints={user.points || 0} />;
      case 'dice':
        return <DiceGame addPoints={addPoints} />;
      case 'numberGuess':
        return <NumberGuessGame addPoints={addPoints} />;
      case 'slotMachine':
        return <SlotMachineGame addPoints={addPoints} currentPoints={user.points || 0} />;
      case 'rockPaperScissors':
        return <RockPaperScissorsGame addPoints={addPoints} currentPoints={user.points || 0} />;
      case 'gatcha':
        return <GatchaGame addPoints={addPoints} currentPoints={user.points || 0} />;
      case 'memoryGame':
        return <NumberMemoryGame addPoints={addPoints} />;
      case 'boxGame':
        return <BoxGame addPoints={addPoints} currentPoints={user.points || 0} />;
      case 'bakara':
        return <BakaraGame addPoints={addPoints} currentPoints={user.points || 0} />;
      case 'ladderGame':
        return <LadderGame addPoints={addPoints} />;
      case 'mineSweeper':
        return <MineSweeperGame addPoints={addPoints} />;
      case 'quiz':
        return <QuizGame addPoints={addPoints} />;
      case 'crossTheRoad':
        return <CrossTheRoadGame addPoints={addPoints} />;
      case 'blackjack':
        return <BlackjackGame addPoints={addPoints} currentPoints={user.points || 0} />;
      case 'timing':
      case 'watermelon':
      case '2048':
        return <ComingSoonGame title={activeGameMeta?.title || '준비 중'} />;
      default:
        return <ComingSoonGame title="준비 중" />;
    }
  };

  return (
    <div className={`minigame-page animate-fade-in ${activeGame ? 'is-playing' : ''}`}>
      {!activeGame && (
        <>
          <div className="board-header">
            <h1 className="page-title">미니게임</h1>
            <p className="page-desc">포인트를 모으고 다양한 게임을 즐겨보세요.</p>
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

          <div className="minigame-tabs">
            <button className={`mg-tab ${viewTab === 'games' ? 'active' : ''}`} onClick={() => setViewTab('games')}>
              게임 목록
            </button>
            <button className={`mg-tab ${viewTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setViewTab('leaderboard')}>
              리더보드
            </button>
          </div>
        </>
      )}

      {activeGame && (
        <div className="active-game-container">
          <div className="active-game-toolbar">
            <div className="active-game-meta">
              <span className="active-game-kicker">PLAY MODE</span>
              <strong>{activeGameMeta?.title || '게임'}</strong>
            </div>
            <button className="close-game" onClick={() => setActiveGame(null)}>
              목록으로 나가기
            </button>
          </div>

          {!user ? (
            <div className="login-alert">로그인 후 게임을 이용할 수 있습니다.</div>
          ) : (
            <div className="game-stage">{renderActiveGame()}</div>
          )}
        </div>
      )}

      {!activeGame && viewTab === 'games' && (
        <div className="game-grid">
          {games.map((game) => (
            <div
              key={game.id}
              className={`game-card ${game.status === 'soon' ? 'is-soon' : ''}`}
              onClick={() => setActiveGame(game.id)}
            >
              <div className="game-icon-wrap" style={{ backgroundColor: `${game.color}20`, color: game.color }}>
                <game.icon size={40} />
              </div>
              <div className="game-content">
                <div className="game-title-row">
                  <h3 className="game-title">{game.title}</h3>
                  {game.status === 'soon' && <span className="game-soon-badge">준비 중</span>}
                </div>
                <p className="game-desc">{game.desc}</p>
              </div>
              <div className="game-footer">
                <span className="game-points">{game.points}</span>
                <button className="play-btn">{game.status === 'soon' ? '상세 보기' : '플레이'}</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!activeGame && viewTab === 'leaderboard' && (
        <div className="leaderboard-container">
          <h2 className="leaderboard-title">포인트 TOP 10</h2>
          <div className="leaderboard-list">
            {leaderboard.map((entry, index) => (
              <div
                key={entry.id}
                className={`leaderboard-item ${entry.id === user?.id ? 'is-me' : ''} ${index < 3 ? `rank-${index + 1}` : ''}`}
              >
                <div className="lb-rank">
                  {index < 3 ? RANK_ICONS[index] : <span className="lb-rank-num">{index + 1}</span>}
                </div>
                <div className="lb-avatar">
                  {entry.photoURL ? (
                    <img src={entry.photoURL} alt={entry.name} />
                  ) : (
                    <div className="lb-initial">{(entry.name || '?')[0]}</div>
                  )}
                </div>
                <div className="lb-info">
                  <span className="lb-name">
                    {entry.name}
                    {entry.id === user?.id && <span className="lb-me-tag">나</span>}
                  </span>
                  <span className="lb-level">Lv.{entry.level || 1}</span>
                </div>
                <div className="lb-points">
                  <span>{(entry.points || 0).toLocaleString()}</span>
                  <small>P</small>
                </div>
              </div>
            ))}
            {leaderboard.length === 0 && (
              <div style={{ padding: '40px', textAlign: 'center', color: 'var(--text-muted)' }}>
                아직 등록된 유저가 없습니다.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
