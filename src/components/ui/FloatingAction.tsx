import { PenLine } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import './FloatingAction.css';

export default function FloatingAction() {
  const navigate = useNavigate();
  return (
    <button className="floating-action" onClick={() => navigate('/write')}>
      <PenLine size={24} />
    </button>
  );
}
