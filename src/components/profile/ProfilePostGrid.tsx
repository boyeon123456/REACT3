import { Bookmark, FileText, ImageIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { BookmarkItem, PostItem } from '../../types/profile';
import StorageImage from '../media/StorageImage';

interface ProfilePostGridProps {
  posts?: PostItem[];
  bookmarks?: BookmarkItem[];
  variant: 'posts' | 'saved';
}

function formatDate(value?: number) {
  if (!value) return '';
  return new Date(value).toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' });
}

export default function ProfilePostGrid({ posts = [], bookmarks = [], variant }: ProfilePostGridProps) {
  const navigate = useNavigate();
  const isSaved = variant === 'saved';
  const items = isSaved ? bookmarks : posts;

  if (items.length === 0) {
    return (
      <section className="profile-simple-empty">
        {isSaved ? <Bookmark size={24} /> : <ImageIcon size={24} />}
        <strong>{isSaved ? '저장한 글이 없어요' : '작성한 글이 없어요'}</strong>
        <p>{isSaved ? '마음에 드는 글을 저장하면 여기에 모여요.' : '첫 게시글을 작성하면 프로필에 표시돼요.'}</p>
      </section>
    );
  }

  return (
    <section className="profile-post-grid" aria-label={isSaved ? '저장한 글' : '작성한 게시글'}>
      {isSaved
        ? bookmarks.map((bookmark) => (
            <button
              key={bookmark.id}
              type="button"
              className="profile-post-tile text-only"
              onClick={() => navigate(`/post/${bookmark.postId}`)}
            >
              <span className="tile-icon">
                <Bookmark size={18} />
              </span>
              <strong>{bookmark.title}</strong>
              <small>{formatDate(bookmark.createdAt)}</small>
            </button>
          ))
        : posts.map((post) => (
            <button
              key={post.id}
              type="button"
              className={`profile-post-tile ${post.imageUrl ? 'has-image' : 'text-only'}`}
              onClick={() => navigate(`/post/${post.id}`)}
            >
              {post.imageUrl ? (
                <StorageImage src={post.imageUrl} alt="" />
              ) : (
                <>
                  <span className="tile-icon">
                    <FileText size={18} />
                  </span>
                  <strong>{post.title}</strong>
                  <small>{post.board || formatDate(post.created_at)}</small>
                </>
              )}
            </button>
          ))}
    </section>
  );
}
