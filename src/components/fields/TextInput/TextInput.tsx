import React from "react";
import type { ChangeEventHandler, HTMLInputTypeAttribute, ReactNode } from "react";

interface TextInputProps {
  label: ReactNode;
  name: string;
  value: string;
  onChange: ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  maxLength?: number;
  required?: boolean;
  type?: HTMLInputTypeAttribute;
}


export const TextInput = ({
  label,
  name,
  value,
  onChange,
  placeholder,
  maxLength,
  required,
  type = "text",
}: TextInputProps) => (
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
