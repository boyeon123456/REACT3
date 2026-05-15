import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  AlertOctagon,
  AlertTriangle,
  Hash,
  Image,
  Loader2,
  Lock,
  PenLine,
  Send,
  User,
  UserRoundX,
  X,
} from 'lucide-react';
import { collection, deleteField, doc, getDoc, increment, setDoc, updateDoc, writeBatch } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';
import { db, storage } from '../firebase';
import { useAuthStore } from '../store/authStore';
import {
  BOARD_BY_KEY,
  BOARD_OPTIONS,
  boardScopeToLegacyPublic,
  getBoardOption,
  normalizePost,
  type BoardKey,
} from '../constants/boardUi';
import { resolveStorageSrc } from '../lib/storageAsset';
import './WritePost.css';

const MAX_TITLE = 100;
const MAX_CONTENT = 5000;
const MAX_TAGS = 5;

export default function WritePost() {
  const navigate = useNavigate();
  const { id: editId } = useParams<{ id?: string }>();
  const isEditMode = Boolean(editId);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const user = useAuthStore((state) => state.user);

  const [boardKey, setBoardKey] = useState<BoardKey>('free');
  const [anonymous, setAnonymous] = useState(true);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [existingImagePath, setExistingImagePath] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [loadingEdit, setLoadingEdit] = useState(isEditMode);

  const selectedBoard = BOARD_BY_KEY[boardKey];
  const isSchoolBoard = selectedBoard.scope === 'school';
  const canUseSelectedBoard = !isSchoolBoard || Boolean(user?.schoolCode);
  const canSubmit = Boolean(title.trim() && content.trim() && user && !user.isBanned && canUseSelectedBoard && !isUploading);

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

        const normalized = normalizePost(snap.id, snap.data());
        let ownerId = normalized.authorId;
        try {
          const ownerSnap = await getDoc(doc(db, 'post_owners', editId));
          ownerId = ownerSnap.exists() ? ownerSnap.data().ownerId : normalized.authorId;
        } catch {
          ownerId = normalized.authorId;
        }
        if (user && ownerId !== user.id && user.role !== 'admin') {
          alert('수정 권한이 없습니다.');
          navigate(`/post/${editId}`);
          return;
        }

        setTitle(normalized.title);
        setContent(normalized.content);
        setBoardKey(normalized.boardKey);
        setAnonymous(normalized.anonymous);
        setTags(normalized.tags);
        setExistingImagePath(normalized.imageUrl || null);
        setImagePreview(await resolveStorageSrc(normalized.imageUrl || null));
      } catch (error) {
        console.error(error);
        alert('게시글을 불러오지 못했습니다.');
        navigate('/board');
      } finally {
        setLoadingEdit(false);
      }
    };

    void fetchPost();
  }, [editId, isEditMode, navigate, user]);

  const boardChoices = useMemo(
    () =>
      BOARD_OPTIONS.map((option) => ({
        ...option,
        disabled: option.scope === 'school' && !user?.schoolCode,
      })),
    [user?.schoolCode]
  );

  const handleTagKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' && event.key !== ',') return;
    event.preventDefault();
    const value = tagInput.trim().replace(/^#/, '');
    if (!value || tags.includes(value) || tags.length >= MAX_TAGS) {
      setTagInput('');
      return;
    }
    setTags((prev) => [...prev, value]);
    setTagInput('');
  };

  const removeTag = (index: number) => {
    setTags((prev) => prev.filter((_, i) => i !== index));
  };

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      alert('이미지는 5MB 이하만 업로드할 수 있습니다.');
      return;
    }

    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
    setExistingImagePath(null);
  };

  const removeImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setExistingImagePath(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleSubmit = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      navigate('/login');
      return;
    }
    if (user.isBanned) return;
    if (!title.trim() || !content.trim()) return;
    if (!canUseSelectedBoard) {
      alert('학교 정보를 등록해야 사용할 수 있는 게시판입니다.');
      return;
    }

    setIsUploading(true);

    try {
      let imagePath = existingImagePath;
      if (imageFile) {
        imagePath = `posts/${Date.now()}_${imageFile.name}`;
        await uploadBytes(ref(storage, imagePath), imageFile);
      }

      const board = getBoardOption(boardKey);
      const authorDisplayName = anonymous ? '익명' : user.name;
      const basePost = {
        title: title.trim(),
        content: content.trim(),
        boardKey,
        board: board.label,
        scope: board.scope,
        isPublic: boardScopeToLegacyPublic(board.scope),
        anonymous,
        author: authorDisplayName,
        authorDisplayName,
        author_id: anonymous ? null : user.id,
        authorEquipped: anonymous ? {} : user.equipped_items || {},
        schoolCode: board.scope === 'school' ? user.schoolCode || null : null,
        imagePath: imagePath || null,
        tags,
      };

      if (isEditMode && editId) {
        await updateDoc(doc(db, 'posts', editId), {
          ...basePost,
          schoolName: deleteField(),
          imageUrl: deleteField(),
          updated_at: Date.now(),
        });
        alert('게시글을 수정했습니다.');
        navigate(`/post/${editId}`);
      } else {
        const postRef = doc(collection(db, 'posts'));
        const batch = writeBatch(db);
        const createdAt = Date.now();

        batch.set(postRef, {
          ...basePost,
          likes: 0,
          views: 0,
          comments: 0,
          bookmarks: 0,
          isPinned: false,
          created_at: createdAt,
        });
        batch.set(doc(db, 'post_owners', postRef.id), {
          ownerId: user.id,
          createdAt,
        });
        await batch.commit();

        if (user.role !== 'admin') {
          await updateDoc(doc(db, 'users', user.id), { points: increment(10) });
        }

        if (user.schoolCode) {
          await setDoc(
            doc(db, 'school_stats', user.schoolCode),
            {
              schoolName: user.schoolName,
              points: increment(10),
              postCount: increment(1),
              lastActive: Date.now(),
            },
            { merge: true }
          );
        }

        alert('게시글을 등록했습니다.');
        navigate('/board');
      }
    } catch (error) {
      console.error(error);
      alert(isEditMode ? '게시글 수정에 실패했습니다.' : '게시글 등록에 실패했습니다.');
    } finally {
      setIsUploading(false);
    }
  };

  if (loadingEdit) {
    return (
      <div className="write-loading">
        <Loader2 size={32} />
        <p>게시글을 불러오는 중입니다.</p>
      </div>
    );
  }

  return (
    <div className="write-page animate-fade-in">
      <header className="write-header">
        <div>
          <p>{isEditMode ? 'Edit Post' : 'New Post'}</p>
          <h1>{isEditMode ? '게시글 수정' : '새 글 작성'}</h1>
        </div>
        <button type="button" onClick={() => navigate(-1)}>
          취소
        </button>
      </header>

      <section className="write-panel">
        <div className="write-intro-card">
          <strong>{isEditMode ? '내용을 더 읽기 좋게 다듬어 보세요.' : '가독성 좋은 글은 더 많은 반응을 만듭니다.'}</strong>
          <p>제목은 분명하게, 본문은 짧은 문단으로 나누고 필요한 태그만 2~3개 정도 붙이는 구성이 가장 좋아요.</p>
        </div>

        <div className="board-picker" aria-label="게시판 선택">
          {boardChoices.map((option) => (
            <button
              type="button"
              key={option.key}
              disabled={option.disabled || isUploading}
              className={boardKey === option.key ? 'active' : ''}
              onClick={() => setBoardKey(option.key)}
            >
              <strong>{option.label}</strong>
              <span>{option.description}</span>
              {option.scope === 'school' && <Lock size={14} />}
            </button>
          ))}
        </div>

        {!canUseSelectedBoard && (
          <div className="write-alert">
            <AlertOctagon size={17} />
            학교 게시판은 마이페이지에서 학교 정보를 등록한 뒤 사용할 수 있습니다.
          </div>
        )}

        {user?.isBanned && (
          <div className="write-alert danger">
            <AlertOctagon size={17} />
            제재 상태에서는 게시글을 작성할 수 없습니다.
          </div>
        )}

        <div className="identity-toggle" aria-label="작성자 표시">
          <button type="button" className={anonymous ? 'active' : ''} onClick={() => setAnonymous(true)} disabled={isUploading}>
            <UserRoundX size={17} />
            익명
          </button>
          <button type="button" className={!anonymous ? 'active' : ''} onClick={() => setAnonymous(false)} disabled={isUploading}>
            <User size={17} />
            실명
          </button>
        </div>

        <label className="write-field title-field">
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={MAX_TITLE}
            placeholder="제목을 입력해 주세요"
            disabled={isUploading}
          />
          <span>{title.length}/{MAX_TITLE}</span>
        </label>

        <label className="write-field content-field">
          <textarea
            value={content}
            onChange={(event) => setContent(event.target.value)}
            maxLength={MAX_CONTENT}
            placeholder="내용을 입력해 주세요"
            disabled={isUploading}
          />
          <div className="write-helper-row">
            <span>
              <AlertTriangle size={14} />
              개인정보 노출, 비방, 혐오 표현은 제재될 수 있습니다.
            </span>
            <strong>{content.length.toLocaleString()}/{MAX_CONTENT.toLocaleString()}</strong>
          </div>
        </label>

        <div className="tag-editor">
          <label>
            <Hash size={16} />
            <input
              type="text"
              value={tagInput}
              onChange={(event) => setTagInput(event.target.value)}
              onKeyDown={handleTagKeyDown}
              placeholder="태그 입력 후 Enter"
              disabled={tags.length >= MAX_TAGS || isUploading}
            />
          </label>
          {tags.length > 0 && (
            <div className="tag-list">
              {tags.map((tag, index) => (
                <span key={tag}>
                  #{tag}
                  <button type="button" onClick={() => removeTag(index)} disabled={isUploading}>
                    <X size={12} />
                  </button>
                </span>
              ))}
            </div>
          )}
        </div>

        {imagePreview && (
          <div className="image-preview-container">
            <img src={imagePreview} alt="첨부 이미지 미리보기" />
            <button type="button" onClick={removeImage} disabled={isUploading}>
              <X size={16} />
            </button>
          </div>
        )}

        <footer className="write-actions-bar">
          <div>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageChange} hidden />
            <button type="button" className="media-btn" onClick={() => fileInputRef.current?.click()} disabled={isUploading}>
              <Image size={18} />
              {imagePreview ? '이미지 변경' : '이미지 추가'}
            </button>
          </div>
          <button type="button" className="submit-btn" onClick={handleSubmit} disabled={!canSubmit}>
            {isUploading ? <Loader2 size={18} className="spin" /> : isEditMode ? <PenLine size={18} /> : <Send size={18} />}
            {isUploading ? '업로드 중' : isEditMode ? '수정 완료' : '등록'}
          </button>
        </footer>
      </section>
    </div>
  );
}
