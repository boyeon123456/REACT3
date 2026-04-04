import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import Home from './pages/Home';
import Board from './pages/Board';
import PostDetail from './pages/PostDetail';
import WritePost from './pages/WritePost';
import MiniGame from './pages/MiniGame';
import MyPage from './pages/MyPage';
import Admin from './pages/Admin';
import Login from './pages/Login';
import './App.css';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<AppLayout />}>
          <Route index element={<Home />} />
          <Route path="board" element={<Board />} />
          <Route path="post/:id" element={<PostDetail />} />
          <Route path="write" element={<WritePost />} />
          <Route path="games" element={<MiniGame />} />
          <Route path="mypage" element={<MyPage />} />
          <Route path="admin" element={<Admin />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}

export default App;
