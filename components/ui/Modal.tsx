import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] bg-korean-stone/20 backdrop-blur-sm flex items-center justify-center p-4 animate-pop-in" 
      onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="bg-white rounded-[2.5rem] w-full max-w-md shadow-xl border border-korean-border flex flex-col max-h-[90vh]">
        <div className="px-8 py-6 border-b border-korean-border flex justify-between items-center">
          <h3 className="text-xl font-bold text-korean-stone tracking-tight">{title}</h3>
          <button 
            onClick={onClose} 
            className="p-2.5 bg-korean-bg rounded-2xl text-korean-muted hover:bg-korean-sand/30 active:scale-95 transition-all"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="flex-1 overflow-y-auto custom-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};