import type { Meta, StoryObj } from '@storybook/react'
import React, { useState } from 'react'
import { CriticalConfirmationModal } from './CriticalConfirmationModal'

const meta: Meta<typeof CriticalConfirmationModal> = {
  title: 'Design System/Composites/CriticalConfirmationModal',
  component: CriticalConfirmationModal,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    title: { control: 'text' },
    description: { control: 'text' },
    confirmLabel: { control: 'text' },
    cancelLabel: { control: 'text' },
    onConfirm: { action: 'confirmed' },
    onCancel: { action: 'cancelled' },
  },
}

export default meta
type Story = StoryObj<typeof CriticalConfirmationModal>

const Controlled: React.FC<React.ComponentProps<typeof CriticalConfirmationModal>> = (args) => {
  const [open, setOpen] = useState(true)
  return (
    <>
      {!open && (
        <button className="m-4 px-4 py-2 bg-gray-200 rounded text-sm" onClick={() => setOpen(true)}>
          Abrir modal crítico
        </button>
      )}
      {open && (
        <CriticalConfirmationModal
          {...args}
          onCancel={() => setOpen(false)}
          onConfirm={() => setOpen(false)}
        />
      )}
    </>
  )
}

export const Default: Story = {
  render: (args) => <Controlled {...args} />,
  args: {
    title: 'Excluir conta',
    description: 'Esta ação é irreversível. Por favor, informe o motivo antes de continuar.',
    confirmLabel: 'Excluir conta',
  },
}

export const WithConsequences: Story = {
  render: (args) => <Controlled {...args} />,
  args: {
    title: 'Remover coleção publicada',
    description: 'Você está prestes a remover uma coleção que já está em uso por alunos.',
    consequences: [
      'Todos os alunos perderão acesso imediatamente',
      'O progresso dos alunos será perdido',
      'Esta ação não pode ser revertida',
    ],
    confirmLabel: 'Remover mesmo assim',
  },
}
