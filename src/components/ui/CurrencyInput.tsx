import React, { useState, useEffect } from 'react';

interface CurrencyInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'onChange' | 'value' | 'type'> {
  value: number | '';
  onChange: (value: number) => void;
}

export const CurrencyInput: React.FC<CurrencyInputProps> = ({ value, onChange, className, ...props }) => {
  const [displayValue, setDisplayValue] = useState<string>('');

  useEffect(() => {
    if (value === '' || value === undefined || value === null) {
      setDisplayValue('');
    } else if (value === 0) {
      // Supaya 0 bisa diketik
      setDisplayValue(prev => prev === '' ? '0' : prev);
    } else {
      setDisplayValue(Number(value).toLocaleString('id-ID'));
    }
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    
    const numericStr = rawVal.replace(/[^0-9]/g, '');
    
    if (numericStr === '') {
      setDisplayValue('');
      onChange(0); 
      return;
    }

    const numericVal = parseInt(numericStr, 10);
    setDisplayValue(numericVal.toLocaleString('id-ID'));
    onChange(numericVal);
  };

  return (
    <input
      type="text"
      inputMode="numeric"
      value={displayValue}
      onChange={handleChange}
      className={className}
      {...props}
    />
  );
};
