import { Activity, ChevronRight, ShoppingBag, Sparkles } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { typeLabels } from '../../types/profile';
import type { InventoryItem, PostItem } from '../../types/profile';

interface ProfileActivityProps {
  myPosts: PostItem[];
  equippedItems: InventoryItem[];
}

export default function ProfileActivity({ myPosts, equippedItems }: ProfileActivityProps) {
  const navigate = useNavigate();

  return (
    <div className="content-stack">
      <article className="content-card">
        <div className="section-heading">
          <div>
            <p className="section-kicker">OVERVIEW</p>
            <h3>내 활동 요약</h3>
          </div>
          <button type="button" className="inline-action" onClick={() => navigate('/write')}>
            글 쓰러 가기
            <ChevronRight size={16} />
          </button>
        </div>

        <div className="activity-list">
          {myPosts.length === 0 ? (
            <div className="empty-panel">
              <Sparkles size={18} />
              <span>아직 작성한 게시글이 없어요. 첫 글을 남겨 프로필을 채워보세요.</span>
            </div>
          ) : (
            myPosts.slice(0, 6).map((post) => (
              <button
                key={post.id}
                type="button"
                className="activity-row"
                onClick={() => navigate(`/post/${post.id}`)}
              >
                <div className="activity-icon">
                  <Activity size={16} />
                </div>
                <div className="activity-copy">
                  <p>{post.board || '게시판'}에 새 글을 작성했어요.</p>
                  <strong>{post.title}</strong>
                </div>
                <span className="activity-date">
                  {post.created_at ? new Date(post.created_at).toLocaleDateString() : ''}
                </span>
              </button>
            ))
          )}
        </div>
      </article>

      <article className="content-card compact">
        <div className="section-heading">
          <div>
            <p className="section-kicker">EQUIPPED</p>
            <h3>현재 적용 중인 꾸미기</h3>
          </div>
        </div>

        {equippedItems.length === 0 ? (
          <div className="empty-panel">
            <ShoppingBag size={18} />
            <span>아직 적용한 아이템이 없어요. 인벤토리에서 바로 장착할 수 있어요.</span>
          </div>
        ) : (
          <div className="equipped-grid">
            {equippedItems.map((item) => (
              <div key={item.id} className="equipped-chip">
                <span>{typeLabels[item.type]}</span>
                <strong>{item.name}</strong>
              </div>
            ))}
          </div>
        )}
      </article>
    </div>
  );
}
