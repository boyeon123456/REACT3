import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToggleLeft, ToggleRight, Image, PenLine, Hash, AlertTriangle } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { db } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import './WritePost.css';

export default function WritePost() {
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const [isAnon, setIsAnon] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('자유게시판');

  const charCount = content.length;
  const maxChars = 5000;

  const handleSubmit = async () => {
    if (!title || !content) return;
    if (!user) {
      alert('로그인 후 이용 가능합니다.');
      navigate('/login');
      return;
    }

    try {
      const authorName = isAnon ? '익명' : user.name;
      await addDoc(collection(db, 'posts'), {
        title, 
        content, 
        board: category, 
        author: authorName,
        author_id: user.id,
        likes: 0,
        views: 0,
        comments: 0,
        created_at: Date.now()
      });
      alert('게시글이 등록되었습니다!');
      navigate('/board');
    } catch (err) {
      console.error(err);
      alert('게시글 등록에 실패했습니다.');
    }
  };

  return (
    <div className="write-page animate-fade-in">
      <div className="board-header">
        <h1 className="page-title">글쓰기</h1>
        <p className="page-desc">새로운 소식을 다같이 공유해보세요.</p>
      </div>

      <div className="write-form-container">
        <div className="form-group row-group">
          <div className="category-select-wrap">
            <Hash size={16} className="select-icon" />
            <select className="input-field category-select" value={category} onChange={e => setCategory(e.target.value)}>
              <option>자유게시판</option>
              <option>1학년</option>
              <option>2학년</option>
              <option>3학년</option>
              <option>학생회</option>
              <option>공지사항</option>
            </select>
          </div>
          <div className="anon-toggle" onClick={() => setIsAnon(!isAnon)}>
            {isAnon ? <ToggleRight size={28} className="text-primary" /> : <ToggleLeft size={28} />}
            <span className={isAnon ? 'anon-label active' : 'anon-label'}>익명</span>
          </div>
        </div>

        <div className="form-group">
          <input
            type="text"
            className="input-field title-input"
            placeholder="제목을 입력하세요"
            value={title}
            onChange={e => setTitle(e.target.value)}
            maxLength={100}
          />
          <span className="char-hint">{title.length}/100</span>
        </div>

        <div className="form-group">
          <textarea
            className="input-field content-textarea"
            placeholder="내용을 입력하세요.&#10;&#10;욕설, 비방, 개인정보 노출은 제재 대상이 될 수 있습니다."
            value={content}
            onChange={e => setContent(e.target.value)}
            maxLength={maxChars}
          ></textarea>
          <div className="textarea-footer">
            <div className="content-warning">
              <AlertTriangle size={14} />
              <span>커뮤니티 이용규칙을 준수해주세요.</span>
            </div>
            <span className={`char-count ${charCount > maxChars * 0.9 ? 'warn' : ''}`}>{charCount.toLocaleString()}/{maxChars.toLocaleString()}</span>
          </div>
        </div>

        <div className="write-actions-bar">
          <div className="media-actions">
            <button className="media-btn"><Image size={18} /> 이미지</button>
          </div>
          <div className="submit-actions">
            <button className="cancel-btn" onClick={() => navigate(-1)}>취소</button>
            <button className={`submit-btn ${title && content ? 'ready' : ''}`} onClick={handleSubmit}>
              <PenLine size={18} /> 등록하기
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
