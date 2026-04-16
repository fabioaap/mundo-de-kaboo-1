import type { Meta, StoryObj } from '@storybook/react'
import { Input } from './Input'

const meta: Meta<typeof Input> = {
  title: 'Design System/Primitives/Input',
  component: Input,
  tags: ['autodocs'],
  args: { placeholder: 'Digite aqui...' },
}

export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {}
export const WithLabel: Story = { args: { label: 'Nome completo' } }
export const WithHint: Story  = { args: { label: 'Email', hint: 'Usamos apenas para recuperação de senha', placeholder: 'usuario@email.com' } }
export const WithError: Story = { args: { label: 'Senha', error: 'Mínimo de 8 caracteres', placeholder: '••••••••' } }
export const Disabled: Story  = { args: { label: 'Campo bloqueado', disabled: true, value: 'Valor fixo' } }
