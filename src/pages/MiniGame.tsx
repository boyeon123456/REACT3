import { memo, useState, useCallback, useEffect, lazy, Suspense, useMemo, useRef } from 'react';
import {
  Aperture,
  Atom,
  Box,
  Car,
  CircleGauge,
  Crown,
  Dices,
  Eye,
  Grip,
  Hammer,
  LayoutGrid,
  LocateFixed,
  Medal,
  RectangleEllipsis,
  RotateCcw,
  Rows3,
  ScrollText,
  ShieldAlert,
  Sparkles,
  Spade,
  Target,
  Trophy,
  Volleyball,
  Zap,
  Grid2x2,
} from 'lucide-react';
import { collection, doc, getDoc, increment, limit, onSnapshot, orderBy, query, updateDoc } from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../store/authStore';
import { db } from '../firebase';
import { checkAndAwardBadges } from '../hooks/useBadgeCheck';
import { formatPoints, type ArcadeSessionSnapshot } from '../components/MiniGameComponents/arcadeShared';
import './MiniGame.css';

const FortuneGame = lazy(() => import('../components/MiniGameComponents/fortune'));
const ClickGame = lazy(() => import('../components/MiniGameComponents/click'));
const RouletteGame = lazy(() => import('../components/MiniGameComponents/roulette'));
const GaltonBoard = lazy(() => import('../components/MiniGameComponents/GaltonBoard').then((mod) => ({ default: mod.GaltonBoard })));
const CoinFlipGame = lazy(() => import('../components/MiniGameComponents/coinflip'));
const DiceGame = lazy(() => import('../components/MiniGameComponents/dice'));
const NumberGuessGame = lazy(() => import('../components/MiniGameComponents/numberGuess'));
const SlotMachineGame = lazy(() => import('../components/MiniGameComponents/slotMachine'));
const RockPaperScissorsGame = lazy(() => import('../components/MiniGameComponents/rockPaperScissors'));
const GatchaGame = lazy(() => import('../components/MiniGameComponents/gatcha'));
const NumberMemoryGame = lazy(() => import('../components/MiniGameComponents/memoryGame'));
const BoxGame = lazy(() => import('../components/MiniGameComponents/boxGame'));
const BakaraGame = lazy(() => import('../components/MiniGameComponents/bakara'));
const LadderGame = lazy(() => import('../components/MiniGameComponents/ladderGame'));
const MineSweeperGame = lazy(() => import('../components/MiniGameComponents/mineSweeper'));
const QuizGame = lazy(() => import('../components/MiniGameComponents/quiz'));
const CrossTheRoadGame = lazy(() => import('../components/MiniGameComponents/crossTheRoad'));
const BlackjackGame = lazy(() => import('../components/MiniGameComponents/BlackJack'));

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
  accent: string;
  reward: string;
  difficulty: 'easy' | 'normal' | 'hard';
  pace: 'short' | 'tempo' | 'focus';
  risk: 'low' | 'mid' | 'high';
  category: 'luck' | 'skill' | 'hybrid';
  featured?: string;
  status?: 'live' | 'soon';
};

type LeaderboardEntry = {
  id: string;
  rank: number;
  name?: string;
  points?: number;
  level?: number;
  photoURL?: string | null;
};

type DailyMission = {
  id: string;
  label: string;
  target: number;
  reward: number;
  metric: 'rounds' | 'wins' | 'click' | 'coinflip' | 'crossRoad';
};

type ArcadeRetentionState = {
  dateKey: string;
  streak: number;
  winsInRow: number;
  roundsToday: number;
  winsToday: number;
  byGame: Partial<Record<GameId, number>>;
  claimed: boolean;
};

const ARCADE_STORAGE_KEY = 'mini-arcade-retention-v1';
const DAILY_REWARD = 250;
const DAILY_MISSIONS: DailyMission[] = [
  { id: 'rounds-3', label: '오늘 3판 플레이', target: 3, reward: 60, metric: 'rounds' },
  { id: 'wins-2', label: '순이익 판정 2회', target: 2, reward: 80, metric: 'wins' },
  { id: 'featured-2', label: '대표 리워크 게임 2회', target: 2, reward: 110, metric: 'click' },
];

