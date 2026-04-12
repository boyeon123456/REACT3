import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ToggleLeft, ToggleRight, Image, PenLine, Hash, AlertTriangle, X, Loader2 } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { db, storage } from '../firebase';
import { collection, addDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './WritePost.css';

export default function WritePost() {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore(state => state.user);
  
  const [isAnon, setIsAnon] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('자유게시판');
  
  // Image Upload States
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const charCount = content.length;
  const maxChars = 5000;

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('파일 크기는 5MB를 초과할 수 없습니다.');
        return;
      }
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!title || !content) return;
    if (!user) {
      alert('로그인 후 이용 가능합니다.');
      navigate('/login');
      return;
    }

    setIsUploading(true);

    try {
      let imageUrl = null;

      // 1. 이미지가 있으면 스토리지에 업로드
      if (imageFile) {
        const fileRef = ref(storage, `posts/${Date.now()}_${imageFile.name}`);
        const uploadResult = await uploadBytes(fileRef, imageFile);
        imageUrl = await getDownloadURL(uploadResult.ref);
      }

      const authorName = isAnon ? '익명' : user.name;
      
      // 2. Firestore에 게시글 저장
      await addDoc(collection(db, 'posts'), {
        title, 
        content, 
        board: category, 
        author: authorName,
        author_id: user.id,
        imageUrl, // 이미지 URL 추가
        likes: 0,
        views: 0,
        comments: 0,
        created_at: Date.now()
      });

      // 포인트 +10 증가
      if (user.role !== 'admin') {
        const { doc, updateDoc, increment } = await import('firebase/firestore');
        await updateDoc(doc(db, 'users', user.id), { points: increment(10) });
      }

      alert('게시글이 등록되었습니다!');
      navigate('/board');
    } catch (err) {
      console.error(err);
      alert('게시글 등록에 실패했습니다.');
    } finally {
      setIsUploading(false);
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
            disabled={isUploading}
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
            disabled={isUploading}
          ></textarea>
          <div className="textarea-footer">
            <div className="content-warning">
              <AlertTriangle size={14} />
              <span>커뮤니티 이용규칙을 준수해주세요.</span>
            </div>
            <span className={`char-count ${charCount > maxChars * 0.9 ? 'warn' : ''}`}>{charCount.toLocaleString()}/{maxChars.toLocaleString()}</span>
          </div>
        </div>

        {/* 이미지 미리보기 구역 */}
        {imagePreview && (
          <div className="image-preview-container">
            <div className="preview-wrapper">
              <img src={imagePreview} alt="Preview" />
              <button className="remove-preview" onClick={removeImage}>
                <X size={16} />
              </button>
            </div>
          </div>
        )}

        <div className="write-actions-bar">
          <div className="media-actions">
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*"
              onChange={handleImageChange}
            />
            <button 
              className={`media-btn ${imageFile ? 'has-file' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Image size={18} /> {imageFile ? '이미지 변경' : '이미지 추가'}
            </button>
          </div>
          <div className="submit-actions">
            <button className="cancel-btn" onClick={() => navigate(-1)} disabled={isUploading}>취소</button>
            <button 
              className={`submit-btn ${title && content && !isUploading ? 'ready' : ''}`} 
              onClick={handleSubmit}
              disabled={isUploading || !title || !content}
            >
              {isUploading ? (
                <><Loader2 size={18} className="animate-spin" /> 업로드 중...</>
              ) : (
                <><PenLine size={18} /> 등록하기</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
