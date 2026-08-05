"use client";

import { File, FileText, Image as ImageIcon, Info, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function StandardizedFileUpload({
  name,
  accept,
  label,
  required = false,
  maxSizeMb,
  recommendedDimensions,
  recommendedRatio,
  currentPreviewUrl,
  currentPreviewAlt = "Arquivo atual",
  help,
  className,
}: {
  name: string;
  accept: string;
  label: string;
  required?: boolean;
  maxSizeMb: number;
  recommendedDimensions?: string;
  recommendedRatio?: string;
  currentPreviewUrl?: string | null;
  currentPreviewAlt?: string;
  help?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [dimensions, setDimensions] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      setDimensions(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function selectFile(selected: File | null) {
    const input = inputRef.current;
    if (!selected) {
      input?.setCustomValidity("");
      setError(null);
      setFile(null);
      return;
    }
    const tooLarge = selected.size > maxSizeMb * 1024 * 1024;
    const message = tooLarge ? `O arquivo excede o limite de ${maxSizeMb} MB.` : "";
    input?.setCustomValidity(message);
    setError(message || null);
    setFile(selected);
  }

  function clearSelection() {
    if (inputRef.current) {
      inputRef.current.value = "";
      inputRef.current.setCustomValidity("");
    }
    setFile(null);
    setError(null);
  }

  const isImage = Boolean(file?.type.startsWith("image/"));
  const isPdf = file?.type === "application/pdf";
  const PreviewIcon = isImage ? ImageIcon : isPdf ? FileText : File;
  const specifications = [
    `Formatos: ${accept}`,
    `Máximo: ${maxSizeMb} MB`,
    recommendedDimensions ? `Dimensões recomendadas: ${recommendedDimensions}` : null,
    recommendedRatio ? `Proporção recomendada: ${recommendedRatio}` : null,
  ].filter(Boolean).join(" · ");

  return (
    <div className={cn("grid gap-2", className)}>
      {currentPreviewUrl && !file ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface-muted">
          <p className="border-b border-border bg-white px-4 py-2 text-xs font-semibold text-muted">Arquivo atual</p>
          <img src={currentPreviewUrl} alt={currentPreviewAlt} className="max-h-80 w-full bg-white object-contain p-3" />
        </div>
      ) : null}

      <label className="grid gap-1.5 text-sm font-medium text-ink">
        {label}
        <input
          ref={inputRef}
          name={name}
          type="file"
          accept={accept}
          required={required}
          onChange={(event) => selectFile(event.currentTarget.files?.[0] ?? null)}
          className="rounded-xl border border-border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary"
        />
      </label>

      <div className="flex gap-2 rounded-lg bg-primary-soft/55 px-3 py-2 text-xs leading-5 text-muted">
        <Info className="mt-0.5 shrink-0 text-primary" size={15} />
        <span>{specifications}</span>
      </div>
      {help ? <p className="text-xs text-muted">{help}</p> : null}
      {error ? <p className="text-xs font-semibold text-danger">{error}</p> : null}

      {file ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface-muted">
          <div className="flex items-center gap-3 border-b border-border bg-white px-4 py-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><PreviewIcon size={19} /></span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-ink">{file.name}</p>
              <p className="text-xs text-muted">{formatBytes(file.size)} · {file.type || "tipo não identificado"}{dimensions ? ` · ${dimensions}` : ""}</p>
            </div>
            <button type="button" onClick={clearSelection} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger" aria-label="Remover arquivo selecionado"><X size={17} /></button>
          </div>
          {previewUrl && isImage ? <img src={previewUrl} alt={`Prévia de ${file.name}`} className="max-h-80 w-full bg-white object-contain p-3" onLoad={(event) => setDimensions(`${event.currentTarget.naturalWidth} × ${event.currentTarget.naturalHeight} px`)} /> : null}
          {previewUrl && isPdf ? <object data={previewUrl} type="application/pdf" className="h-80 w-full bg-white"><p className="p-4 text-sm text-muted">A prévia do PDF não está disponível neste navegador.</p></object> : null}
        </div>
      ) : null}
    </div>
  );
}
