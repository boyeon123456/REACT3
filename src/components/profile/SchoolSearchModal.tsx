import { useState, type FormEvent } from 'react';
import { Search, X, School, MapPin } from 'lucide-react';
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

    const handleSearch = async (e: FormEvent) => {
        e.preventDefault();
        if (!keyword.trim()) return;

        setLoading(true);
        setError('');
        try {
            const data = await searchSchool(keyword);
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
            <div className="modal-card-v4 school-search-card animate-scale-in" onClick={(e) => e.stopPropagation()}>
                <button type="button" className="modal-close-v4" onClick={onClose}>
                    <X size={20} />
                </button>

                <div className="modal-header-v4">
                    <p className="section-kicker">FIND YOUR SCHOOL</p>
                    <h2>우리 학교 찾기</h2>
                    <p>전국 초·중·고등학교 데이터를 실시간으로 조회합니다.</p>
                </div>

                <form className="school-search-form" onSubmit={handleSearch}>
                    <input
                        type="text"
                        value={keyword}
                        onChange={(e) => setKeyword(e.target.value)}
                        placeholder="학교 이름을 입력하세요 (예: 옥종초, 옥종고)"
                        autoFocus
                    />
                    <button type="submit" aria-label="학교 검색">
                        <Search size={22} />
                    </button>
                </form>

                <div className="search-results-v2">
                    {loading ? (
                        <div className="search-state">
                            <div className="loading-spinner-v2"></div>
                            <p>학교 정보를 불러오는 중...</p>
                        </div>
                    ) : error ? (
                        <div className="search-state error">{error}</div>
                    ) : results.length > 0 ? (
                        <div className="school-results-grid">
                            {results.map((school) => (
                                <button
                                    type="button"
                                    key={school.schoolCode}
                                    onClick={() => onSelect(school)}
                                    className="school-item-v2"
                                >
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
                    ) : keyword && !loading ? (
                        <div className="search-state">
                           검색된 학교가 없습니다. 정확한 이름을 입력해 주세요.
                        </div>
                    ) : (
                        <div className="search-placeholder-v2">
                            <School size={48} />
                            <p>학교 이름을 검색하고 혜택을 받으세요.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