function getTodayKey() {
  return new Date().toISOString().slice(0, 10);
}

function createDefaultRetentionState(): ArcadeRetentionState {
  return {
    dateKey: getTodayKey(),
    streak: 0,
    winsInRow: 0,
    roundsToday: 0,
    winsToday: 0,
    byGame: {},
    claimed: false,
  };
}

function loadRetentionState(): ArcadeRetentionState {
  if (typeof window === 'undefined') return createDefaultRetentionState();

  try {
    const raw = window.localStorage.getItem(ARCADE_STORAGE_KEY);
    if (!raw) return createDefaultRetentionState();

    const parsed = JSON.parse(raw) as Partial<ArcadeRetentionState>;
    const today = getTodayKey();

    if (parsed.dateKey !== today) {
      return createDefaultRetentionState();
    }

    return {
      dateKey: today,
      streak: parsed.streak ?? 0,
      winsInRow: parsed.winsInRow ?? 0,
      roundsToday: parsed.roundsToday ?? 0,
      winsToday: parsed.winsToday ?? 0,
      byGame: parsed.byGame ?? {},
      claimed: parsed.claimed ?? false,
    };
  } catch {
    return createDefaultRetentionState();
  }
}

function getMissionProgress(state: ArcadeRetentionState, mission: DailyMission) {
  if (mission.metric === 'rounds') return state.roundsToday;
  if (mission.metric === 'wins') return state.winsToday;
  if (mission.metric === 'click') {
    const featuredCount =
      (state.byGame.click || 0) +
      (state.byGame.coinflip || 0) +
      (state.byGame.slotMachine || 0) +
      (state.byGame.crossTheRoad || 0);
    return featuredCount;
  }
  if (mission.metric === 'coinflip') return state.byGame.coinflip || 0;
  if (mission.metric === 'crossRoad') return state.byGame.crossTheRoad || 0;
  return 0;
}

