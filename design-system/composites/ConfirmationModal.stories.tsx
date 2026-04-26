import type { Meta, StoryObj } from '@storybook/react'
import React, { useState } from 'react'
import { ConfirmationModal } from './ConfirmationModal'

const meta: Meta<typeof ConfirmationModal> = {
  title: 'Design System/Composites/ConfirmationModal',
  component: ConfirmationModal,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    isOpen: { control: 'boolean' },
    title: { control: 'text' },
    message: { control: 'text' },
    confirmText: { control: 'text' },
    cancelText: { control: 'text' },
    danger: { control: 'boolean' },
    loading: { control: 'boolean' },
    onConfirm: { action: 'confirmed' },
    onCancel: { action: 'cancelled' },
  },
}

export default meta
type Story = StoryObj<typeof ConfirmationModal>

const Controlled: React.FC<React.ComponentProps<typeof ConfirmationModal>> = (args) => {
  const [open, setOpen] = useState(true)
  return (
    <>
      {!open && (
        <button className="m-4 px-4 py-2 bg-gray-200 rounded text-sm" onClick={() => setOpen(true)}>
          Abrir modal
        </button>
      )}
      <ConfirmationModal {...args} isOpen={open} onCancel={() => setOpen(false)} onConfirm={() => setOpen(false)} />
    </>
  )
}

export const Default: Story = {
  render: (args) => <Controlled {...args} />,
  args: {
    isOpen: true,
    title: 'Confirmar ação',
    message: 'Tem certeza que deseja continuar com esta ação?',
  },
}

export const Danger: Story = {
  render: (args) => <Controlled {...args} />,
  args: {
    isOpen: true,
    title: 'Excluir coleção',
    message: 'Esta ação não pode ser desfeita. Todos os arquivos serão removidos permanentemente.',
    confirmText: 'Excluir',
    danger: true,
  },
}

export const Loading: Story = {
  render: (args) => <Controlled {...args} />,
  args: {
    isOpen: true,
    title: 'Processando...',
    message: 'Aguarde enquanto processamos sua solicitação.',
    loading: true,
  },
}

export const CustomLabels: Story = {
  render: (args) => <Controlled {...args} />,
  args: {
    isOpen: true,
    title: 'Publicar coleção',
    message: 'A coleção ficará visível para todos os usuários após a publicação.',
    confirmText: 'Sim, publicar',
    cancelText: 'Não agora',
  },
}
