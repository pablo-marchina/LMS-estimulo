"use client";

import { AlertTriangle, CheckCircle2, File, FileText, Image as ImageIcon, X } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatAccept(accept: string) {
  return accept
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => item.replace(/^image\//, "").replace(/^application\//, "").replace(/^\./, "").toUpperCase())
    .filter((item, index, values) => values.indexOf(item) === index)
    .join(", ");
}

type ImageDimensions = { width: number; height: number };
type FilePreview = {
  file: File;
  url: string;
  dimensions: ImageDimensions | null;
  errors: string[];
  warnings: string[];
};

function readImageDimensions(file: File, url: string): Promise<ImageDimensions | null> {
  if (!file.type.startsWith("image/")) return Promise.resolve(null);
  return new Promise((resolve) => {
    const image = new window.Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve(null);
    image.src = url;
  });
}

export function FileUploadPreview({
  name = "file",
  accept,
  required = false,
  label = "Arquivo",
  help,
  className,
  maxSizeBytes,
  recommendedDimensions,
  recommendedAspectRatio,
  minWidth,
  minHeight,
  dimensionPolicy = "warn",
  existingPreviewUrl,
  existingPreviewAlt = "Arquivo atual",
  multiple = false,
  maxFiles,
}: {
  name?: string;
  accept: string;
  required?: boolean;
  label?: string;
  help?: string;
  className?: string;
  maxSizeBytes?: number;
  recommendedDimensions?: string;
  recommendedAspectRatio?: string;
  minWidth?: number;
  minHeight?: number;
  dimensionPolicy?: "warn" | "error";
  existingPreviewUrl?: string | null;
  existingPreviewAlt?: string;
  multiple?: boolean;
  maxFiles?: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [previews, setPreviews] = useState<FilePreview[]>([]);

  useEffect(() => {
    if (!files.length) {
      setPreviews([]);
      inputRef.current?.setCustomValidity("");
      return;
    }

    let cancelled = false;
    const urls = files.map((file) => URL.createObjectURL(file));
    void Promise.all(files.map(async (file, index) => {
      const dimensions = await readImageDimensions(file, urls[index]);
      const errors: string[] = [];
      const warnings: string[] = [];

      if (maxSizeBytes && file.size > maxSizeBytes) errors.push(`O arquivo excede o limite de ${formatBytes(maxSizeBytes)}.`);
      const dimensionMessages: string[] = [];
      if (dimensions && minWidth && dimensions.width < minWidth) dimensionMessages.push(`A largura mínima é ${minWidth}px; a imagem possui ${dimensions.width}px.`);
      if (dimensions && minHeight && dimensions.height < minHeight) dimensionMessages.push(`A altura mínima é ${minHeight}px; a imagem possui ${dimensions.height}px.`);
      if (dimensionPolicy === "error") errors.push(...dimensionMessages);
      else warnings.push(...dimensionMessages);

      return { file, url: urls[index], dimensions, errors, warnings } satisfies FilePreview;
    })).then((next) => {
      if (cancelled) return;
      setPreviews(next);
      const error = next.flatMap((item) => item.errors)[0] ?? "";
      inputRef.current?.setCustomValidity(error);
    });

    return () => {
      cancelled = true;
      urls.forEach((url) => URL.revokeObjectURL(url));
    };
  }, [dimensionPolicy, files, maxSizeBytes, minHeight, minWidth]);

  function updateNativeFiles(nextFiles: File[]) {
    if (!inputRef.current) return;
    const transfer = new DataTransfer();
    nextFiles.forEach((file) => transfer.items.add(file));
    inputRef.current.files = transfer.files;
    inputRef.current.setCustomValidity("");
  }

  function removeFile(index: number) {
    const nextFiles = files.filter((_, currentIndex) => currentIndex !== index);
    updateNativeFiles(nextFiles);
    setFiles(nextFiles);
  }

  const specifications = useMemo(() => [
    `Formatos: ${formatAccept(accept)}`,
    maxSizeBytes ? `Máximo por arquivo: ${formatBytes(maxSizeBytes)}` : null,
    multiple && maxFiles ? `Até ${maxFiles} arquivos` : null,
    recommendedDimensions ? `Dimensão recomendada: ${recommendedDimensions}` : null,
    recommendedAspectRatio ? `Proporção: ${recommendedAspectRatio}` : null,
  ].filter((item): item is string => Boolean(item)), [accept, maxFiles, maxSizeBytes, multiple, recommendedAspectRatio, recommendedDimensions]);

  return (
    <div className={cn("grid min-w-0 max-w-full gap-2", className)}>
      <label className="grid gap-1.5 text-sm font-medium text-ink">
        {label}
        <input
          ref={inputRef}
          name={name}
          type="file"
          accept={accept}
          required={required && !existingPreviewUrl}
          multiple={multiple}
          onChange={(event) => {
            const selected = Array.from(event.currentTarget.files ?? []);
            if (maxFiles && selected.length > maxFiles) {
              event.currentTarget.setCustomValidity(`Selecione no máximo ${maxFiles} arquivos.`);
              event.currentTarget.reportValidity();
              setFiles(selected.slice(0, maxFiles));
              updateNativeFiles(selected.slice(0, maxFiles));
              return;
            }
            event.currentTarget.setCustomValidity("");
            setFiles(selected);
          }}
          className="min-w-0 w-full max-w-full rounded-xl border border-border bg-white px-3 py-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-primary-soft file:px-3 file:py-2 file:text-sm file:font-semibold file:text-primary"
        />
      </label>
      <div className="rounded-xl border border-border bg-surface-muted px-3 py-2 text-xs leading-5 text-muted">
        {specifications.map((item) => <span key={item} className="mr-3 inline-block">{item}</span>)}
        {help ? <span className="inline-block">{help}</span> : null}
      </div>

      {!files.length && existingPreviewUrl ? (
        <div className="overflow-hidden rounded-xl border border-border bg-white">
          <img src={existingPreviewUrl} alt={existingPreviewAlt} className="max-h-80 w-full object-contain p-3" />
          <p className="border-t border-border px-3 py-2 text-xs text-muted">Prévia do arquivo atualmente salvo.</p>
        </div>
      ) : null}

      {previews.length ? (
        <div className="grid gap-3">
          {previews.map((preview, index) => {
            const isImage = preview.file.type.startsWith("image/");
            const isPdf = preview.file.type === "application/pdf";
            const PreviewIcon = isImage ? ImageIcon : isPdf ? FileText : File;
            return (
              <div key={`${preview.file.name}:${preview.file.lastModified}:${index}`} className="overflow-hidden rounded-xl border border-border bg-surface-muted">
                <div className="flex items-center gap-3 border-b border-border bg-white px-4 py-3">
                  <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary"><PreviewIcon size={19} /></span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink">{preview.file.name}</p>
                    <p className="text-xs text-muted">{formatBytes(preview.file.size)} · {preview.file.type || "tipo não identificado"}{preview.dimensions ? ` · ${preview.dimensions.width} × ${preview.dimensions.height}px` : ""}</p>
                  </div>
                  <button type="button" onClick={() => removeFile(index)} className="grid size-9 place-items-center rounded-lg text-muted hover:bg-danger-soft hover:text-danger" aria-label={`Remover ${preview.file.name}`}><X size={17} /></button>
                </div>
                {preview.errors.map((message) => <p key={message} className="flex items-start gap-2 bg-danger-soft px-4 py-2 text-xs font-medium text-danger"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{message}</p>)}
                {preview.warnings.map((message) => <p key={message} className="flex items-start gap-2 bg-warning-soft px-4 py-2 text-xs font-medium text-warning"><AlertTriangle size={15} className="mt-0.5 shrink-0" />{message}</p>)}
                {!preview.errors.length && preview.dimensions ? <p className="flex items-center gap-2 bg-success-soft px-4 py-2 text-xs font-medium text-success"><CheckCircle2 size={15} />Dimensões identificadas e prévia pronta.</p> : null}
                {isImage ? <img src={preview.url} alt={`Prévia de ${preview.file.name}`} className="max-h-80 w-full bg-white object-contain p-3" /> : null}
                {isPdf ? <object data={preview.url} type="application/pdf" className="h-80 w-full bg-white"><p className="p-4 text-sm text-muted">A prévia do PDF não está disponível neste navegador.</p></object> : null}
                {!isImage && !isPdf ? <div className="grid min-h-32 place-items-center p-5 text-center"><div><PreviewIcon className="mx-auto text-primary" size={32} /><p className="mt-2 text-sm font-semibold text-ink">Arquivo pronto para envio</p><p className="mt-1 text-xs text-muted">A prévia visual está disponível para imagens e PDF.</p></div></div> : null}
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
