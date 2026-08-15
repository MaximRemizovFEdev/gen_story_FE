import React, { useEffect, useRef, useState } from 'react';

const MAX_PHOTO_SIZE = 10 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

export const PhotoUpload = ({ value, onChange }) => {
  const inputRef = useRef(null);
  const [error, setError] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');

  useEffect(() => {
    if (!value) {
      setPreviewUrl('');
      return undefined;
    }
    const objectUrl = URL.createObjectURL(value);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [value]);

  const selectFile = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      setError('Выберите фотографию в формате JPEG, PNG или WebP.');
      event.target.value = '';
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setError('Размер фотографии не должен превышать 10 МБ.');
      event.target.value = '';
      return;
    }
    setError('');
    onChange(file);
  };

  const removeFile = () => {
    setError('');
    onChange(null);
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="photo-upload">
      <label className="photo-upload__label" htmlFor="child-photo">Фото ребёнка (необязательно)</label>
      <p className="photo-upload__hint">Фото будет преобразовано в рисованного персонажа</p>
      {previewUrl ? (
        <div className="photo-upload__preview">
          <img src={previewUrl} alt="Предпросмотр фотографии ребёнка" />
          <div className="photo-upload__actions">
            <button type="button" className="button button--secondary" onClick={() => inputRef.current?.click()}>Заменить фото</button>
            <button type="button" className="photo-upload__remove" onClick={removeFile}>Удалить</button>
          </div>
        </div>
      ) : (
        <button type="button" className="photo-upload__select" onClick={() => inputRef.current?.click()}>
          Выбрать фото
          <small>JPEG, PNG или WebP, до 10 МБ</small>
        </button>
      )}
      <input ref={inputRef} id="child-photo" className="photo-upload__input" type="file" accept="image/jpeg,image/png,image/webp" onChange={selectFile} />
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
};
