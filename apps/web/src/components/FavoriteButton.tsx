import { useState } from 'react';
import type { FavoriteEntity } from '../lib/api';

interface Props {
  entityType: FavoriteEntity['entityType'];
  entityId: string;
  initiallyFollowing: boolean;
  signedIn: boolean;
  label: string;
}

export default function FavoriteButton({
  entityType,
  entityId,
  initiallyFollowing,
  signedIn,
  label,
}: Props) {
  const [following, setFollowing] = useState(initiallyFollowing);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!signedIn) {
    return (
      <a
        href="/entrar"
        className="text-sm border border-border rounded-md px-3 py-1.5 text-ink-muted hover:text-ink hover:border-primary transition-colors"
      >
        Entrar para seguir
      </a>
    );
  }

  const toggle = async () => {
    setBusy(true);
    setError(null);
    const next = !following;
    try {
      const res = await fetch('/api/favoritos', {
        method: next ? 'POST' : 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entityType, entityId }),
      });
      if (!res.ok) throw new Error(String(res.status));
      setFollowing(next);
    } catch {
      setError('No se pudo guardar');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={following}
        className={`text-sm rounded-md px-3 py-1.5 border transition-colors cursor-pointer disabled:opacity-60 ${
          following
            ? 'border-primary bg-primary/10 text-primary'
            : 'border-border text-ink-muted hover:text-ink hover:border-primary'
        }`}
      >
        {following ? `Siguiendo` : `Seguir ${label}`}
      </button>
      {error && <span className="text-xs text-danger">{error}</span>}
    </div>
  );
}
