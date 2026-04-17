import type { Meta, StoryObj } from '@storybook/react'
import { Heading } from './Heading'

const meta: Meta<typeof Heading> = {
  title: 'Design System/Primitives/Heading',
  component: Heading,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  args: { children: 'Mundo de Kaboo' },
  argTypes: {
    as: { control: 'select', options: ['h1', 'h2', 'h3', 'h4', 'h5', 'h6'] },
    size: { control: 'select', options: ['xs', 'sm', 'md', 'lg', 'xl', '2xl'] },
  },
}

export default meta
type Story = StoryObj<typeof Heading>

export const Default: Story = {}
export const Scale: Story = {
  render: () => (
    <div className="space-y-2">
      <Heading size="2xl">Heading 2XL</Heading>
      <Heading size="xl">Heading XL</Heading>
      <Heading size="lg">Heading LG</Heading>
      <Heading size="md">Heading MD</Heading>
      <Heading size="sm">Heading SM</Heading>
      <Heading size="xs">Heading XS</Heading>
    </div>
  ),
}
