import { useCallback, useState, useRef } from 'react';

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
}

export default function FileUpload({ onFileSelected, isLoading }: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      if (file.type !== 'application/pdf') {
        alert('Please upload a PDF file.');
        return;
      }
      setFileName(file.name);
      onFileSelected(file);
    },
    [onFileSelected],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const onDragLeave = useCallback(() => setIsDragging(false), []);

  const onBrowse = useCallback(() => inputRef.current?.click(), []);

  const onInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onClick={onBrowse}
      className={`
        relative group cursor-pointer select-none
        rounded-2xl border-2 border-dashed
        transition-all duration-300 ease-out
        px-8 py-16 text-center
        ${
          isDragging
            ? 'border-accent bg-accent/5 scale-[1.01] shadow-[0_0_40px_rgba(99,102,241,0.15)]'
            : 'border-border hover:border-border-hover bg-surface-elevated hover:bg-surface-hover'
        }
        ${isLoading ? 'pointer-events-none opacity-60' : ''}
      `}
    >
      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        onChange={onInputChange}
      />

      {/* Icon */}
      <div
        className={`
          mx-auto mb-6 flex h-20 w-20 items-center justify-center
          rounded-2xl transition-all duration-300
          ${isDragging ? 'bg-accent/15 text-accent-glow' : 'bg-surface-hover text-text-secondary group-hover:text-accent'}
        `}
      >
        <svg className="h-10 w-10" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.233-2.33 3 3 0 0 1 3.758 3.848A3.752 3.752 0 0 1 18 19.5H6.75Z" />
        </svg>
      </div>

      {/* Title text */}
      {isLoading ? (
        <div className="space-y-3">
          <div className="flex items-center justify-center gap-3">
            <svg className="h-5 w-5 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
            <span className="text-lg font-semibold text-text-primary">Analyzing document…</span>
          </div>
          <p className="text-sm text-text-muted">Running OCR and AI fraud detection</p>
          {/* Shimmer bar */}
          <div className="mx-auto mt-4 h-1.5 w-48 rounded-full overflow-hidden">
            <div className="shimmer h-full w-full rounded-full" />
          </div>
        </div>
      ) : (
        <>
          <p className="text-lg font-semibold text-text-primary mb-1">
            {fileName ? fileName : 'Drop your offer letter here'}
          </p>
          <p className="text-sm text-text-secondary">
            or <span className="text-accent font-medium underline underline-offset-2">browse files</span> — PDF only
          </p>
        </>
      )}

      {/* Decorative glow on drag */}
      {isDragging && (
        <div className="absolute inset-0 rounded-2xl animate-pulse-ring border-2 border-accent/30 pointer-events-none" />
      )}
    </div>
  );
}
