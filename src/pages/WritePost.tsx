import { useState, useRef, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ToggleLeft, ToggleRight, Image, PenLine, Hash, AlertTriangle, X, Loader2, Edit3, AlertOctagon } from 'lucide-react';
import { useAuthStore } from '../store/authStore';
import { db, storage } from '../firebase';
import { collection, addDoc, doc, getDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import './WritePost.css';

export default function WritePost() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id?: string }>();   // edit/:id 라우트
  const isEditMode = !!editId;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore(state => state.user);

  const [isAnon, setIsAnon] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('자유게시판');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [existingImageUrl, setExistingImageUrl] = useState<string | null>(null);

  // Image Upload States
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEditMode);

  // 수정 모드: 기존 게시글 데이터 불러오기
  useEffect(() => {
    if (!isEditMode || !editId) return;
    const fetchPost = async () => {
      try {
        const snap = await getDoc(doc(db, 'posts', editId));
        if (!snap.exists()) {
          alert('게시글을 찾을 수 없습니다.');
          navigate('/board');
          return;
        }
        const data = snap.data();
        // 작성자 본인 또는 관리자인지 확인
        if (user && data.author_id !== user.id && user.role !== 'admin') {
          alert('수정 권한이 없습니다.');
          navigate(`/post/${editId}`);
          return;
        }
        setTitle(data.title || '');
        setContent(data.content || '');
        setCategory(data.board || '자유게시판');
        setTags(data.tags || []);
        setIsAnon(data.author === '익명');
        if (data.imageUrl) {
          setExistingImageUrl(data.imageUrl);
          setImagePreview(data.imageUrl);
        }
      } catch (err) {
        console.error(err);
        alert('게시글 불러오기에 실패했습니다.');
        navigate('/board');
      } finally {
        setLoadingEdit(false);
      }
    };
    fetchPost();
  }, [editId, isEditMode]);

  const handleTagKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      const val = tagInput.trim().replace(/^#/, '');
      if (val && tags.length < 5 && !tags.includes(val)) {
        setTags([...tags, val]);
      }
      setTagInput('');
    }
  };

  const removeTag = (index: number) => {
    setTags(tags.filter((_, i) => i !== index));
  };

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
      setExistingImageUrl(null); // 새 이미지로 교체
    }
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setExistingImageUrl(null);
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
      let imageUrl: string | null = existingImageUrl;

      // 새 이미지가 있으면 업로드
      if (imageFile) {
        const fileRef = ref(storage, `posts/${Date.now()}_${imageFile.name}`);
        const uploadResult = await uploadBytes(fileRef, imageFile);
        imageUrl = await getDownloadURL(uploadResult.ref);
      }

      if (isEditMode && editId) {
        // ── 수정 모드 ──
        await updateDoc(doc(db, 'posts', editId), {
          title,
          content,
          board: category,
          tags,
          imageUrl,
          updated_at: Date.now(),
        });
        alert('게시글이 수정되었습니다!');
        navigate(`/post/${editId}`);
      } else {
        // ── 작성 모드 ──
        const authorName = isAnon ? '익명' : user.name;
        await addDoc(collection(db, 'posts'), {
          title,
          content,
          board: category,
          author: authorName,
          author_id: user.id,
          authorEquipped: user.equipped_items || {},
          imageUrl,
          tags,
          likes: 0,
          views: 0,
          comments: 0,
          created_at: Date.now()
        });

        // 포인트 +10 증가
        if (user.role !== 'admin') {
          const { doc: fbDoc, updateDoc: fbUpdate, increment } = await import('firebase/firestore');
          await fbUpdate(fbDoc(db, 'users', user.id), { points: increment(10) });
        }

        alert('게시글이 등록되었습니다!');
        navigate('/board');
      }
    } catch (err) {
      console.error(err);
      alert(isEditMode ? '게시글 수정에 실패했습니다.' : '게시글 등록에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  if (loadingEdit) {
    return (
      <div style={{ padding: '80px', textAlign: 'center', color: 'var(--text-muted)' }}>
        <Loader2 size={32} style={{ animation: 'spin 1s linear infinite', margin: '0 auto' }} />
        <p style={{ marginTop: '16px' }}>게시글 불러오는 중...</p>
      </div>
    );
  }

  return (
    <div className="write-page animate-fade-in">
      <div className="board-header">
        <h1 className="page-title">
          {isEditMode ? <><Edit3 size={28} style={{ verticalAlign: 'middle', marginRight: '8px' }} />게시글 수정</> : '글쓰기'}
        </h1>
        <p className="page-desc">
          {isEditMode ? '게시글 내용을 수정합니다.' : '새로운 소식을 다같이 공유해보세요.'}
        </p>
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
          {!isEditMode && (
            <div className="anon-toggle" onClick={() => setIsAnon(!isAnon)}>
              {isAnon ? <ToggleRight size={28} className="text-primary" /> : <ToggleLeft size={28} />}
              <span className={isAnon ? 'anon-label active' : 'anon-label'}>익명</span>
            </div>
          )}
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
            placeholder={"내용을 입력하세요.\n\n욕설, 비방, 개인정보 노출은 제재 대상이 될 수 있습니다."}
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

        <div className="form-group tag-input-group">
          <div className="tag-input-wrap">
            <Hash size={16} className="tag-icon" />
            <input
              type="text"
              className="input-field tag-input"
              placeholder="태그를 입력하고 엔터를 누르세요 (최대 5개)"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleTagKeyDown}
              disabled={tags.length >= 5 || isUploading}
            />
          </div>
          {tags.length > 0 && (
            <div className="tags-container" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '12px' }}>
              {tags.map((tag, idx) => (
                <span key={idx} className="tag-chip" style={{ display: 'inline-flex', alignItems: 'center', background: 'var(--primary-light)', padding: '4px 10px', borderRadius: '14px', fontSize: '13px', color: '#fff' }}>
                  #{tag}
                  <button onClick={() => removeTag(idx)} style={{ display: 'flex', marginLeft: '6px', color: '#fff', cursor: 'pointer' }}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
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

        {user?.isBanned && (
          <div style={{ backgroundColor: '#fff1f2', color: '#f43f5e', padding: '12px 16px', borderRadius: '12px', fontSize: '14px', fontWeight: 700, marginBottom: '16px', border: '1px solid rgba(244,63,94,0.2)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertOctagon size={18} /> 활동이 정지된 상태입니다. 게시글을 작성할 수 없습니다.
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
              className={`media-btn ${imageFile || existingImageUrl ? 'has-file' : ''}`}
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploading}
            >
              <Image size={18} /> {imageFile ? '이미지 변경' : existingImageUrl ? '이미지 교체' : '이미지 추가'}
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
                <><Loader2 size={18} className="animate-spin" /> {isEditMode ? '저장 중...' : '업로드 중...'}</>
              ) : (
                <>{isEditMode ? <><Edit3 size={18} /> 수정 완료</> : <><PenLine size={18} /> 등록하기</>}</>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
