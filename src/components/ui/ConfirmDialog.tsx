import React from 'react';
import { AlertTriangle, Info } from 'lucide-react';
import Modal from '../Modal';

interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  message: React.ReactNode;
  confirmText?: string;
  cancelText?: string;
  type?: 'danger' | 'info' | 'warning';
  isLoading?: boolean;
}

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = 'Ya, Lanjutkan',
  cancelText = 'Batal',
  type = 'warning',
  isLoading = false
}: ConfirmDialogProps) {
  const Icon = type === 'info' ? Info : AlertTriangle;
  
  const getColors = () => {
    switch (type) {
      case 'danger': return 'bg-red-600 hover:bg-red-700 text-white';
      case 'info': return 'bg-brand-600 hover:bg-brand-700 text-white';
      case 'warning': return 'bg-amber-600 hover:bg-amber-700 text-white';
      default: return 'bg-brand-600 hover:bg-brand-700 text-white';
    }
  };

  const getIconColor = () => {
    switch (type) {
      case 'danger': return 'text-red-600 bg-red-100';
      case 'info': return 'text-brand-600 bg-brand-100';
      case 'warning': return 'text-amber-600 bg-amber-100';
      default: return 'text-brand-600 bg-brand-100';
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={isLoading ? () => {} : onClose} title="">
      <div className="sm:flex sm:items-start p-2">
        <div className={`mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full sm:mx-0 sm:h-10 sm:w-10 ${getIconColor()}`}>
          <Icon className="h-6 w-6" aria-hidden="true" />
        </div>
        <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
          <h3 className="text-base font-semibold leading-6 text-slate-900" id="modal-title">
            {title}
          </h3>
          <div className="mt-2">
            <p className="text-sm text-slate-500">
              {message}
            </p>
          </div>
        </div>
      </div>
      <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse gap-2">
        <button
          type="button"
          disabled={isLoading}
          className={`inline-flex w-full justify-center rounded-md px-3 py-2 text-sm font-semibold shadow-sm sm:w-auto disabled:opacity-50 ${getColors()}`}
          onClick={onConfirm}
        >
          {isLoading ? 'Memproses...' : confirmText}
        </button>
        <button
          type="button"
          disabled={isLoading}
          className="mt-3 inline-flex w-full justify-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50 sm:mt-0 sm:w-auto disabled:opacity-50"
          onClick={onClose}
        >
          {cancelText}
        </button>
      </div>
    </Modal>
  );
}
