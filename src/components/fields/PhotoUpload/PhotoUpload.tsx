import React from "react";
import { usePhotoUpload } from "./hooks";
import type { PhotoUploadProps } from "./hooks";

export const PhotoUpload = ({ value, onChange }: PhotoUploadProps) => {
  const {
    inputRef,
    error,
    previewUrl,
    selectFile,
    removeFile,
    openFilePicker,
  } = usePhotoUpload({ value, onChange });

  return (
    <div className="photo-upload">
      <label className="photo-upload__label" htmlFor="child-photo">
        Фото ребёнка (необязательно)
      </label>
      <p className="photo-upload__hint">
        Фото будет преобразовано в рисованного персонажа
      </p>
      {previewUrl ? (
        <div className="photo-upload__preview">
          <img src={previewUrl} alt="Предпросмотр фотографии ребёнка" />
          <div className="photo-upload__actions">
            <button
              type="button"
              className="button button--secondary"
              onClick={openFilePicker}
            >
              Заменить фото
            </button>
            <button
              type="button"
              className="photo-upload__remove"
              onClick={removeFile}
            >
              Удалить
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="photo-upload__select"
          onClick={openFilePicker}
        >
          Выбрать фото
          <small>JPEG, PNG или WebP, до 10 МБ</small>
        </button>
      )}
      <input
        ref={inputRef}
        id="child-photo"
        className="photo-upload__input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={selectFile}
      />
      {error && (
        <p className="field-error" role="alert">
          {error}
        </p>
      )}
    </div>
  );
};
