import type { Meta, StoryObj } from '@storybook/react'
import React, { useState } from 'react'
import { Tabs } from './Tabs'

const meta: Meta<typeof Tabs> = {
  title: 'Design System/Primitives/Tabs',
  component: Tabs,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
}

export default meta
type Story = StoryObj<typeof Tabs>

const Controlled: React.FC<React.ComponentProps<typeof Tabs>> = (args) => {
  const [active, setActive] = useState(args.activeTab ?? args.tabs[0]?.id ?? '')
  return <Tabs {...args} activeTab={active} onChange={setActive} />
}

export const Default: Story = {
  render: (args) => <Controlled {...args} />,
  args: {
    tabs: [
      { id: 'overview', label: 'Visão Geral' },
      { id: 'content', label: 'Conteúdo' },
      { id: 'settings', label: 'Configurações' },
    ],
    activeTab: 'overview',
  },
}

export const ManyTabs: Story = {
  render: (args) => <Controlled {...args} />,
  args: {
    tabs: [
      { id: 'a', label: 'Geral' },
      { id: 'b', label: 'Detalhes' },
      { id: 'c', label: 'Mídias' },
      { id: 'd', label: 'Personagens' },
      { id: 'e', label: 'Habilidades' },
      { id: 'f', label: 'Estatísticas' },
    ],
    activeTab: 'a',
  },
}

export const LongLabels: Story = {
  render: (args) => <Controlled {...args} />,
  args: {
    tabs: [
      { id: 'intro', label: 'Introdução ao Conteúdo' },
      { id: 'bncc', label: 'Habilidades BNCC' },
      { id: 'casel', label: 'Competências CASEL' },
    ],
    activeTab: 'intro',
  },
}
