import { useState, useCallback } from 'react';

interface TextInputProps {
  onSubmit: (text: string) => void;
  isLoading: boolean;
}

export default function TextInput({ onSubmit, isLoading }: TextInputProps) {
  const [text, setText] = useState('');

  const handleSubmit = useCallback(() => {
    const trimmed = text.trim();
    if (trimmed.length < 20) {
      alert('Please paste at least 20 characters of text.');
      return;
    }
    onSubmit(trimmed);
  }, [text, onSubmit]);

  const charCount = text.trim().length;
  const isValid = charCount >= 20;

  return (
    <div className="space-y-4">
      {/* Textarea */}
      <div className="relative group">
        <textarea
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={isLoading}
          placeholder="Paste the full text of your offer letter here…"
          rows={10}
          className={`
            w-full rounded-2xl border-2 border-dashed
            bg-surface-elevated text-text-primary placeholder-text-muted
            px-5 py-4 text-sm leading-relaxed font-mono
            resize-y transition-all duration-300
            focus:outline-none focus:ring-0
            ${isLoading
              ? 'opacity-60 pointer-events-none border-border'
              : 'border-border hover:border-border-hover focus:border-accent'
            }
          `}
        />
        {/* Character count */}
        <span className={`absolute bottom-3 right-4 text-xs tabular-nums ${isValid ? 'text-text-muted' : 'text-warning'}`}>
          {charCount} chars {!isValid && charCount > 0 && '(min 20)'}
        </span>
      </div>

      {/* Submit button */}
      {isLoading ? (
        <div className="flex items-center justify-center gap-3 py-4">
          <svg className="h-5 w-5 animate-spin text-accent" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <span className="text-sm text-text-secondary">Analyzing text…</span>
        </div>
      ) : (
        <button
          onClick={handleSubmit}
          disabled={!isValid}
          className={`
            w-full rounded-xl py-3.5 text-sm font-semibold
            transition-all duration-200
            ${isValid
              ? 'bg-accent text-white hover:bg-accent-glow active:scale-[0.98] shadow-lg shadow-accent/20'
              : 'bg-surface-hover text-text-muted cursor-not-allowed'
            }
          `}
        >
          🔍 Analyze Text
        </button>
      )}
    </div>
  );
}
