import type { PostItem } from '../../types/profile';

import type { User } from '../../store/authStore';

interface ProfileStatsProps {
  user: User;
  latestPost?: PostItem;
  myPostsCount: number;
  inventoryCount: number;
}

export default function ProfileStats({ user, latestPost, myPostsCount, inventoryCount }: ProfileStatsProps) {
  return (
    <section className="profile-stats-grid">
      <article className="stat-card feature">
        <span className="stat-label">최근 활동</span>
        <strong>{latestPost ? new Date(latestPost.created_at || 0).toLocaleDateString() : '아직 없음'}</strong>
        <p>{latestPost ? latestPost.title : '첫 게시글을 작성하면 여기 표시돼요.'}</p>
      </article>
      <article className="stat-card">
        <span className="stat-label">게시글</span>
        <strong>{myPostsCount}</strong>
        <p>지금까지 작성한 커뮤니티 글 수</p>
      </article>
      <article className="stat-card">
        <span className="stat-label">보유 아이템</span>
        <strong>{inventoryCount}</strong>
        <p>프로필에 적용 가능한 꾸미기 아이템</p>
      </article>
      <article className="stat-card">
        <span className="stat-label">대표 상태</span>
        <strong>{user.grade && user.class ? '학번 설정 완료' : '추가 설정 필요'}</strong>
        <p>
          {user.grade && user.class
            ? '프로필 신뢰도가 더 좋아졌어요.'
            : '학년/반을 넣으면 프로필 완성도가 올라가요.'}
        </p>
      </article>
    </section>
  );
}
