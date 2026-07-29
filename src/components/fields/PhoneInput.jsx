import React from 'react';
import { formatPhone, normalizePhone } from '../../utils/phone';

export const PhoneInput = ({ label, name, value, onChange, required }) => {
  const handleChange = (event) => {
    onChange({
      target: {
        name,
        value: normalizePhone(event.target.value)
      }
    });
  };

  return (
    <div>
      <label htmlFor={name}>{label}:</label>
      <input
        id={name}
        type="tel"
        name={name}
        value={formatPhone(value)}
        onChange={handleChange}
        inputMode="numeric"
        autoComplete="tel"
        maxLength={16}
        required={required}
        placeholder="+7 987 654 32 10"
      />
    </div>
  );
};
