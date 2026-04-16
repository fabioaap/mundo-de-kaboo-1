import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import * as LucideIcons from 'lucide-react'

// Apenas os icons usados no projeto
const projectIcons = [
  'Home','Search','Library','User','ChevronLeft','ChevronRight','ChevronDown',
  'MoreHorizontal','Play','Pause','SkipBack','SkipForward','BookOpen','Book',
  'Headphones','Video','Paperclip','Download','FileText','Upload','Settings',
  'LogOut','HelpCircle','Mail','Grid','Volume2','VolumeX','Maximize','Minimize',
  'Eye','EyeOff','X','Filter','Check','Plus','Edit','Trash2','AlertCircle',
  'ExternalLink','RotateCw','Smartphone','Image','ArrowUpDown','ArrowDown',
  'ArrowUp','Ticket',
] as const

interface GalleryProps {
  size: number
  strokeWidth: number
  color: string
}

const Gallery: React.FC<GalleryProps> = ({ size, strokeWidth, color }) => (
  <div className="flex flex-wrap gap-6 p-4">
    {projectIcons.map((name) => {
      const Icon = (LucideIcons as Record<string, React.FC<{ size: number; strokeWidth: number; color: string }>>)[name]
      if (!Icon) return null
      return (
        <div key={name} className="flex flex-col items-center gap-2 w-20">
          <Icon size={size} strokeWidth={strokeWidth} color={color} />
          <span className="text-[10px] text-gray-500 text-center leading-tight">{name}</span>
        </div>
      )
    })}
  </div>
)

const meta: Meta<GalleryProps> = {
  title: 'Design System/Primitives/Icons',
  component: Gallery,
  tags: ['autodocs'],
  args: { size: 24, strokeWidth: 1.5, color: 'currentColor' },
  argTypes: {
    size:        { control: { type: 'select' }, options: [16, 20, 24, 32] },
    strokeWidth: { control: { type: 'range', min: 1, max: 3, step: 0.5 } },
    color:       { control: 'color' },
  },
}

export default meta
type Story = StoryObj<GalleryProps>

export const AllIcons: Story = {}

export const Small: Story  = { args: { size: 16 } }
export const Large: Story  = { args: { size: 32 } }
export const Thin: Story   = { args: { size: 24, strokeWidth: 1 } }
export const Kaboo: Story  = { args: { color: '#5D1F58' } }
