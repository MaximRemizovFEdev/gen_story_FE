import React from "react";
import type { ChangeEventHandler, ReactNode } from "react";

interface RadioGroupProps {
  label: ReactNode;
  name: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  options: string[];
}

export const RadioGroup = ({
  label,
  name,
  value,
  onChange,
  options,
}: RadioGroupProps) => (
  <fieldset className="choice-field">
    <legend>{label}</legend>
    <div className="choice-grid">
      {options.map((option) => (
        <label
          className={`choice-card ${value === option ? "is-selected" : ""}`}
          key={option}
        >
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
