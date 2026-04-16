import type { Meta, StoryObj } from '@storybook/react'
import React from 'react'
import { Input } from './Input'

const meta: Meta<typeof Input> = {
  title: 'Design System/Primitives/Input',
  component: Input,
  tags: ['autodocs'],
  parameters: { layout: 'centered' },
  args: { placeholder: 'Digite aqui...' },
}

export default meta
type Story = StoryObj<typeof Input>

export const Default: Story = {}
export const WithLabel: Story = { args: { label: 'Nome completo' } }
export const WithHint: Story  = { args: { label: 'Email', hint: 'Usamos apenas para recuperação de senha', placeholder: 'usuario@email.com' } }
export const WithError: Story = { args: { label: 'Senha', error: 'Mínimo de 8 caracteres', placeholder: '••••••••' } }
export const Disabled: Story  = { args: { label: 'Campo bloqueado', disabled: true, value: 'Valor fixo' } }

export const AllVariants: Story = {
  parameters: { layout: 'padded' },
  render: () => (
    <div className="flex flex-col gap-4 w-80">
      <Input placeholder="Default" />
      <Input label="Com label" placeholder="Digite aqui..." />
      <Input label="Com hint" hint="Texto de apoio abaixo do campo" placeholder="usuario@email.com" />
      <Input label="Com erro" error="Campo obrigatório" placeholder="••••••••" />
      <Input label="Desabilitado" disabled value="Valor fixo" />
    </div>
  ),
}
