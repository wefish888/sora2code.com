import { useState } from 'react';
import { copyCode } from '../../lib/stores/codes';

interface Props {
  code: string;
  codeId: string;
  disabled?: boolean;
}

export default function CodeCopyButton({ code, codeId, disabled = false }: Props) {
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleCopy = async () => {
    if (disabled || loading) return;

    setLoading(true);
    try {
      // Copy to clipboard
      await navigator.clipboard.writeText(code);
      setCopied(true);

      // Record copy event to backend
      try {
        await copyCode(codeId);
      } catch (error) {
        console.warn('Failed to record copy event:', error);
        // Don't affect user experience, continue showing copy success
      }

      // Reset state after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
      // Fallback: select text
      try {
        const textArea = document.createElement('textarea');
        textArea.value = code;
        document.body.appendChild(textArea);
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (fallbackError) {
        alert('Copy failed, please manually select and copy the code');
      }
    } finally {
      setLoading(false);
    }
  };

  const buttonText = loading ? 'Copying...' : copied ? '✓ Copied' : 'Copy Code';
  const buttonClass = `
    flex-1 px-4 py-2 rounded-lg font-medium transition-all duration-200
    focus:outline-none focus:ring-2 focus:ring-offset-2
    ${disabled
      ? 'bg-gray-300 text-gray-500 cursor-not-allowed dark:bg-gray-600 dark:text-gray-400'
      : copied
        ? 'bg-green-500 text-white focus:ring-green-500'
        : loading
          ? 'bg-blue-400 text-white cursor-wait'
          : 'bg-primary-600 hover:bg-primary-700 text-white focus:ring-primary-500'
    }
  `;

  return (
    <button
      onClick={handleCopy}
      disabled={disabled || loading}
      className={buttonClass}
      aria-label={disabled ? 'Code has expired' : copied ? 'Code copied' : 'Copy code to clipboard'}
    >
      <div className="flex items-center justify-center gap-2">
        {loading ? (
          <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
        ) : copied ? (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        ) : (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
        <span>{buttonText}</span>
      </div>
    </button>
  );
}