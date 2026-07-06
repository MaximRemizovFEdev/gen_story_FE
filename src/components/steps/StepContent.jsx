import React from 'react';
import { TextInput } from '../fields/TextInput';
import { RadioGroup } from '../fields/RadioGroup';
import { CheckboxGroup } from '../fields/CheckboxGroup';
import { ageOptions, heroOptions, adventureOptions, atmosphereOptions, interestsOptions } from '../../config/options';

export const StepContent = ({ currentField, form, handleChange }) => {
  switch (currentField) {
    case 'phone':
      return (
        <TextInput
          label="Телефон"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          maxLength="120"
          required
          placeholder="Введите телефон"
        />
      );
    case 'childName':
      return (
        <TextInput
          label="Имя ребенка"
          name="childName"
          value={form.childName}
          onChange={handleChange}
          maxLength="120"
          required
          placeholder="Введите имя"
        />
      );
    case 'age':
      return (
        <RadioGroup
          label="Возраст"
          name="age"
          value={form.age}
          onChange={handleChange}
          options={ageOptions}
        />
      );
    case 'hero':
      return (
        <>
          <RadioGroup
            label="Главный герой"
            name="hero"
            value={form.hero}
            onChange={handleChange}
            options={heroOptions}
          />
          {form.hero === 'Свой вариант' && (
            <TextInput
              label="Ваш вариант героя"
              name="heroCustom"
              value={form.heroCustom}
              onChange={handleChange}
              maxLength="120"
              placeholder="Введите вариант"
            />
          )}
        </>
      );
    case 'adventure':
      return (
        <>
          <RadioGroup
            label="Приключение"
            name="adventure"
            value={form.adventure}
            onChange={handleChange}
            options={adventureOptions}
          />
          {form.adventure === 'Свой вариант' && (
            <TextInput
              label="Ваш вариант приключения"
              name="adventureCustom"
              value={form.adventureCustom}
              onChange={handleChange}
              maxLength="120"
              placeholder="Введите вариант"
            />
          )}
        </>
      );
    case 'atmosphere':
      return (
        <RadioGroup
          label="Атмосфера сказки"
          name="atmosphere"
          value={form.atmosphere}
          onChange={handleChange}
          options={atmosphereOptions}
        />
      );
    case 'interests':
      return (
        <CheckboxGroup
          label="Интересы (максимум 3)"
          name="interests"
          value={form.interests}
          onChange={handleChange}
          options={interestsOptions}
          max={3}
        />
      );
    default:
      return null;
  }
};