'use client';

import { useState } from 'react';

export function Expandable({ text, limit = 320 }: { text: string; limit?: number }) {
  const [open, setOpen] = useState(false);
  const long = text.length > limit;
  const shown = open || !long ? text : text.slice(0, limit).replace(/\s+\S*$/, '') + '…';
  return (
    <div className="expand">
      {shown.split(/\n+/).map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {long && (
        <button type="button" className="more" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? 'Свернуть' : 'Читать полностью'}
        </button>
      )}
    </div>
  );
}
