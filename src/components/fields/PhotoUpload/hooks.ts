import { useEffect, useRef, useState } from "react";
import type { ChangeEvent } from "react";

const MAX_PHOTO_SIZE = 10 * 1024 * 1024;
const ACCEPTED_PHOTO_TYPES = ["image/jpeg", "image/png", "image/webp"];

export interface PhotoUploadProps {
  value: File | null;
  onChange: (file: File | null) => void;
}

export const usePhotoUpload = ({ value, onChange }: PhotoUploadProps) => {
  const selectFile = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!ACCEPTED_PHOTO_TYPES.includes(file.type)) {
      setError("Выберите фотографию в формате JPEG, PNG или WebP.");
      event.target.value = "";
      return;
    }
    if (file.size > MAX_PHOTO_SIZE) {
      setError("Размер фотографии не должен превышать 10 МБ.");
      event.target.value = "";
      return;
    }
    setError("");
    onChange(file);
  };

  const removeFile = () => {
    setError("");
    onChange(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const openFilePicker = () => inputRef.current?.click();

  const inputRef = useRef<HTMLInputElement | null>(null);
  const [error, setError] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");

  useEffect(() => {
    if (!value) {
      setPreviewUrl("");
      return undefined;
    }
    const objectUrl = URL.createObjectURL(value);
    setPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [value]);

  return {
    inputRef,
    error,
    previewUrl,
    selectFile,
    removeFile,
    openFilePicker,
  };
};
