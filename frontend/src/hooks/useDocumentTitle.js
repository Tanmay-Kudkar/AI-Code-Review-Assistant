import { useEffect } from 'react';

export function useDocumentTitle(title) {
  useEffect(() => {
    document.title = title ? `${title} | AI Code Review Assistant` : 'AI Code Review Assistant';
  }, [title]);
}
