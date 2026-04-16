import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { ModalSkeleton } from './ModalSkeleton'

const meta: Meta<typeof ModalSkeleton> = {
  title: 'Design System/Primitives/ModalSkeleton',
  component: ModalSkeleton,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof ModalSkeleton>

export const Default: Story = {
  decorators: [
    (Story) => (
      <div className="h-[600px] w-full border border-gray-200 rounded-xl overflow-hidden">
        <Story />
      </div>
    ),
  ],
}

export const Desktop: Story = {
  parameters: { viewport: { defaultViewport: 'desktop' } },
  decorators: [
    (Story) => (
      <div className="h-[700px] w-full border border-gray-200 rounded-xl overflow-hidden">
        <Story />
      </div>
    ),
  ],
}

export const Mobile: Story = {
  parameters: { viewport: { defaultViewport: 'mobile1' } },
  decorators: [
    (Story) => (
      <div className="h-[812px] w-[375px] border border-gray-200 rounded-xl overflow-hidden">
        <Story />
      </div>
    ),
  ],
}
