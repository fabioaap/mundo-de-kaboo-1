import React from 'react'
import { AlertCircle } from '../primitives/Icons'
import { Button } from '../primitives/Button'
import { layoutSpacing } from '../layout/spacing'

export interface ConfirmationModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  onConfirm: () => void
  onCancel: () => void
  danger?: boolean
  loading?: boolean
}

export const ConfirmationModal: React.FC<ConfirmationModalProps> = ({
  isOpen,
  title,
  message,
  confirmText = 'Confirmar',
  cancelText = 'Cancelar',
  onConfirm,
  onCancel,
  danger = false,
  loading = false,
}) => {
  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onCancel() }}
    >
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm animate-in fade-in duration-100" />
      <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-100">
        <div className={`${layoutSpacing.modalHeader} border-b border-gray-200`}>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center">
              <AlertCircle size={20} className="text-red-600" />
            </div>
            <h2 className="text-lg font-bold text-gray-800">{title}</h2>
          </div>
        </div>
        <div className={layoutSpacing.modalBody}>
          <p className="text-gray-600">{message}</p>
        </div>
        <div className={`${layoutSpacing.modalFooter} border-t border-gray-200 flex gap-3`}>
          <Button variant="secondary" fullWidth onClick={onCancel} disabled={loading}>
            {cancelText}
          </Button>
          <Button variant={danger ? 'danger' : 'primary'} fullWidth onClick={onConfirm} disabled={loading}>
            {loading ? 'Aguarde...' : confirmText}
          </Button>
        </div>
      </div>
    </div>
  )
}
