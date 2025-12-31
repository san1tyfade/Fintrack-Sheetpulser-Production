
import { useState, useEffect } from 'react';
import { validateSheetTab } from '../services/sheetService';

export type ValidationStatus = 'idle' | 'checking' | 'valid' | 'invalid';

export const useTabValidation = (sheetId: string, value: string): ValidationStatus => {
  const [status, setStatus] = useState<ValidationStatus>('idle');

  useEffect(() => {
    if (!sheetId || !value) {
      setStatus('idle');
      return;
    }

    const timer = setTimeout(async () => {
      setStatus('checking');
      try {
        const isValid = await validateSheetTab(sheetId, value);
        setStatus(isValid ? 'valid' : 'invalid');
      } catch {
        setStatus('invalid');
      }
    }, 800);

    return () => clearTimeout(timer);
  }, [value, sheetId]);

  return status;
};