const games: GameMeta[] = [
  { id: 'click', title: '클릭 러시', desc: '짧은 시간 안에 콤보와 치명타를 쌓아 고회수 구간을 노리는 반응형 게임입니다.', icon: Zap, accent: '#00d4ff', reward: '손실 0P ~ 순익 900P', difficulty: 'normal', pace: 'tempo', risk: 'mid', category: 'skill', featured: '대표 리워크' },
  { id: 'slotMachine', title: '슬롯 머신', desc: '릴 정지감과 근접 연출을 강화한 하이리스크 슬롯. 맞는 순간의 배당감이 핵심입니다.', icon: Aperture, accent: '#f7b500', reward: '손실 100% ~ 순익 1100%', difficulty: 'easy', pace: 'short', risk: 'high', category: 'luck', featured: '배당 재설계' },
  { id: 'coinflip', title: '코인 플립', desc: '세이프부터 와일드까지 리스크 모드를 직접 고르는 1회 승부 게임입니다.', icon: RotateCcw, accent: '#70e1b5', reward: '손실 100% ~ 순익 190%', difficulty: 'easy', pace: 'short', risk: 'high', category: 'luck', featured: '리스크 모드' },
  { id: 'crossTheRoad', title: '길 건너기', desc: '스테이지가 올라갈수록 속도가 빨라지는 보드형 실력 게임. 매 스테이지 보상이 커집니다.', icon: Car, accent: '#ff6b57', reward: '최대 610P + 완주 보너스', difficulty: 'hard', pace: 'focus', risk: 'mid', category: 'skill', featured: '스테이지 업' },
  { id: 'roulette', title: '룰렛', desc: '한 번의 스핀으로 가볍게 포인트를 노리는 아케이드 룰렛입니다.', icon: CircleGauge, accent: '#ff6b81', reward: '10P ~ 1,000P', difficulty: 'easy', pace: 'short', risk: 'mid', category: 'luck' },
  { id: 'GaltonBoard', title: '갈톤 보드', desc: '낙하 경로를 바라보는 긴장감이 살아 있는 고배당형 운 게임입니다.', icon: LayoutGrid, accent: '#f6b93b', reward: '손실 100% ~ 순익 9900%', difficulty: 'normal', pace: 'focus', risk: 'high', category: 'luck' },
  { id: 'fortune', title: '오늘의 운세', desc: '밝은 카드형 화면에서 하루 운세와 랜덤 보상을 짧게 확인하는 게임입니다.', icon: Dices, accent: '#ff9f43', reward: '-100P ~ +10,000P', difficulty: 'easy', pace: 'short', risk: 'low', category: 'luck' },
  { id: 'dice', title: '주사위 챌린지', desc: '합계가 높을수록 보너스 배율이 붙는 깔끔한 즉시 보상형 게임입니다.', icon: Dices, accent: '#2ecc71', reward: '+10P ~ +144P', difficulty: 'easy', pace: 'short', risk: 'low', category: 'luck' },
  { id: 'numberGuess', title: '숫자 맞히기', desc: '힌트를 보고 정답을 빠르게 좁힐수록 보상이 커지는 추리 게임입니다.', icon: LocateFixed, accent: '#ff6b6b', reward: '+80P ~ +620P', difficulty: 'normal', pace: 'focus', risk: 'low', category: 'skill' },
  { id: 'rockPaperScissors', title: '가위바위보', desc: '간단한 베팅 구조로 빠르게 연속 플레이하기 좋은 즉시형 게임입니다.', icon: Grip, accent: '#1dd1a1', reward: '손실 100% ~ 순익 100%', difficulty: 'easy', pace: 'short', risk: 'mid', category: 'luck' },
  { id: 'gatcha', title: '카드 뽑기', desc: '1회와 10회 뽑기 결과를 카드 그리드로 확인하는 수집형 보상 게임입니다.', icon: Atom, accent: '#2ed573', reward: '등급별 손익 변동', difficulty: 'easy', pace: 'tempo', risk: 'mid', category: 'hybrid' },
  { id: 'memoryGame', title: '기억력 매치', desc: '2초 동안 위치를 기억하고 같은 카드를 찾아 보상을 받는 집중형 게임입니다.', icon: Eye, accent: '#5352ed', reward: '+80P ~ +360P', difficulty: 'normal', pace: 'focus', risk: 'low', category: 'skill' },
  { id: 'boxGame', title: '상자 열기', desc: '하나의 선택에 따라 큰 차이가 나는 고변동 보물상자 게임입니다.', icon: Box, accent: '#c46a2d', reward: '손실 100% ~ 순익 4900%', difficulty: 'easy', pace: 'short', risk: 'high', category: 'luck' },
  { id: 'bakara', title: '컵 고르기', desc: '짧은 선택 뒤 바로 보상이 열리는 운형 컵 픽 게임입니다.', icon: RectangleEllipsis, accent: '#a4b0be', reward: '-150P ~ +300P', difficulty: 'easy', pace: 'short', risk: 'mid', category: 'luck' },
  { id: 'ladderGame', title: '사다리 타기', desc: '새로고침 없이 매 판 새 사다리와 보상이 섞이는 운형 게임입니다.', icon: Rows3, accent: '#ff9f1a', reward: '-50P ~ +420P', difficulty: 'easy', pace: 'tempo', risk: 'mid', category: 'luck' },
  { id: 'mineSweeper', title: '지뢰찾기', desc: '난이도 선택과 퍼즐 풀이 실력으로 점수를 끌어올리는 전통형 게임입니다.', icon: Grid2x2, accent: '#badc58', reward: '+100P ~ +1,000P', difficulty: 'hard', pace: 'focus', risk: 'low', category: 'skill' },
  { id: 'quiz', title: '스피드 퀴즈', desc: '짧은 문제를 빠르게 풀고 만점 보너스를 노리는 지식형 게임입니다.', icon: ScrollText, accent: '#a55eea', reward: '+0P ~ +275P', difficulty: 'normal', pace: 'short', risk: 'low', category: 'skill' },
  { id: 'blackjack', title: '블랙잭', desc: '과한 카지노 느낌을 덜고 카드 판단과 베팅 흐름에 집중한 테이블 게임입니다.', icon: Spade, accent: '#3742fa', reward: '손실 100% ~ 블랙잭 2.5x', difficulty: 'hard', pace: 'focus', risk: 'high', category: 'hybrid' },
  { id: 'timing', title: '타이밍 챌린지', desc: '정확한 타이밍 입력을 중심으로 한 반응형 게임이 곧 열립니다.', icon: Target, accent: '#1be4ff', reward: '예정', difficulty: 'normal', pace: 'tempo', risk: 'mid', category: 'skill', status: 'soon' },
  { id: 'watermelon', title: '수박 게임', desc: '과일을 합쳐 점수를 쌓는 퍼즐형 모드가 준비 중입니다.', icon: Volleyball, accent: '#ffa502', reward: '예정', difficulty: 'normal', pace: 'focus', risk: 'mid', category: 'skill', status: 'soon' },
  { id: '2048', title: '2048', desc: '타일 합치기로 고득점을 노리는 정통 퍼즐 모드가 준비 중입니다.', icon: Grid2x2, accent: '#d3f15b', reward: '예정', difficulty: 'normal', pace: 'focus', risk: 'low', category: 'skill', status: 'soon' },
];

