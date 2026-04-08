import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'white' | 'danger';
  fullWidth?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = 'primary',
  fullWidth = false,
  className = '',
  ...props
}) => {
  const isDisabled = Boolean(props.disabled);
  const baseStyles = "py-4 px-6 rounded-2xl font-bold transition-all duration-200 active:scale-95 flex items-center justify-center gap-2 shadow-sm";

  const variants = {
    primary: "bg-kaboo-primary text-white hover:bg-opacity-90",
    secondary: "bg-kaboo-primary/10 text-kaboo-primary hover:bg-kaboo-primary/20",
    ghost: "bg-transparent text-gray-600 hover:bg-gray-100 shadow-none",
    white: "bg-white text-kaboo-primary hover:bg-gray-50",
    danger: "bg-red-500 text-white hover:bg-red-600"
  };

  const disabledStyles = isDisabled
    ? "opacity-45 cursor-not-allowed pointer-events-none shadow-none saturate-50"
    : "";

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${disabledStyles} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
};