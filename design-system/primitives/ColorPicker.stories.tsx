import type { Meta, StoryObj } from '@storybook/react'
import React, { useState } from 'react'
import { ColorPicker } from './ColorPicker'

const meta: Meta<typeof ColorPicker> = {
  title: 'Design System/Primitives/ColorPicker',
  component: ColorPicker,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    value: { control: 'color' },
    label: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof ColorPicker>

const Controlled: React.FC<React.ComponentProps<typeof ColorPicker>> = (args) => {
  const [color, setColor] = useState(args.value)
  return (
    <div className="max-w-xs">
      <ColorPicker {...args} value={color} onChange={setColor} />
    </div>
  )
}

export const Default: Story = {
  render: (args) => <Controlled {...args} />,
  args: { value: '#5D1F58' },
}

export const WithLabel: Story = {
  render: (args) => <Controlled {...args} />,
  args: { value: '#4EA8DE', label: 'Cor do Personagem' },
}

export const InvalidColor: Story = {
  render: () => {
    const [color, setColor] = useState('#XYZ')
    return (
      <div className="max-w-xs">
        <ColorPicker value={color} onChange={setColor} label="Valor inválido" />
      </div>
    )
  },
}
