import { useState } from 'react';

export function useHoneypot() {
  const [value, setValue] = useState('');
  return { value, setValue };
}

/** Off-screen field that real users never fill. Bots that autofill it are dropped. */
export function Honeypot({ value, setValue }: { value: string; setValue: (v: string) => void }) {
  return (
    <div aria-hidden className="absolute left-[-9999px] top-[-9999px] h-0 w-0 overflow-hidden" tabIndex={-1}>
      <label>
        Leave this field empty
        <input type="text" autoComplete="off" tabIndex={-1} value={value} onChange={(e) => setValue(e.target.value)} />
      </label>
    </div>
  );
}
