import React from 'react';
import { TextInput } from '../fields/TextInput';
import { RadioGroup } from '../fields/RadioGroup';
import { CheckboxGroup } from '../fields/CheckboxGroup';
import { PhoneInput } from '../fields/PhoneInput';
import { PhotoUpload } from '../fields/PhotoUpload';
import { ageOptions, heroOptions, adventureOptions, atmosphereOptions, interestsOptions } from '../../config/options';

export const StepContent = ({ currentField, form, handleChange }) => {
  switch (currentField) {
    case 'phone':
      return (
        <PhoneInput
          label="Телефон"
          name="phone"
          value={form.phone}
          onChange={handleChange}
          required
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
    case 'ageGroup':
      return (
        <RadioGroup
          label="Возраст"
          name="ageGroup"
          value={form.ageGroup}
          onChange={handleChange}
          options={ageOptions}
        />
      );
    case 'heroType':
      return (
        <>
          <RadioGroup
            label="Главный герой"
            name="heroType"
            value={form.heroType}
            onChange={handleChange}
            options={heroOptions}
          />
          {form.heroType === 'Свой вариант' && (
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
    case 'adventureGoal':
      return (
        <>
          <RadioGroup
            label="Приключение"
            name="adventureGoal"
            value={form.adventureGoal}
            onChange={handleChange}
            options={adventureOptions}
          />
          {form.adventureGoal === 'Свой вариант' && (
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
    case 'storyMood':
      return (
        <RadioGroup
          label="Атмосфера сказки"
          name="storyMood"
          value={form.storyMood}
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
    case 'childPhoto':
      return (
        <PhotoUpload
          value={form.childPhoto}
          onChange={(file) => handleChange({ target: { name: 'childPhoto', value: file } })}
        />
      );
    default:
      return null;
  }
};