const RANK_ICONS = [
  <Crown key="rank-1" size={18} color="#ffd700" />,
  <Crown key="rank-2" size={18} color="#c0c0c0" />,
  <Medal key="rank-3" size={18} color="#cd7f32" />,
];

function ComingSoonGame({ title }: { title: string }) {
  return (
    <div className="game-play-area game-placeholder">
      <div className="game-placeholder-card arcade-result-card">
        <Hammer size={42} />
        <strong>{title} 준비 중</strong>
        <p>플레이 구현은 아직 열리지 않았지만, 로비 정보와 테마 방향은 먼저 정리해 두었어요.</p>
      </div>
    </div>
  );
}

function getLevelProgress(points: number) {
  if (points > 1500) return 100;
  if (points > 800) return 85;
  if (points > 400) return 65;
  if (points > 100) return 40;
  return Math.min(25 + Math.floor(points / 4), 30);
}

function getToneLabel(meta: GameMeta) {
  return meta.category === 'skill' ? '실력형' : meta.category === 'hybrid' ? '복합형' : '운형';
}

const GameCard = memo(function GameCard({ game, onOpen }: { game: GameMeta; onOpen: (gameId: GameId) => void }) {
  const Icon = game.icon;

  return (
    <button
      className={`game-card arcade-card ${game.status === 'soon' ? 'is-soon' : ''}`}
      onClick={() => onOpen(game.id)}
      type="button"
    >
      <div className="game-card-top">
        <div className="game-icon-wrap" style={{ backgroundColor: `${game.accent}22`, color: game.accent }}>
          <Icon size={40} />
        </div>
        <div className="game-card-tags">
          {game.featured && <span className="game-tag">{game.featured}</span>}
          {game.status === 'soon' && <span className="game-soon-badge">COMING SOON</span>}
        </div>
      </div>

      <div className="game-content">
        <div className="game-title-row">
          <h3 className="game-title">{game.title}</h3>
        </div>
        <p className="game-desc">{game.desc}</p>
        <div className="arcade-meta-grid">
          <span className="arcade-meta-pill">{getToneLabel(game)}</span>
          <span className="arcade-meta-pill">난이도 {game.difficulty}</span>
          <span className="arcade-meta-pill">템포 {game.pace}</span>
          <span className="arcade-meta-pill">리스크 {game.risk}</span>
        </div>
      </div>

      <div className="game-footer">
        <span className="game-points">{game.reward}</span>
        <span className="play-btn">{game.status === 'soon' ? '정보 보기' : 'PLAY'}</span>
      </div>
    </button>
  );
});

