import React from 'react';

export const CheckboxGroup = ({ label, name, value, onChange, options, max }) => {
  const handleChange = (e) => {
    onChange({ ...e, target: { ...e.target, name } });
  };

  return (
    <div>
      <label>{label}:</label>
      {options.map(option => (
        <div key={option} style={{ marginBottom: '8px' }}>
          <label>
            <input
              type="checkbox"
              name={name}
              value={option}
              checked={value.includes(option)}
              onChange={handleChange}
            />
            {option}
          </label>
        </div>
      ))}
      {value.length > max && (
        <p style={{ color: 'red' }}>
          Можно выбрать не более {max} {max === 1 ? 'варианта' : 'вариантов'}
        </p>
      )}
    </div>
  );
};