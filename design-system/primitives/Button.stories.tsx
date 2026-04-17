import type { Meta, StoryObj } from '@storybook/react'
import { Button } from './Button'

const meta: Meta<typeof Button> = {
  title: 'Design System/Primitives/Button',
  component: Button,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  args: { children: 'Button' },
  argTypes: {
    variant: {
      control: 'select',
      options: ['primary', 'secondary', 'ghost', 'white', 'danger'],
    },
  },
}

export default meta
type Story = StoryObj<typeof Button>

export const Primary: Story = { args: { variant: 'primary' } }
export const Secondary: Story = { args: { variant: 'secondary' } }
export const Ghost: Story = { args: { variant: 'ghost' } }
export const White: Story = {
  args: { variant: 'white' },
  decorators: [(Story) => <div className="bg-brand-primary p-6 inline-block rounded-2xl"><Story /></div>],
}
export const Danger: Story = { args: { variant: 'danger' } }
export const Disabled: Story = { args: { variant: 'primary', disabled: true } }
export const FullWidth: Story = { args: { variant: 'primary', fullWidth: true } }

export const AllVariants: Story = {
  render: () => (
    <div className="flex flex-wrap gap-3">
      <Button variant="primary">Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
      <Button variant="primary" disabled>Disabled</Button>
    </div>
  ),
}
