import { db } from '../firebase';
import { doc, updateDoc, arrayUnion } from 'firebase/firestore';

// 배지 정의: id, 조건 체크 함수
export const BADGE_DEFINITIONS = [
  { id: '첫_걸음',    label: '첫 걸음',    icon: '🐣', desc: '처음 로그인',          check: (_p: number, _g: number, _c: number) => true },
  { id: '참가자',     label: '참가자',     icon: '🎯', desc: '미니게임 1회 참가',    check: (_p: number, g: number) => g >= 1 },
  { id: '즐기는_자',  label: '즐기는 자',  icon: '🎯', desc: '미니게임 10회 참가',   check: (_p: number, g: number) => g >= 10 },
  { id: '프로게이머', label: '프로게이머', icon: '🎯', desc: '미니게임 50회 참가',   check: (_p: number, g: number) => g >= 50 },
  { id: '마스터',     label: '마스터',     icon: '🎯', desc: '미니게임 100회 참가',  check: (_p: number, g: number) => g >= 100 },
  { id: '신',         label: '신',         icon: '🎯', desc: '미니게임 500회 참가',  check: (_p: number, g: number) => g >= 500 },
  { id: '전설',       label: '전설',       icon: '🎯', desc: '미니게임 1000회 참가', check: (_p: number, g: number) => g >= 1000 },
  { id: '수다쟁이',   label: '수다쟁이',   icon: '💬', desc: '댓글 50개 작성',       check: (_p: number, _g: number, c: number) => c >= 50 },
  { id: '인기인',     label: '인기인',     icon: '✨', desc: '포인트 1000P 달성',    check: (p: number) => p >= 1000 },
  { id: '인플루언서', label: '인플루언서', icon: '✨', desc: '포인트 5000P 달성',    check: (p: number) => p >= 5000 },
  { id: '개근',       label: '개근',       icon: '📅', desc: '레벨 3 달성',          check: (p: number) => p >= 400 },
  { id: '출석왕',     label: '출석왕',     icon: '📅', desc: '레벨 5 달성',          check: (p: number) => p >= 1500 },
];

/**
 * 사용자 상태에 따라 새로 획득 가능한 배지를 체크하고 Firestore에 저장
 * @param userId - 유저 uid
 * @param points - 현재 포인트
 * @param gameCount - 총 게임 횟수
 * @param commentCount - 총 댓글 수 (선택)
 * @param currentBadges - 이미 보유한 배지 id 목록
 * @returns 새로 획득한 배지 label 목록
 */
export async function checkAndAwardBadges(
  userId: string,
  points: number,
  gameCount: number,
  commentCount: number = 0,
  currentBadges: string[] = []
): Promise<string[]> {
  const newBadges: string[] = [];

  for (const badge of BADGE_DEFINITIONS) {
    if (!currentBadges.includes(badge.id) && badge.check(points, gameCount, commentCount)) {
      newBadges.push(badge.id);
    }
  }

  if (newBadges.length > 0) {
    await updateDoc(doc(db, 'users', userId), {
      badges: arrayUnion(...newBadges),
    });
  }

  return newBadges;
}
