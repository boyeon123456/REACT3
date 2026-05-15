import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { PostItem } from '../../types/profile';

interface ProfileActivityListProps {
  posts: PostItem[];
}

function formatDate(value?: number) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('ko-KR', { year: 'numeric', month: 'short', day: 'numeric' });
}

export default function ProfileActivityList({ posts }: ProfileActivityListProps) {
  const navigate = useNavigate();

  if (posts.length === 0) {
    return (
      <section className="profile-simple-empty">
        <FileText size={24} />
        <strong>아직 활동 기록이 없어요</strong>
        <p>글을 작성하면 최근 활동이 여기에 보여요.</p>
      </section>
    );
  }

  return (
    <section className="profile-activity-simple" aria-label="활동 기록">
      {posts.map((post) => (
        <button key={post.id} type="button" className="profile-activity-item" onClick={() => navigate(`/post/${post.id}`)}>
          <span className="activity-dot" aria-hidden="true" />
          <span className="activity-main">
            <strong>{post.title}</strong>
            <small>{post.board || '게시글'}</small>
          </span>
          <time>{formatDate(post.created_at)}</time>
        </button>
      ))}
    </section>
  );
}
