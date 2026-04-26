import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/** Utilitário para compor classes Tailwind sem conflitos */
export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs))