export default function MiniGame() {
  const user = useAuthStore((state) => state.user);
  const loginFn = useAuthStore((state) => state.login);
  const [activeGame, setActiveGame] = useState<GameId | null>(null);
  const [viewTab, setViewTab] = useState<'games' | 'leaderboard'>('games');
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [retentionState, setRetentionState] = useState<ArcadeRetentionState>(() => loadRetentionState());
  const [sessionSnapshot, setSessionSnapshot] = useState<ArcadeSessionSnapshot>({
    phase: 'idle',
    statusLabel: '게임을 선택해 주세요.',
    recentMessage: '리듬감 있는 아케이드 로비로 다시 정비했어요.',
    tone: 'neutral',
  });
  const previousPhaseRef = useRef<ArcadeSessionSnapshot['phase']>('idle');

  const activeGameMeta = useMemo(() => games.find((game) => game.id === activeGame) || null, [activeGame]);
  const missionProgress = useMemo(
    () =>
      DAILY_MISSIONS.map((mission) => ({
        ...mission,
        progress: getMissionProgress(retentionState, mission),
      })),
    [retentionState]
  );
  const completedMissionCount = useMemo(
    () => missionProgress.filter((mission) => mission.progress >= mission.target).length,
    [missionProgress]
  );
  const getProfilePath = useCallback((userId: string) => (userId === user?.id ? '/mypage' : `/profile/${userId}`), [user?.id]);

  useEffect(() => {
    if (viewTab !== 'leaderboard') return undefined;

    const q = query(collection(db, 'users'), orderBy('points', 'desc'), limit(10));
    const unsub = onSnapshot(q, (snap) => {
      setLeaderboard(snap.docs.map((d, index) => ({ rank: index + 1, ...d.data(), id: d.id })));
    });
    return () => unsub();
  }, [viewTab]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    window.localStorage.setItem(ARCADE_STORAGE_KEY, JSON.stringify(retentionState));
  }, [retentionState]);

  useEffect(() => {
    const previousPhase = previousPhaseRef.current;
    const isNewResult = previousPhase !== 'result' && sessionSnapshot.phase === 'result' && activeGame;

    if (isNewResult) {
      const didWin = (sessionSnapshot.recentDelta ?? 0) > 0;

      window.setTimeout(() => {
        setRetentionState((prev) => ({
          ...prev,
          streak: prev.streak + 1,
          winsInRow: didWin ? prev.winsInRow + 1 : 0,
          roundsToday: prev.roundsToday + 1,
          winsToday: didWin ? prev.winsToday + 1 : prev.winsToday,
          byGame: {
            ...prev.byGame,
            [activeGame]: (prev.byGame[activeGame] || 0) + 1,
          },
        }));
      }, 0);
    }

    previousPhaseRef.current = sessionSnapshot.phase;
  }, [activeGame, sessionSnapshot.phase, sessionSnapshot.recentDelta]);

  useEffect(() => {
    if (!activeGame) return undefined;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [activeGame]);

  const applyPointChange = useCallback(
    async (amount: number, options?: { countGame?: boolean }) => {
      if (!user) return;

      const countGame = options?.countGame ?? true;

      try {
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, {
          points: increment(amount),
          ...(countGame ? { gameCount: increment(1) } : {}),
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

        if (countGame) {
          const newBadges = await checkAndAwardBadges(user.id, data.points, data.gameCount || 0, 0, data.badges || []);

          void newBadges;
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
    },
    [user, loginFn]
  );

  const addPoints = useCallback(
    async (amount: number) => {
      await applyPointChange(amount, { countGame: true });
    },
    [applyPointChange]
  );

  const claimDailyReward = useCallback(async () => {
    if (retentionState.claimed || completedMissionCount < DAILY_MISSIONS.length) return;

    await applyPointChange(DAILY_REWARD, { countGame: false });
    setRetentionState((prev) => ({ ...prev, claimed: true }));
  }, [applyPointChange, completedMissionCount, retentionState.claimed]);

  const openGame = useCallback((gameId: GameId) => {
    setSessionSnapshot({
      phase: 'idle',
      statusLabel: '게임 준비 중',
      recentMessage: '오버레이 HUD가 현재 상태를 계속 추적합니다.',
      tone: 'neutral',
    });
    setActiveGame(gameId);
  }, []);

  const closeGame = useCallback(() => {
    setActiveGame(null);
    setSessionSnapshot({
      phase: 'idle',
      statusLabel: '게임을 선택해 주세요.',
      recentMessage: '새로운 모드를 골라 바로 이어서 플레이할 수 있어요.',
      tone: 'neutral',
    });
  }, []);

  const renderActiveGame = () => {
    if (!activeGame || !user) return null;

    switch (activeGame) {
      case 'click':
        return <ClickGame addPoints={addPoints} currentPoints={user.points || 0} onSessionChange={setSessionSnapshot} />;
      case 'fortune':
        return <FortuneGame addPoints={addPoints} />;
      case 'roulette':
        return <RouletteGame addPoints={addPoints} />;
      case 'GaltonBoard':
        return <GaltonBoard addPoints={addPoints} currentPoints={user.points || 0} />;
      case 'coinflip':
        return <CoinFlipGame addPoints={addPoints} currentPoints={user.points || 0} onSessionChange={setSessionSnapshot} />;
      case 'dice':
        return <DiceGame addPoints={addPoints} />;
      case 'numberGuess':
        return <NumberGuessGame addPoints={addPoints} />;
      case 'slotMachine':
        return <SlotMachineGame addPoints={addPoints} currentPoints={user.points || 0} onSessionChange={setSessionSnapshot} />;
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
        return <CrossTheRoadGame addPoints={addPoints} onSessionChange={setSessionSnapshot} />;
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
          <section className="minigame-hero arcade-hero">
            <div className="minigame-hero-copy">
              <span className="hero-chip">Neon Mini Arcade</span>
              <h1 className="page-title">미니게임 아케이드</h1>
              <p className="page-desc">
                반응형 손맛, 빠른 세션, 강한 보상 피드백에 맞춰 로비와 대표 게임들을 다시 다듬었어요. 오늘은 어떤 템포로
                달려볼까요?
              </p>
              <div className="minigame-highlight-row">
                <span className="minigame-highlight">
                  <Sparkles size={14} />
                  대표 리워크 4종 적용
                </span>
                <span className="minigame-highlight">
                  <ShieldAlert size={14} />
                  공통 리스크 메타 공개
                </span>
                <span className="minigame-highlight">
                  <Trophy size={14} />
                  세션 HUD 실시간 반영
                </span>
              </div>
            </div>

            <div className="points-display arcade-points-display">
              <div className="points-badge">
                <Trophy size={24} className="text-primary" />
              </div>
              <div className="points-text">
                <span className="points-label">현재 포인트</span>
                <span className="points-value">{user ? formatPoints(user.points || 0) : '0P'}</span>
              </div>
              <div className="level-bar-container">
                <div className="level-info">
                  <span>Lv.{user ? user.level || 1 : 1}</span>
                  <span>{user ? `플레이 ${user.gameCount || 0}회` : '로그인 필요'}</span>
                </div>
                <div className="level-bar">
                  <div className="level-progress" style={{ width: `${getLevelProgress(user?.points || 0)}%` }} />
                </div>
              </div>
              <div className="arcade-points-summary">
                <div>
                  <span>추천</span>
                  <strong>클릭 러시</strong>
                </div>
                <div>
                  <span>고변동</span>
                  <strong>슬롯 머신</strong>
                </div>
              </div>
            </div>
          </section>

          <section className="arcade-retention-strip">
            <div className="arcade-mission-card">
              <div className="arcade-section-head">
                <div>
                  <span className="arcade-eyebrow">TODAY'S LOOP</span>
                  <h2>오늘의 아케이드 미션</h2>
                </div>
                <div className="arcade-streak-chip">
                  <Sparkles size={14} />
                  {retentionState.streak}판 연속 플레이
                </div>
              </div>

              <div className="arcade-mission-list">
                {missionProgress.map((mission) => {
                  const done = mission.progress >= mission.target;
                  const progressRatio = Math.min(100, (mission.progress / mission.target) * 100);
                  return (
                    <div key={mission.id} className={`arcade-mission-item ${done ? 'is-done' : ''}`}>
                      <div className="arcade-mission-copy">
                        <strong>{mission.label}</strong>
                        <span>
                          {Math.min(mission.progress, mission.target)} / {mission.target} · {mission.reward}P
                        </span>
                      </div>
                      <div className="arcade-mission-bar">
                        <div className="arcade-mission-fill" style={{ width: `${progressRatio}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                className="arcade-claim-btn"
                disabled={retentionState.claimed || completedMissionCount < DAILY_MISSIONS.length}
                onClick={claimDailyReward}
              >
                {retentionState.claimed ? `일일 보상 수령 완료 · ${DAILY_REWARD}P` : `모두 완료 시 ${DAILY_REWARD}P 받기`}
              </button>
            </div>

            <div className="arcade-session-card">
              <div className="arcade-section-head">
                <div>
                  <span className="arcade-eyebrow">MOMENTUM</span>
                  <h2>계속 하게 만드는 흐름</h2>
                </div>
              </div>

              <div className="arcade-session-grid">
                <div>
                  <span>오늘 플레이</span>
                  <strong>{retentionState.roundsToday}판</strong>
                </div>
                <div>
                  <span>오늘 순이익</span>
                  <strong>{retentionState.winsToday}회</strong>
                </div>
                <div>
                  <span>연속 승리</span>
                  <strong>{retentionState.winsInRow}회</strong>
                </div>
                <div>
                  <span>다음 추천</span>
                  <strong>{retentionState.winsInRow >= 2 ? '고위험 게임' : '클릭 러시'}</strong>
                </div>
              </div>

              <p className="arcade-session-note">
                {retentionState.winsInRow >= 2
                  ? '지금 흐름이 좋아요. 슬롯 머신이나 코인 플립으로 변동성을 올려도 됩니다.'
                  : retentionState.roundsToday >= 3
                    ? '미션 보상이 가까워졌어요. 대표 리워크 게임을 한 번 더 돌리면 템포가 이어집니다.'
                    : '짧은 1판이 쌓일수록 일일 보상과 연속 플레이 흐름이 같이 올라갑니다.'}
              </p>
            </div>
          </section>

          <div className="minigame-tabs">
            <button className={`mg-tab ${viewTab === 'games' ? 'active' : ''}`} onClick={() => setViewTab('games')}>
              게임 로비
            </button>
            <button className={`mg-tab ${viewTab === 'leaderboard' ? 'active' : ''}`} onClick={() => setViewTab('leaderboard')}>
              리더보드
            </button>
          </div>
        </>
      )}

      {activeGame && activeGameMeta && (
        <div className="active-game-container arcade-overlay">
          <button className="close-game" onClick={closeGame}>
            로비로 돌아가기
          </button>

          {!user ? (
            <div className="login-alert">로그인 후 미니게임을 플레이할 수 있어요.</div>
          ) : (
            <div className="game-stage">
              <Suspense fallback={<div className="game-loading">게임을 불러오는 중이에요...</div>}>{renderActiveGame()}</Suspense>
            </div>
          )}
        </div>
      )}

      {!activeGame && viewTab === 'games' && (
        <div className="game-grid arcade-grid">
          {games.map((game) => (
            <GameCard key={game.id} game={game} onOpen={openGame} />
          ))}
        </div>
      )}

      {!activeGame && viewTab === 'leaderboard' && (
        <div className="leaderboard-container arcade-leaderboard">
          <h2 className="leaderboard-title">포인트 TOP 10</h2>
          <div className="leaderboard-list">
            {leaderboard.map((entry, index) => (
              <Link
                key={entry.id}
                to={getProfilePath(entry.id)}
                className={`leaderboard-item leaderboard-profile-link ${entry.id === user?.id ? 'is-me' : ''} ${index < 3 ? `rank-${index + 1}` : ''}`}
              >
                <div className="lb-rank">{index < 3 ? RANK_ICONS[index] : <span className="lb-rank-num">{index + 1}</span>}</div>
                <div className="lb-avatar">
                  {entry.photoURL ? <img src={entry.photoURL} alt={entry.name} /> : <div className="lb-initial">{(entry.name || '?')[0]}</div>}
                </div>
                <div className="lb-info">
                  <span className="lb-name">
                    {entry.name}
                    {entry.id === user?.id && <span className="lb-me-tag">ME</span>}
                  </span>
                  <span className="lb-level">Lv.{entry.level || 1}</span>
                </div>
                <div className="lb-points">
                  <span>{(entry.points || 0).toLocaleString()}</span>
                  <small>P</small>
                </div>
              </Link>
            ))}
            {leaderboard.length === 0 && <div className="leaderboard-empty">아직 등록된 유저가 없어요.</div>}
          </div>
        </div>
      )}
    </div>
  );
}
