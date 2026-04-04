import { useState } from 'react';
import { AlertCircle, Users, FileText, Trash2, CheckCircle, XCircle, Clock, TrendingUp } from 'lucide-react';
import './Admin.css';

const reports = [
  { id: 1, type: '게시글', content: '진심 우리반 담임 노답임...', reason: '교사 비방', reporter: '신고봇1', date: '04.04', status: 'pending' },
  { id: 2, type: '댓글', content: '니 얼굴 실화냐?', reason: '인신공격', reporter: '불의를못참음', date: '04.03', status: 'pending' },
  { id: 3, type: '게시글', content: '야자 쨀 사람 구함~', reason: '부적절 친목', reporter: '선도부장', date: '04.03', status: 'resolved' },
  { id: 4, type: '댓글', content: '시험 답 알려주는 곳 DM', reason: '부정행위', reporter: '익명신고', date: '04.02', status: 'pending' },
];

const stats = [
  { title: '총 가입자', value: '1,420명', icon: Users, color: '#6C5CE7', bg: 'rgba(108,92,231,0.1)' },
  { title: '오늘 게시글', value: '47개', icon: FileText, color: '#4DA3FF', bg: 'rgba(77,163,255,0.1)' },
  { title: '미처리 신고', value: '3건', icon: AlertCircle, color: '#FF4757', bg: 'rgba(255,71,87,0.1)' },
  { title: '오늘 방문자', value: '892명', icon: TrendingUp, color: '#00B894', bg: 'rgba(0,184,148,0.1)' },
];

export default function Admin() {
  const [filter, setFilter] = useState<'all' | 'pending' | 'resolved'>('all');
  const filtered = reports.filter(r => filter === 'all' || r.status === filter);

  return (
    <div className="admin-page animate-fade-in">
      <div className="admin-header"><h1 className="page-title">🛡️ 관리자 대시보드</h1></div>

      <div className="admin-stats">
        {stats.map((s, i) => (
          <div key={i} className="admin-stat-card">
            <div className="stat-icon-wrap" style={{ backgroundColor: s.bg, color: s.color }}><s.icon size={24} /></div>
            <div className="stat-info">
              <span className="stat-title">{s.title}</span>
              <span className="stat-value" style={{ color: s.color }}>{s.value}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-content">
        <div className="table-header-actions">
          <h3 className="section-title">신고 관리</h3>
          <div className="admin-filter-tabs">
            <button className={`af-tab ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>전체</button>
            <button className={`af-tab ${filter === 'pending' ? 'active' : ''}`} onClick={() => setFilter('pending')}>미처리</button>
            <button className={`af-tab ${filter === 'resolved' ? 'active' : ''}`} onClick={() => setFilter('resolved')}>완료</button>
          </div>
        </div>

        <div className="report-cards">
          {filtered.map(report => (
            <div key={report.id} className={`report-card ${report.status}`}>
              <div className="report-top">
                <span className="report-type-badge">{report.type}</span>
                <span className={`report-status ${report.status}`}>
                  {report.status === 'pending' ? <><Clock size={14}/> 미처리</> : <><CheckCircle size={14}/> 완료</>}
                </span>
              </div>
              <p className="report-content">"{report.content}"</p>
              <div className="report-meta">
                <span>사유: {report.reason}</span>
                <span>신고자: {report.reporter}</span>
                <span>{report.date}</span>
              </div>
              {report.status === 'pending' && (
                <div className="report-actions">
                  <button className="admin-btn approve"><CheckCircle size={16}/> 경고</button>
                  <button className="admin-btn delete"><Trash2 size={16}/> 삭제</button>
                  <button className="admin-btn dismiss"><XCircle size={16}/> 기각</button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
