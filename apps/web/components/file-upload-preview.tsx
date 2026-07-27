"use client";

import { File, FileText, Image as ImageIcon, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function FileUploadPreview({
  name = "file",
  accept,
  required = false,
  label = "Arquivo",
  help,
  className,
}: {
  name?: string;
  accept: string;
  required?: boolean;
  label?: string;
  help?: string;
  className?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!file) {
      setPreviewUrl(null);
      return;
    }
    const url = URL.createObjectURL(file);
    setPreviewUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function clearSelection() {
    if (inputRef.current) inputRef.current.value = "";
    setFile(null);
  }

  const isImage = Boolean(file?.type.startsWith("image/"));
  const isPdf = file?.type === "application/pdf";
  const PreviewIcon = isImage ? ImageIcon : isPdf ? FileText : File;

  return (
    <div className={cn("grid gap-2", className)}>
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        {label}
        <input
          ref={inputRef}
          name={name}
          type="file"
          accept={accept}
          required={required}
          onChange={(event) => setFile(event.currentTarget.files?.[0] ?? null)}
          className="rounded-xl border border-border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary"
        />
      </label>
      {help ? <p className="text-xs text-muted">{help}</p> : null}

      {file ? (
        <div className="overflow-hidden rounded-xl border border-border bg-surface-muted">
          <div className="flex items-center gap-3 border-b border-border bg-white px-4 py-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><PreviewIcon size={19} /></span>
            <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold text-ink">{file.name}</p><p className="text-xs text-muted">{formatBytes(file.size)} · {file.type || "tipo não identificado"}</p></div>
            <button type="button" onClick={clearSelection} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger" aria-label="Remover arquivo selecionado"><X size={17} /></button>
          </div>
          {previewUrl && isImage ? <img src={previewUrl} alt={`Prévia de ${file.name}`} className="max-h-80 w-full object-contain bg-white p-3" /> : null}
          {previewUrl && isPdf ? <object data={previewUrl} type="application/pdf" className="h-80 w-full bg-white"><p className="p-4 text-sm text-muted">A prévia do PDF não está disponível neste navegador.</p></object> : null}
          {!isImage && !isPdf ? <div className="grid min-h-32 place-items-center p-5 text-center"><div><PreviewIcon className="mx-auto text-primary" size={32} /><p className="mt-2 text-sm font-semibold text-ink">Arquivo pronto para envio</p><p className="mt-1 text-xs text-muted">A prévia visual está disponível para imagens e PDF.</p></div></div> : null}
        </div>
      ) : null}
    </div>
  );
}