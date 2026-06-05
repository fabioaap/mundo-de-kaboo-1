import React, { useState } from 'react'
import { Button, Badge, Input, Heading } from '../design-system'

// ─── Section wrapper ──────────────────────────────────────
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="mb-12">
    <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-6 pb-2 border-b border-gray-200">
      {title}
    </h2>
    {children}
  </section>
)

const Row: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="flex flex-wrap items-center gap-4 mb-4">
    <span className="text-xs text-gray-400 w-24 shrink-0">{label}</span>
    {children}
  </div>
)

// ─── Color swatch ─────────────────────────────────────────
const Swatch: React.FC<{ color: string; label: string; value: string }> = ({ color, label, value }) => (
  <div className="flex flex-col items-center gap-1">
    <div className={`w-12 h-12 rounded-xl shadow-sm ${color}`} />
    <span className="text-xs font-medium text-gray-700">{label}</span>
    <span className="text-xs text-gray-400">{value}</span>
  </div>
)

// ─── Main ─────────────────────────────────────────────────
export const DesignSystemScreen: React.FC = () => {
  const [inputValue, setInputValue] = useState('')
  const [inputError, setInputError] = useState('')

  return (
    <div className="min-h-screen bg-brand-bg font-sans">
      {/* Header */}
      <div className="bg-brand-primary text-white px-6 py-8 mb-10">
        <Heading as="h1" size="2xl" className="text-white">Design System</Heading>
        <p className="text-white/70 mt-1 text-sm">Mundo de Kaboo — componentes e tokens</p>
      </div>

      <div className="max-w-2xl mx-auto px-6 pb-16">

        {/* ── Colors ── */}
        <Section title="Colors">
          <div className="flex flex-wrap gap-6">
            <Swatch color="bg-brand-primary" label="primary"  value="#5D1F58" />
            <Swatch color="bg-brand-light"   label="light"    value="#883E82" />
            <Swatch color="bg-brand-bg border border-gray-200" label="bg" value="#F9F5F9" />
            <Swatch color="bg-brand-accent"  label="accent"   value="#4EA8DE" />
            <Swatch color="bg-brand-green"   label="green"    value="#70E000" />
          </div>
        </Section>

        {/* ── Typography ── */}
        <Section title="Typography">
          <div className="space-y-3">
            <Heading as="h1" size="2xl">Heading 2XL — Nunito ExtraBold</Heading>
            <Heading as="h2" size="xl">Heading XL — Nunito Bold</Heading>
            <Heading as="h3" size="lg">Heading LG — Nunito Bold</Heading>
            <Heading as="h4" size="md">Heading MD — Nunito Bold</Heading>
            <Heading as="h5" size="sm">Heading SM — Nunito SemiBold</Heading>
            <p className="text-base text-gray-600">Body — texto regular do app. Nunito, 400.</p>
            <p className="text-sm text-gray-400">Caption — texto pequeno / labels. Nunito, 400.</p>
          </div>
        </Section>

        {/* ── Buttons ── */}
        <Section title="Button">
          <Row label="primary">
            <Button variant="primary">Primary</Button>
            <Button variant="primary" disabled>Disabled</Button>
          </Row>
          <Row label="secondary">
            <Button variant="secondary">Secondary</Button>
            <Button variant="secondary" disabled>Disabled</Button>
          </Row>
          <Row label="ghost">
            <Button variant="ghost">Ghost</Button>
            <Button variant="ghost" disabled>Disabled</Button>
          </Row>
          <Row label="white">
            <div className="bg-brand-primary p-3 rounded-xl">
              <Button variant="white">White</Button>
            </div>
          </Row>
          <Row label="danger">
            <Button variant="danger">Danger</Button>
            <Button variant="danger" disabled>Disabled</Button>
          </Row>
          <Row label="fullWidth">
            <div className="w-full max-w-xs">
              <Button variant="primary" fullWidth>Full Width</Button>
            </div>
          </Row>
        </Section>

        {/* ── Badges ── */}
        <Section title="Badge">
          <Row label="variant">
            <Badge variant="default">Default</Badge>
            <Badge variant="success">Success</Badge>
            <Badge variant="error">Error</Badge>
            <Badge variant="warning">Warning</Badge>
            <Badge variant="info">Info</Badge>
          </Row>
        </Section>

        {/* ── Inputs ── */}
        <Section title="Input">
          <div className="space-y-4 max-w-sm">
            <Input
              label="Nome"
              placeholder="Digite seu nome"
              value={inputValue}
              onChange={e => setInputValue(e.target.value)}
            />
            <Input
              label="Com hint"
              placeholder="usuario@email.com"
              hint="Usamos apenas para recuperação de senha"
            />
            <Input
              label="Com erro"
              placeholder="Digite algo"
              error={inputError || 'Este campo é obrigatório'}
              value={inputError}
              onChange={e => setInputError(e.target.value)}
            />
            <Input
              label="Desabilitado"
              placeholder="Não editável"
              disabled
            />
          </div>
        </Section>

        {/* ── Radius ── */}
        <Section title="Border Radius">
          <div className="flex gap-6 items-end">
            <div className="text-center">
              <div className="w-16 h-16 bg-brand-primary/20 rounded-xl mb-2" />
              <span className="text-xs text-gray-500">xl — 1rem</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-brand-primary/20 rounded-2xl mb-2" />
              <span className="text-xs text-gray-500">2xl — 1.5rem</span>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 bg-brand-primary/20 rounded-3xl mb-2" />
              <span className="text-xs text-gray-500">3xl — 2rem</span>
            </div>
          </div>
        </Section>

      </div>
    </div>
  )
}
