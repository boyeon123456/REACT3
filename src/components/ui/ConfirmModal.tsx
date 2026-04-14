import { AlertCircle, X } from 'lucide-react';
import './ConfirmModal.css';

interface ConfirmModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'primary';
}

export default function ConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = '확인',
  cancelText = '취소',
  type = 'primary'
}: ConfirmModalProps) {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose}>
      <div className="confirm-modal-v3 animate-scale-up" onClick={e => e.stopPropagation()}>
        <button className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        <div className="modal-header-icon">
          <div className={`icon-circle ${type}`}>
            <AlertCircle size={32} />
          </div>
        </div>

        <div className="modal-content">
          <h2 className="modal-title">{title}</h2>
          <p className="modal-message">{message}</p>
        </div>

        <div className="modal-actions-v3">
          <button className="modal-btn-cancel" onClick={onClose}>
            {cancelText}
          </button>
          <button className={`modal-btn-confirm ${type}`} onClick={() => {
            onConfirm();
            onClose();
          }}>
            {confirmText}
          </button>
        </div>
      </div>
    </div>
  );
}
