import React, { useState } from 'react';

interface ColorPickerProps {
  value: string;
  onChange: (color: string) => void;
  label?: string;
  inputId?: string;
}

export const ColorPicker: React.FC<ColorPickerProps> = ({ value, onChange, label, inputId }) => {
  const [hexValue, setHexValue] = useState(value);
  const [isValid, setIsValid] = useState(true);

  // Update hex value when prop value changes
  React.useEffect(() => {
    setHexValue(value);
  }, [value]);

  const validateHex = (hex: string): boolean => {
    // Remove # if present
    const cleanHex = hex.replace('#', '');
    // Check if it's a valid hex color (3 or 6 characters, only hex digits)
    return /^[0-9A-Fa-f]{3}$|^[0-9A-Fa-f]{6}$/.test(cleanHex);
  };

  const normalizeHex = (hex: string): string => {
    // Remove # if present
    let cleanHex = hex.replace('#', '');

    // If 3 characters, expand to 6
    if (cleanHex.length === 3) {
      cleanHex = cleanHex.split('').map(char => char + char).join('');
    }

    // Ensure it's 6 characters
    if (cleanHex.length === 6) {
      return '#' + cleanHex.toUpperCase();
    }

    return hex;
  };

  const handleHexChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputValue = e.target.value;
    setHexValue(inputValue);

    if (validateHex(inputValue)) {
      const normalized = normalizeHex(inputValue);
      setIsValid(true);
      onChange(normalized);
    } else if (inputValue === '' || inputValue === '#') {
      setIsValid(true);
    } else {
      setIsValid(false);
    }
  };

  const handleHexPaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text').trim();

    // Remove any whitespace
    const cleanText = pastedText.replace(/\s/g, '');

    if (validateHex(cleanText)) {
      const normalized = normalizeHex(cleanText);
      setHexValue(normalized);
      setIsValid(true);
      onChange(normalized);
    } else {
      setHexValue(cleanText);
      setIsValid(false);
    }
  };

  const handleColorInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newColor = e.target.value;
    setHexValue(newColor);
    setIsValid(true);
    onChange(newColor);
  };

  return (
    <div>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-bold text-gray-700 mb-2">{label}</label>
      )}
      <div className="flex items-center gap-3">
        {/* Circular color swatch button */}
        <div className="relative flex-shrink-0">
          <div
            className="w-9 h-9 rounded-full overflow-hidden cursor-pointer"
            style={{
              width: '36px',
              height: '36px',
              backgroundColor: value,
              borderRadius: '50%'
            }}
          >
            <input
              type="color"
              value={value}
              onChange={handleColorInputChange}
              className="w-full h-full opacity-0 cursor-pointer"
              style={{
                width: '100%',
                height: '100%',
                padding: 0,
                border: 'none',
                margin: 0,
                cursor: 'pointer'
              }}
            />
          </div>
        </div>

        {/* HEX input */}
        <div className="flex-1">
          <input
            id={inputId}
            type="text"
            value={hexValue}
            onChange={handleHexChange}
            onPaste={handleHexPaste}
            placeholder="#000000"
            className={`w-full bg-gray-50 border-none rounded-2xl p-4 text-gray-800 focus:ring-2 focus:ring-brand-primary outline-none ${!isValid ? 'ring-2 ring-red-500' : ''
              }`}
            maxLength={7}
          />
        </div>
      </div>
      {!isValid && (
        <p className="text-xs text-red-500 mt-1">Formato HEX inválido (ex: #FF0000 ou #F00)</p>
      )}
    </div>
  );
};
