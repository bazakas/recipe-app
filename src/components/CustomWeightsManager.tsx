"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addCustomWeight, deleteCustomWeight } from "@/lib/actions";

type Weight = { id: string; name: string; gramsPerCup: number };

export function CustomWeightsManager({ weights }: { weights: Weight[] }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [grams, setGrams] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setPending(true);
    const res = await addCustomWeight(name, Number(grams));
    setPending(false);
    if (res.ok) {
      setName("");
      setGrams("");
      router.refresh();
    } else setError(res.error);
  }

  async function remove(id: string) {
    const res = await deleteCustomWeight(id);
    if (res.ok) router.refresh();
    else alert(res.error);
  }

  return (
    <div className="mt-6 flex flex-col gap-6">
      <form onSubmit={add} className="flex flex-wrap items-end gap-2 rounded-xl border border-line bg-surface p-4">
        <label className="flex flex-1 flex-col gap-1.5">
          <span className="label-caps">Ingredient</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Matcha powder"
            className="field-input"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label-caps">Grams per cup</span>
          <input
            type="number"
            step="any"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            placeholder="120"
            className="field-input w-32"
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-accent-fg disabled:opacity-60"
        >
          {pending ? "Saving…" : "Add"}
        </button>
        {error && <p className="w-full text-sm text-hot">{error}</p>}
      </form>

      {weights.length === 0 ? (
        <p className="text-sm text-muted">No custom weights yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line rounded-xl border border-line">
          {weights.map((w) => (
            <li key={w.id} className="flex items-center gap-3 px-4 py-3">
              <span className="flex-1 text-[15px]">{w.name}</span>
              <span className="tnum text-sm text-muted">{w.gramsPerCup} g / cup</span>
              <button
                onClick={() => remove(w.id)}
                className="text-xs text-hot hover:underline"
              >
                Remove
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
