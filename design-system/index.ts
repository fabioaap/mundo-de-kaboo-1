// ─── Primitivos ──────────────────────────────────────────
export { Button } from './primitives/Button'
export { Badge } from './primitives/Badge'
export { Input } from './primitives/Input'
export { Heading } from './primitives/Heading'
export { Toast } from './primitives/Toast'
export { Tabs } from './primitives/Tabs'
export { ColorPicker } from './primitives/ColorPicker'
export { ModalSkeleton } from './primitives/ModalSkeleton'
export { GalaxyBackground } from './primitives/GalaxyBackground'

export type { ButtonProps, ButtonVariant } from './primitives/Button'
export type { BadgeProps } from './primitives/Badge'
export type { InputProps } from './primitives/Input'
export type { HeadingProps } from './primitives/Heading'
export type { ToastProps, ToastType } from './primitives/Toast'
export type { TabsProps, TabItem } from './primitives/Tabs'
export type { ColorPickerProps } from './primitives/ColorPicker'
export type { GalaxyBackgroundProps } from './primitives/GalaxyBackground'

// Re-exports individuais de ícones (lucide-react via DS)
export * from './primitives/Icons'

// ─── Composites ──────────────────────────────────────────
export { PageHeader } from './composites/PageHeader'
export { TagInput } from './composites/TagInput'
export { ConfirmationModal } from './composites/ConfirmationModal'
export { CriticalConfirmationModal } from './composites/CriticalConfirmationModal'

export type { PageHeaderProps } from './composites/PageHeader'
export type { TagInputProps } from './composites/TagInput'
export type { ConfirmationModalProps } from './composites/ConfirmationModal'
export type { CriticalConfirmationModalProps } from './composites/CriticalConfirmationModal'

// ─── Tokens ──────────────────────────────────────────────
export { colors, radius, font, characterColors } from './tokens'

// ─── Utils ───────────────────────────────────────────────
export { cn } from './utils/cn'
