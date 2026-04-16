import type { Meta, StoryObj } from '@storybook/react'
import React, { useState } from 'react'
import { TagInput } from './TagInput'

const meta: Meta<typeof TagInput> = {
  title: 'Design System/Composites/TagInput',
  component: TagInput,
  tags: ['autodocs'],
  parameters: { layout: 'padded' },
  argTypes: {
    label: { control: 'text' },
    placeholder: { control: 'text' },
  },
}

export default meta
type Story = StoryObj<typeof TagInput>

const Controlled: React.FC<React.ComponentProps<typeof TagInput>> = (args) => {
  const [tags, setTags] = useState<string[]>(args.value ?? [])
  return (
    <div className="max-w-md">
      <TagInput {...args} value={tags} onChange={setTags} />
    </div>
  )
}

export const Empty: Story = {
  render: (args) => <Controlled {...args} />,
  args: { label: 'Habilidades BNCC', value: [] },
}

export const WithTags: Story = {
  render: (args) => <Controlled {...args} />,
  args: {
    label: 'Personagens',
    value: ['Kaboo', 'Luna', 'Zax'],
  },
}

export const ManyTags: Story = {
  render: (args) => <Controlled {...args} />,
  args: {
    label: 'Competências CASEL',
    value: ['Autoconsciência', 'Autogestão', 'Consciência social', 'Habilidades relacionais', 'Tomada de decisão'],
    placeholder: 'Adicionar competência...',
  },
}
