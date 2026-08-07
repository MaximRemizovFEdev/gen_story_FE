import React from 'react';

export const TextInput = ({ label, name, value, onChange, placeholder, maxLength, required, type = 'text' }) => (
  <div className="form-field">
    <label htmlFor={name}>{label}</label>
    <input
      id={name}
      type={type}
      name={name}
      value={value}
      onChange={onChange}
      maxLength={maxLength}
      required={required}
      placeholder={placeholder}
    />
  </div>
);
