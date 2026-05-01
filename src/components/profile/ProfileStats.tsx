import { Activity, BadgeCheck, FileText, PackageCheck } from 'lucide-react';
import type { PostItem } from '../../types/profile';

import type { User } from '../../store/authStore';

interface ProfileStatsProps {
  user: User;
  latestPost?: PostItem;
  myPostsCount: number;
  inventoryCount: number;
}

export default function ProfileStats({ user, latestPost, myPostsCount, inventoryCount }: ProfileStatsProps) {
  const latestDate = latestPost?.created_at
    ? new Date(latestPost.created_at).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
    : '기록 없음';
  const hasSchoolProfile = Boolean(user.grade && user.class);
  const stats = [
    {
      label: '최근 활동',
      value: latestDate,
      description: latestPost ? latestPost.title : '아직 작성한 게시글이 없어요.',
      icon: Activity,
      featured: true,
    },
    {
      label: '게시글',
      value: myPostsCount.toLocaleString(),
      description: '지금까지 남긴 커뮤니티 글',
      icon: FileText,
    },
    {
      label: '보유 아이템',
      value: inventoryCount.toLocaleString(),
      description: '프로필에 적용 가능한 꾸미기',
      icon: PackageCheck,
    },
    {
      label: '대표 상태',
      value: hasSchoolProfile ? '설정 완료' : '보완 필요',
      description: hasSchoolProfile ? `${user.grade}학년 ${user.class}반 정보가 표시돼요.` : '학년/반을 넣으면 신뢰도가 올라가요.',
      icon: BadgeCheck,
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
