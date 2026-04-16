import React from 'react'
import { cn } from '../utils/cn'

type HeadingLevel = 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6'

export interface HeadingProps extends React.HTMLAttributes<HTMLHeadingElement> {
  as?: HeadingLevel
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl'
}

const sizeClasses = {
  xs:  'text-sm  font-semibold',
  sm:  'text-base font-semibold',
  md:  'text-lg  font-bold',
  lg:  'text-xl  font-bold',
  xl:  'text-2xl font-bold',
  '2xl': 'text-3xl font-extrabold',
}

export const Heading: React.FC<HeadingProps> = ({
  as: Tag = 'h2',
  size = 'lg',
  className,
  children,
  ...props
}) => (
  <Tag
    className={cn('text-gray-900 leading-tight', sizeClasses[size], className)}
    {...props}
  >
    {children}
  </Tag>
)
