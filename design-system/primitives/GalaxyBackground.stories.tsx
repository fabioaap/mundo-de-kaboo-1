import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { GalaxyBackground } from './GalaxyBackground'

const meta: Meta<typeof GalaxyBackground> = {
  title: 'Design System/Primitives/GalaxyBackground',
  component: GalaxyBackground,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  argTypes: {
    density: { control: { type: 'range', min: 0.1, max: 1, step: 0.1 } },
    className: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof GalaxyBackground>

const Wrapper: React.FC<React.ComponentProps<typeof GalaxyBackground>> = (args) => (
  <div className="relative w-full h-64 bg-[#3B0A59] rounded-xl overflow-hidden">
    <GalaxyBackground {...args} />
    <div className="absolute inset-0 flex items-center justify-center z-10">
      <p className="text-white font-bold text-lg opacity-60">Mundo de Kaboo</p>
    </div>
  </div>
)

export const Default: Story = {
  render: (args) => <Wrapper {...args} />,
  args: { density: 0.4 },
}

export const LowDensity: Story = {
  render: (args) => <Wrapper {...args} />,
  args: { density: 0.1 },
}

export const HighDensity: Story = {
  render: (args) => <Wrapper {...args} />,
  args: { density: 0.9 },
}
