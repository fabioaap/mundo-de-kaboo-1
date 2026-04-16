import React, { useState, useEffect } from 'react'

export interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  label?: string
}

const validateHex = (hex: string): boolean => {
  const clean = hex.replace('#', '')
  return /^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(clean)
}

const normalizeHex = (hex: string): string => {
  let clean = hex.replace('#', '')
  if (clean.length === 3) clean = clean.split('').map(c => c + c).join('')
  return clean.length === 6 ? '#' + clean.toUpperCase() : hex
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label }) => {
  const [hexValue, setHexValue] = useState(value)
  const [isValid, setIsValid] = useState(true)

  useEffect(() => { setHexValue(value) }, [value])

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const input = e.target.value
    setHexValue(input)
    if (validateHex(input)) {
      setIsValid(true)
      onChange(normalizeHex(input))
    } else if (input === '' || input === '#') {
      setIsValid(true)
    } else {
      setIsValid(false)
    }
  }

  const handleHexPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault()
    const clean = e.clipboardData.getData('text').trim().replace(/\s/g, '')
    if (validateHex(clean)) {
      const normalized = normalizeHex(clean)
      setHexValue(normalized)
      setIsValid(true)
      onChange(normalized)
    } else {
      setHexValue(clean)
      setIsValid(false)
    }
  }

  const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const color = e.target.value
    setHexValue(color)
    setIsValid(true)
    onChange(color)
  }

  return (
    <div>
      {label && (
        <label className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
      )}
      <div className="flex items-center gap-3">
        <div
          className="relative flex-shrink-0 w-9 h-9 rounded-full overflow-hidden cursor-pointer"
          style={{ backgroundColor: value }}
        >
          <input
            type="color"
            value={value}
            onChange={handleColorInputChange}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
        </div>
        <div className="flex-1">
          <input
            type="text"
            value={hexValue}
            onChange={handleHexChange}
            onPaste={handleHexPaste}
            placeholder="#000000"
            maxLength={7}
            className={`w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-kaboo-primary outline-none ${!isValid ? 'ring-2 ring-red-500' : ''
              }`}
          />
        </div>
      </div>
      {!isValid && (
        <p className="text-xs text-red-500 mt-1">Formato HEX inválido (ex: #FF0000 ou #F00)</p>
      )}
    </div>
  )
}
