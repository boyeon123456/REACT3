import { Activity, BadgeCheck, BellRing, Sparkles } from 'lucide-react';
import type { InventoryItem, PostItem } from '../../types/profile';
import type { User } from '../../store/authStore';

interface ProfileStatsProps {
  user: User;
  latestPost?: PostItem;
  myPostsCount: number;
  inventoryCount: number;
  featuredBadge?: InventoryItem;
}

export default function ProfileStats({
  user,
  latestPost,
  myPostsCount,
  inventoryCount,
  featuredBadge,
}: ProfileStatsProps) {
  const latestDate = latestPost?.created_at
    ? new Date(latestPost.created_at).toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })
    : '기록 없음';

  const stats = [
    {
      label: '최근 활동',
      value: latestDate,
      description: latestPost ? latestPost.title : '아직 작성한 글이 없어요.',
      icon: Activity,
      featured: true,
    },
    {
      label: '대표 배지',
      value: featuredBadge?.name || '선택 안 함',
      description: featuredBadge ? '헤더와 프로필 상단에 함께 보여요.' : '보유한 배지 중 하나를 대표로 골라보세요.',
      icon: BadgeCheck,
    },
    {
      label: '알림 상태',
      value: user.settings?.notifications?.inApp ? '실시간 수신' : '꺼짐',
      description: user.settings?.notifications?.email ? '이메일 알림도 함께 켜져 있어요.' : '앱 안 알림만 사용 중이에요.',
      icon: BellRing,
    },
    {
      label: '쇼케이스 밀도',
      value: `${Object.keys(user.equipped_items || {}).length}/${Math.max(inventoryCount, 1)}`,
      description: myPostsCount > 0 ? '활동과 꾸미기가 함께 살아 있는 프로필이에요.' : '아이템과 소개글을 먼저 채우면 더 좋아져요.',
      icon: Sparkles,
    },
  ];

  return (
    <section className="profile-stats-grid">
      {stats.map((stat) => {
        const Icon = stat.icon;

        return (
          <article key={stat.label} className={`stat-card ${stat.featured ? 'feature' : ''}`}>
            <div className="stat-card-top">
              <span className="stat-label">{stat.label}</span>
              <span className="stat-icon">
                <Icon size={18} />
              </span>
            </div>
            <strong>{stat.value}</strong>
            <p>{stat.description}</p>
          </article>
        );
      })}
    </section>
  );
}
