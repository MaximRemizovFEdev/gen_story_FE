import React from 'react';

export const RadioGroup = ({ label, name, value, onChange, options }) => (
  <div>
    <label>{label}:</label>
    {options.map(option => (
      <div key={option} style={{ marginBottom: '8px' }}>
        <label>
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={onChange}
          />
          {option}
        </label>
      </div>
    ))}
  </div>
);