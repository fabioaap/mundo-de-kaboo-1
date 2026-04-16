import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { PageHeader } from './PageHeader'

const meta: Meta<typeof PageHeader> = {
  title: 'Design System/Composites/PageHeader',
  component: PageHeader,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    title: { control: 'text' },
    onBack: { action: 'back clicked' },
    className: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof PageHeader>

export const Default: Story = {
  args: { title: 'Minhas Coleções', onBack: undefined },
}

export const WithBack: Story = {
  args: { title: 'Detalhes da Coleção', onBack: () => { } },
}

export const WithRightContent: Story = {
  args: {
    title: 'Coleções',
    onBack: () => { },
    rightContent: (
      <button className="px-4 py-2 bg-kaboo-primary text-white rounded-xl text-sm font-bold">
        + Nova
      </button>
    ),
  },
}

export const LongTitle: Story = {
  args: {
    title: 'Configurações de Perfil e Privacidade do Usuário',
    onBack: () => { },
  },
}
