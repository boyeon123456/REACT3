import { useState, useCallback, useEffect } from 'react';
import { Target, Dices, RotateCcw, Trophy, CircleGauge, LayoutGrid, LocateFixed, Aperture, Grip, Atom, Eye, Box, RectangleEllipsis, Rows3, Grid2x2, ScrollText, Car, Crown, Medal } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { db } from '../firebase';
import { doc, updateDoc, increment, getDoc, collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
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


// --- 메인 미니게임 페이지 ---
const games = [
  { id: 'fortune', title: '오늘의 운세 뽑기', desc: '하루 한 번! 내 운세와 포인트를 확인하세요.', icon: Dices, color: '#FF9F43', points: '+10~100P' },
  { id: 'click', title: '광클릭 레이스', desc: '10초 동안 가장 많이 클릭한 사람이 승리!', icon: Target, color: '#0ABDE3', points: '클릭 수 비례' },
  { id: 'roulette', title: '돌림판', desc: '운을 시험해볼 시간!', icon: CircleGauge, color: '#E30A0A', points: '1x~10x' },
  { id: 'GaltonBoard', title: '갈튼 보드', desc: '떨어지는 순간, 운과 확률이 결정된다!', icon: LayoutGrid, color: '#F39C12', points: '0x~50x' },
  { id: 'coinflip', title: '동전 던지기', desc: '앞면? 뒷면? 50% 확률에 도전하세요!', icon: RotateCcw, color: '#98C1D9', points: '2배' },
  { id: 'dice', title: '주사위 굴리기', desc: '주사위를 굴려 행운을 시험해보세요!', icon: Dices, color: '#2A9D8F', points: '+10~60P' },
  { id: 'numberGuess', title: '숫자 맞추기', desc: '1부터 100까지! 숫자를 맞춰보세요!', icon: LocateFixed, color: '#ff0000ff', points: '+10~500P' },
  { id: 'slotMachine', title: '슬롯머신', desc: '3개의 과일을 맞춰보세요!', icon: Aperture, color: '#FFD700', points: '0x~500x' },
  { id: 'rockPaperScissors', title: '가위바위보', desc: '컴퓨터와 가위바위보를 해서 이겨보세요!', icon: Grip, color: '#00ffe1ff', points: '1x~2x' },
  { id: 'gatcha', title: '가챠', desc: '자신의 뽑기 실력을 보여주세요!', icon: Atom, color: '#13a90eff', points: '랜덤 점수' },
  { id: 'memoryGame', title: '기억력 게임', desc: '한순간에 기억력을 발휘해보세요!', icon: Eye, color: '#0c0fdfff', points: '정답 갯수 비례' },
  { id: 'boxGame', title: '상자뽑기', desc: '상자를 열어 보세요!', icon: Box, color: '#ac702bff', points: '-100, -10, 5x, 10x' },
  { id: 'bakara', title: '종이 컵뽑기', desc: '종이 컵을 고르시오!', icon: RectangleEllipsis, color: '#e2e2e2ff', points: '랜덤 점수' },
  { id: 'ladderGame', title: '사다리타기', desc: '사다리를 타서 행운을 시험해보세요!', icon: Rows3, color: '#ac6527ff', points: '-10~100P' },
  { id: 'mineSweeper', title: '지뢰찾기', desc: '지뢰를 찾아서 행운을 시험해보세요!', icon: Grid2x2, color: '#a9e413ff', points: '+200~1000P' },
  { id: 'quiz', title: '퀴즈', desc: '퀴즈를 풀어보세요!', icon: ScrollText, color: '#b611edff', points: '+10~50P' },
  { id: 'crossTheRoad', title: '길건너 친구들', desc: '길을 건너 친구에게 가보세요!', icon: Car, color: '#ff0000ff', points: '+10~500P' },
];

const RANK_ICONS = [
  <Crown size={18} color="#FFD700" />,
  <Crown size={18} color="#C0C0C0" />,
  <Medal size={18} color="#CD7F32" />,
];

export default function MiniGame() {
  const user = useAuthStore(state => state.user);
  const loginFn = useAuthStore(state => state.login);
  const [activeGame, setActiveGame] = useState<string | null>(null);
  const [viewTab, setViewTab] = useState<'games' | 'leaderboard'>('games');
  const [leaderboard, setLeaderboard] = useState<any[]>([]);

  // 리더보드 실시간 구독
  useEffect(() => {
    const q = query(collection(db, 'users'), orderBy('points', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snap) => {
      setLeaderboard(snap.docs.map((d, i) => ({ rank: i + 1, ...d.data(), id: d.id })));
    });
    return () => unsub();
  }, []);

  const addPoints = useCallback(async (amount: number) => {
    if (!user) return;
    try {
      const userRef = doc(db, 'users', user.id);
      await updateDoc(userRef, {
        points: increment(amount),
        gameCount: increment(1),
      });
      const snap = await getDoc(userRef);

      if (snap.exists()) {
        const data = snap.data();
        let newLevel = 1;
        if (data.points > 1500) newLevel = 5;
        else if (data.points > 800) newLevel = 4;
        else if (data.points > 400) newLevel = 3;
        else if (data.points > 100) newLevel = 2;

        if (newLevel !== data.level) {
          await updateDoc(userRef, { level: newLevel });
        }

        // 배지 자동 획득 체크
        const newBadges = await checkAndAwardBadges(
          user.id,
          data.points,
          data.gameCount || 0,
          0,
          data.badges || []
        );

        if (newBadges.length > 0) {
          // 간단한 토스트 알림 (alert 대신 콘솔 — 나중에 UI toast로 교체 가능)
          console.log('새 배지 획득:', newBadges);
        }

        loginFn({ ...user, points: data.points, level: newLevel, gameCount: data.gameCount || 0, badges: data.badges || [] });
      }
    } catch (err) {
      console.error('포인트 업데이트 실패:', err);
    }
  }, [user, loginFn]);

  return (
    <div className="minigame-page animate-fade-in">
      <div className="board-header">
        <h1 className="page-title">미니게임</h1>
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

      {/* 탭 (게임 목록 / 리더보드) */}
      {!activeGame && (
        <div className="minigame-tabs">
          <button
            className={`mg-tab ${viewTab === 'games' ? 'active' : ''}`}
            onClick={() => setViewTab('games')}
          >
            🎮 게임 목록
          </button>
          <button
            className={`mg-tab ${viewTab === 'leaderboard' ? 'active' : ''}`}
            onClick={() => setViewTab('leaderboard')}
          >
            🏆 리더보드
          </button>
        </div>
      )}

      {activeGame && (
        <div className="active-game-container">
          <button className="close-game" onClick={() => setActiveGame(null)}>← 게임 목록으로</button>
          {!user ? (
            <div className="login-alert">로그인 후 이용할 수 있습니다.</div>
          ) : (
            <div className="game-stage">
              {activeGame === 'click' && <ClickGame addPoints={addPoints} currentPoints={user.points || 0} />}
              {activeGame === 'fortune' && <FortuneGame addPoints={addPoints} />}
              {activeGame === 'roulette' && <RouletteGame addPoints={addPoints} />}
              {activeGame === 'GaltonBoard' && <GaltonBoard addPoints={addPoints} currentPoints={user.points || 0} />}
              {activeGame === 'coinflip' && <CoinFlipGame addPoints={addPoints} currentPoints={user?.points || 0} />}
              {activeGame === 'dice' && <DiceGame addPoints={addPoints} />}
              {activeGame === 'numberGuess' && <NumberGuessGame addPoints={addPoints} />}
              {activeGame === 'slotMachine' && <SlotMachineGame addPoints={addPoints} currentPoints={user.points || 0} />}
              {activeGame === 'rockPaperScissors' && <RockPaperScissorsGame addPoints={addPoints} currentPoints={user.points || 0} />}
              {activeGame === 'gatcha' && <GatchaGame addPoints={addPoints} currentPoints={user.points || 0} />}
              {activeGame === 'memoryGame' && <NumberMemoryGame addPoints={addPoints} />}
              {activeGame === 'boxGame' && <BoxGame addPoints={addPoints} currentPoints={user.points || 0} />}
              {activeGame === 'bakara' && <BakaraGame addPoints={addPoints} currentPoints={user.points || 0} />}
              {activeGame === 'ladderGame' && <LadderGame addPoints={addPoints} />}
              {activeGame === 'mineSweeper' && <MineSweeperGame addPoints={addPoints} />}
              {activeGame === 'quiz' && <QuizGame addPoints={addPoints} />}
              {activeGame === 'crossTheRoad' && <CrossTheRoadGame addPoints={addPoints} />}
            </div>
          )}
        </div>
      )}

      {!activeGame && viewTab === 'games' && (
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

      {/* 리더보드 */}
      {!activeGame && viewTab === 'leaderboard' && (
        <div className="leaderboard-container">
          <h2 className="leaderboard-title">🏆 포인트 TOP 10</h2>
          <div className="leaderboard-list">
            {leaderboard.map((u, i) => (
              <div
                key={u.id}
                className={`leaderboard-item ${u.id === user?.id ? 'is-me' : ''} ${i < 3 ? `rank-${i+1}` : ''}`}
              >
                <div className="lb-rank">
                  {i < 3 ? RANK_ICONS[i] : <span className="lb-rank-num">{i + 1}</span>}
                </div>
                <div className="lb-avatar">
                  {u.photoURL ? (
                    <img src={u.photoURL} alt={u.name} />
                  ) : (
                    <div className="lb-initial">{(u.name || '?')[0]}</div>
                  )}
                </div>
                <div className="lb-info">
                  <span className="lb-name">
                    {u.name}
                    {u.id === user?.id && <span className="lb-me-tag">나</span>}
                  </span>
                  <span className="lb-level">Lv.{u.level || 1}</span>
                </div>
                <div className="lb-points">
                  <span>{(u.points || 0).toLocaleString()}</span>
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