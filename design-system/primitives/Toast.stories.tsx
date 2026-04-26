import type { Meta, StoryObj } from '@storybook/react'
import React, { useState } from 'react'
import { Toast } from './Toast'

const meta: Meta<typeof Toast> = {
  title: 'Design System/Feedback/Toast',
  component: Toast,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    type:     { control: 'select', options: ['success', 'error', 'progress'] },
    message:  { control: 'text' },
    duration: { control: { type: 'number', min: 500, max: 10000, step: 500 } },
    progress: { control: { type: 'range', min: 0, max: 100 }, if: { arg: 'type', eq: 'progress' } },
  },
}

export default meta
type Story = StoryObj<typeof Toast>

// Wrapper interativo para controlar isVisible
const Controlled: React.FC<React.ComponentProps<typeof Toast>> = (args) => {
  const [visible, setVisible] = useState(true)
  return (
    <div className="h-32 relative">
      {!visible && (
        <button
          onClick={() => setVisible(true)}
          className="absolute top-4 left-4 bg-gray-200 text-sm px-3 py-1 rounded"
        >
          Mostrar novamente
        </button>
      )}
      <Toast {...args} isVisible={visible} onClose={() => setVisible(false)} />
    </div>
  )
}

export const Success: Story = {
  render: (args) => <Controlled {...args} />,
  args: { type: 'success', message: 'Operação realizada com sucesso!', isVisible: true },
}

export const Error: Story = {
  render: (args) => <Controlled {...args} />,
  args: { type: 'error', message: 'Ocorreu um erro. Tente novamente.', isVisible: true },
}

export const Progress: Story = {
  render: (args) => <Controlled {...args} />,
  args: { type: 'progress', message: 'Enviando arquivos...', isVisible: true, progress: 65 },
}

export const LongMessage: Story = {
  render: (args) => <Controlled {...args} />,
  args: {
    type: 'success',
    message: 'Sua coleção foi atualizada com sucesso! As alterações estarão disponíveis em breve.',
    isVisible: true,
  },
}
