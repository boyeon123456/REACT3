export type ShopItemType = 'badge' | 'nameColor' | 'profileBg' | 'avatarFrame';

export type DefaultShopItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  type: ShopItemType;
  style: string;
};

export const DEFAULT_SHOP_ITEMS: DefaultShopItem[] = [
  {
    id: 'badge-fresh-start',
    name: '새싹 멤버',
    description: '첫 활동을 시작하는 멤버를 위한 산뜻한 스타터 배지입니다.',
    price: 300,
    type: 'badge',
    style: 'linear-gradient(135deg, #34d399, #10b981)',
  },
  {
    id: 'badge-club-ace',
    name: '동아리 에이스',
    description: '커뮤니티 활동이 활발한 유저에게 잘 어울리는 에너지 배지입니다.',
    price: 450,
    type: 'badge',
    style: 'linear-gradient(135deg, #60a5fa, #2563eb)',
  },
  {
    id: 'badge-golden-bell',
    name: '골든벨',
    description: '존재감 있게 반짝이는 프리미엄 무드의 대표 배지입니다.',
    price: 650,
    type: 'badge',
    style: 'linear-gradient(135deg, #fbbf24, #f59e0b)',
  },
  {
    id: 'namecolor-coral-punch',
    name: '코랄 펀치',
    description: '밝고 또렷한 코랄 톤으로 이름을 생기 있게 강조합니다.',
    price: 700,
    type: 'nameColor',
    style: '#ff6b6b',
  },
  {
    id: 'namecolor-sky-pop',
    name: '스카이 팝',
    description: '맑고 시원한 블루 컬러로 깔끔한 인상을 만들어줍니다.',
    price: 850,
    type: 'nameColor',
    style: '#3b82f6',
  },
  {
    id: 'namecolor-violet-wave',
    name: '바이올렛 웨이브',
    description: '차분하면서도 세련된 포인트를 주는 퍼플 계열 이름색입니다.',
    price: 1000,
    type: 'nameColor',
    style: '#8b5cf6',
  },
  {
    id: 'profilebg-sunset-track',
    name: '선셋 트랙',
    description: '따뜻한 노을빛이 흐르는 역동적인 프로필 배경입니다.',
    price: 1200,
    type: 'profileBg',
    style: 'linear-gradient(135deg, #f97316, #ef4444)',
  },
  {
    id: 'profilebg-mint-breeze',
    name: '민트 브리즈',
    description: '가볍고 청량한 분위기를 주는 민트 톤 그라데이션입니다.',
    price: 1350,
    type: 'profileBg',
    style: 'linear-gradient(135deg, #2dd4bf, #22c55e)',
  },
  {
    id: 'profilebg-midnight-glow',
    name: '미드나잇 글로우',
    description: '짙은 밤하늘과 네온 포인트가 섞인 깊이감 있는 배경입니다.',
    price: 1500,
    type: 'profileBg',
    style: 'linear-gradient(135deg, #0f172a, #4338ca)',
  },
  {
    id: 'avatarframe-bronze-ring',
    name: '브론즈 링',
    description: '부담 없이 쓰기 좋은 따뜻한 메탈릭 프레임입니다.',
    price: 1100,
    type: 'avatarFrame',
    style: '#b45309',
  },
  {
    id: 'avatarframe-neon-lime',
    name: '네온 라임',
    description: '한눈에 들어오는 밝은 포인트를 더해주는 네온 프레임입니다.',
    price: 1250,
    type: 'avatarFrame',
    style: '#84cc16',
  },
  {
    id: 'avatarframe-royal-gold',
    name: '로열 골드',
    description: '고급스러운 존재감을 주는 클래식 골드 프레임입니다.',
    price: 1450,
    type: 'avatarFrame',
    style: '#f59e0b',
  },
];
