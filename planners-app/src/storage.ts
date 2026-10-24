/* Per-viewer form memory. Best effort: private windows may refuse storage. */
import { useEffect, useState } from 'react';

const KEY = 'planners:v2';

function readAll(): Record<string, unknown> {
    try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') ?? {}; } catch { return {}; }
}

export function useStored<T>(name: string, initial: T): [T, (v: T) => void] {
    const [value, setValue] = useState<T>(() => (readAll()[name] as T | undefined) ?? initial);
    useEffect(() => {
        try { localStorage.setItem(KEY, JSON.stringify({ ...readAll(), [name]: value })); } catch { /* ignore */ }
    }, [name, value]);
    return [value, setValue];
}
