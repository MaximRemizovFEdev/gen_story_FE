import React from 'react';

export const RadioGroup = ({ label, name, value, onChange, options }) => (
  <fieldset className="choice-field">
    <legend>{label}</legend>
    <div className="choice-grid">
      {options.map((option) => (
        <label className={`choice-card ${value === option ? 'is-selected' : ''}`} key={option}>
          <input
            type="radio"
            name={name}
            value={option}
            checked={value === option}
            onChange={onChange}
          />
          <span>{option}</span>
        </label>
      ))}
    </div>
  </fieldset>
);
