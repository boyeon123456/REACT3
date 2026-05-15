export type BoardKey = 'free' | 'notice' | 'grade1' | 'grade2' | 'grade3' | 'council';
export type BoardScope = 'global' | 'school';
export type BoardSort = 'latest' | 'popular' | 'comments';

export type BoardOption = {
  key: BoardKey;
  label: string;
  description: string;
  scope: BoardScope;
  legacyLabels: string[];
  color: string;
};

export type NormalizedPost = {
  id: string;
  title: string;
  content: string;
  boardKey: BoardKey;
  boardLabel: string;
  board: string;
  scope: BoardScope;
  anonymous: boolean;
  authorDisplayName: string;
  authorEquipped: Record<string, string>;
  authorId?: string;
  schoolCode?: string | null;
  schoolName?: string | null;
  imageUrl?: string | null;
  tags: string[];
  likes: number;
  comments: number;
  views: number;
  bookmarks: number;
  isPinned: boolean;
  createdAt: number;
  updatedAt?: number;
  raw: Record<string, unknown>;
};

export const BOARD_OPTIONS: BoardOption[] = [
  {
    key: 'free',
    label: '자유',
    description: '가볍게 소통하는 전체 공개 게시판',
    scope: 'global',
    legacyLabels: ['자유', '자유게시판', '자유 게시판'],
    color: '#2563eb',
  },
  {
    key: 'notice',
    label: '공지',
    description: '중요 안내와 운영 공지',
    scope: 'global',
    legacyLabels: ['공지', '공지사항', '운영 공지'],
    color: '#ef4444',
  },
  {
    key: 'grade1',
    label: '1학년',
    description: '우리 학교 1학년 전용 게시판',
    scope: 'school',
    legacyLabels: ['1학년', '1학년 게시판'],
    color: '#059669',
  },
  {
    key: 'grade2',
    label: '2학년',
    description: '우리 학교 2학년 전용 게시판',
    scope: 'school',
    legacyLabels: ['2학년', '2학년 게시판'],
    color: '#7c3aed',
  },
  {
    key: 'grade3',
    label: '3학년',
    description: '우리 학교 3학년 전용 게시판',
    scope: 'school',
    legacyLabels: ['3학년', '3학년 게시판'],
    color: '#ea580c',
  },
  {
    key: 'council',
    label: '학생회',
    description: '학생회 소식과 건의',
    scope: 'school',
    legacyLabels: ['학생회', '학생회 게시판'],
    color: '#0891b2',
  },
];

export const BOARD_FILTERS = [{ key: 'all', label: '전체', color: '#475569' }, ...BOARD_OPTIONS] as const;

export const BOARD_SORT_OPTIONS: { key: BoardSort; label: string }[] = [
  { key: 'latest', label: '최신순' },
  { key: 'popular', label: '추천순' },
  { key: 'comments', label: '댓글순' },
];

export const BOARD_TAG_COLORS: Record<string, string> = BOARD_OPTIONS.reduce<Record<string, string>>(
  (acc, option) => {
    acc[option.key] = option.color;
    acc[option.label] = option.color;
    option.legacyLabels.forEach((label) => {
      acc[label] = option.color;
    });
    return acc;
  },
  { 전체: '#475569', 기타: '#64748b' }
);

export const BOARD_BY_KEY = BOARD_OPTIONS.reduce<Record<BoardKey, BoardOption>>((acc, option) => {
  acc[option.key] = option;
  return acc;
}, {} as Record<BoardKey, BoardOption>);

export function getBoardByLegacyLabel(label?: string | null): BoardOption {
  if (!label) return BOARD_BY_KEY.free;
  const normalized = label.trim();
  return (
    BOARD_OPTIONS.find((option) => option.label === normalized || option.legacyLabels.includes(normalized)) ||
    BOARD_BY_KEY.free
  );
}

export function getBoardOption(key?: string | null, legacyLabel?: string | null): BoardOption {
  if (key && key in BOARD_BY_KEY) return BOARD_BY_KEY[key as BoardKey];
  return getBoardByLegacyLabel(legacyLabel);
}

export function getPostCreatedAt(value: unknown): number {
  if (typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'toMillis' in value && typeof value.toMillis === 'function') {
    return value.toMillis();
  }
  return 0;
}

export function formatBoardDate(ts?: number): string {
  if (!ts) return '-';
  const date = new Date(ts);
  const now = Date.now();
  const sameYear = new Date(now).getFullYear() === date.getFullYear();
  const sameDay = new Date(now).toDateString() === date.toDateString();

  if (sameDay) {
    return `${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
  }

  if (sameYear) {
    return `${date.getMonth() + 1}.${date.getDate()}`;
  }

  return `${date.getFullYear()}.${date.getMonth() + 1}.${date.getDate()}`;
}

export function normalizePost(id: string, data: Record<string, unknown>): NormalizedPost {
  const board = getBoardOption(typeof data.boardKey === 'string' ? data.boardKey : null, typeof data.board === 'string' ? data.board : null);
  const legacyScope: BoardScope = data.isPublic === false ? 'school' : board.scope;
  const scope = data.scope === 'school' || data.scope === 'global' ? data.scope : legacyScope;
  const anonymous = typeof data.anonymous === 'boolean' ? data.anonymous : true;
  const authorDisplayName =
    (typeof data.authorDisplayName === 'string' && data.authorDisplayName) ||
    (typeof data.author === 'string' && data.author) ||
    (anonymous ? '익명' : '이름 없음');

  return {
    id,
    title: (typeof data.title === 'string' && data.title) || '제목 없음',
    content: (typeof data.content === 'string' && data.content) || '',
    boardKey: board.key,
    boardLabel: board.label,
    board: board.label,
    scope,
    anonymous,
    authorDisplayName: anonymous ? '익명' : authorDisplayName,
    authorEquipped:
      data.authorEquipped && typeof data.authorEquipped === 'object' && !Array.isArray(data.authorEquipped)
        ? Object.entries(data.authorEquipped as Record<string, unknown>).reduce<Record<string, string>>((acc, [key, value]) => {
            if (typeof value === 'string') acc[key] = value;
            return acc;
          }, {})
        : {},
    authorId: anonymous ? undefined : typeof data.author_id === 'string' ? data.author_id : typeof data.authorId === 'string' ? data.authorId : undefined,
    schoolCode: scope === 'school' && typeof data.schoolCode === 'string' ? data.schoolCode : null,
    schoolName: anonymous ? null : typeof data.schoolName === 'string' ? data.schoolName : null,
    imageUrl:
      typeof data.imagePath === 'string'
        ? data.imagePath
        : typeof data.imageUrl === 'string'
          ? data.imageUrl
          : null,
    tags: Array.isArray(data.tags) ? data.tags.filter((tag): tag is string => typeof tag === 'string') : [],
    likes: Number(data.likes || 0),
    comments: Number(data.comments || 0),
    views: Number(data.views || 0),
    bookmarks: Number(data.bookmarks || 0),
    isPinned: Boolean(data.isPinned),
    createdAt: getPostCreatedAt(data.created_at || data.createdAt),
    updatedAt: getPostCreatedAt(data.updated_at || data.updatedAt) || undefined,
    raw: data,
  };
}

export function boardScopeToLegacyPublic(scope: BoardScope): boolean {
  return scope === 'global';
}
