import React, { useState } from 'react';
import { Button } from '../design-system';
import { Icons } from './Icons';
import { layoutSpacing } from '../design-system/layout/spacing';

interface CriticalConfirmationModalProps {
    title: string;
    description: string;
    consequences?: string[];
    confirmLabel?: string;
    cancelLabel?: string;
    onConfirm: (reason: string) => void;
    onCancel: () => void;
}

export const CriticalConfirmationModal: React.FC<CriticalConfirmationModalProps> = ({
    title,
    description,
    consequences,
    confirmLabel = 'Confirmar',
    cancelLabel = 'Cancelar',
    onConfirm,
    onCancel,
}) => {
    const [reason, setReason] = useState('');
    const canConfirm = reason.trim().length >= 3;

    return (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={onCancel}>
            <div role="dialog" aria-modal="true" aria-labelledby="critical-modal-title" className={`bg-white rounded-2xl max-w-lg w-full shadow-xl ${layoutSpacing.modalBody}`} onClick={(e) => e.stopPropagation()}>
                <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-100 flex items-center justify-center flex-shrink-0">
                        <Icons.AlertCircle className="w-5 h-5 text-red-600" />
                    </div>
                    <div>
                        <h2 id="critical-modal-title" className="text-lg font-bold text-gray-800">{title}</h2>
                        <p className="text-sm text-gray-500 mt-1">{description}</p>
                    </div>
                </div>

                {consequences && consequences.length > 0 && (
                    <ul className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4 space-y-1">
                        {consequences.map((c, i) => (
                            <li key={i} className="text-sm text-red-700 flex items-start gap-2">
                                <span className="text-red-400 mt-0.5">•</span>
                                {c}
                            </li>
                        ))}
                    </ul>
                )}

                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                        Motivo (obrigatório) *
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Descreva o motivo desta ação..."
                        rows={2}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none"
                    />
                    {reason.length > 0 && reason.trim().length < 3 && (
                        <p className="text-xs text-red-500 mt-1">Mínimo 3 caracteres.</p>
                    )}
                </div>

                <div className="flex justify-end gap-2">
                    <Button onClick={onCancel} variant="secondary">{cancelLabel}</Button>
                    <Button onClick={() => onConfirm(reason.trim())} variant="danger" disabled={!canConfirm}>
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </div>
    );
};
