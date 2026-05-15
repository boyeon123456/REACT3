import { useState, type FormEvent } from 'react';
import { MapPin, School, Search, X } from 'lucide-react';
import { searchSchool, type SchoolInfo } from '../../api/neisApi';
import './ProfileModals.css';

interface SchoolSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (school: SchoolInfo) => void;
}

export default function SchoolSearchModal({ isOpen, onClose, onSelect }: SchoolSearchModalProps) {
  const [keyword, setKeyword] = useState('');
  const [results, setResults] = useState<SchoolInfo[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSearch = async (event: FormEvent) => {
    event.preventDefault();

    const normalizedKeyword = keyword.trim();
    if (!normalizedKeyword) return;

    setLoading(true);
    setError('');

    try {
      const data = await searchSchool(normalizedKeyword);
      setResults(data);
    } catch (searchError) {
      console.error('School search failed:', searchError);
      setError('학교 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay-v4 school-search-overlay" onClick={onClose}>
      <div className="modal-card-v4 school-search-card animate-scale-in" onClick={(event) => event.stopPropagation()}>
        <div className="school-search-sticky-top">
          <button type="button" className="modal-close-v4" onClick={onClose}>
            <X size={20} />
          </button>

          <div className="modal-header-v4">
            <p className="section-kicker">FIND YOUR SCHOOL</p>
            <h2>우리 학교 찾기</h2>
            <p>학교 이름을 검색하면 NEIS 데이터를 바탕으로 학교 정보를 바로 불러옵니다.</p>
          </div>

          <form className="school-search-form" onSubmit={handleSearch}>
            <input
              type="text"
              value={keyword}
              onChange={(event) => setKeyword(event.target.value)}
              placeholder="학교 이름을 입력해 주세요"
              autoFocus
            />
            <button type="submit" aria-label="학교 검색">
              <Search size={22} />
            </button>
          </form>
        </div>

        <div className="search-results-v2">
          {loading ? (
            <div className="search-state">
              <div className="loading-spinner-v2" />
              <p>학교 정보를 불러오는 중입니다...</p>
            </div>
          ) : error ? (
            <div className="search-state error">{error}</div>
          ) : results.length > 0 ? (
            <div className="school-results-grid">
              {results.map((school) => (
                <button type="button" key={school.schoolCode} onClick={() => onSelect(school)} className="school-item-v2">
                  <div className="school-item-name">
                    <div className="school-item-icon">
                      <School size={20} />
                    </div>
                    {school.schoolName}
                  </div>
                  <div className="school-item-address">
                    <MapPin size={16} />
                    {school.address}
                  </div>
                </button>
              ))}
            </div>
          ) : keyword.trim() ? (
            <div className="search-state">검색한 학교가 없어요. 학교 이름을 다시 확인해 주세요.</div>
          ) : (
            <div className="search-placeholder-v2">
              <School size={48} />
              <p>학교 이름을 검색하고 원하는 학교를 선택해 주세요.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
