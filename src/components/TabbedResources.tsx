import { useState, type ReactNode } from 'react';
import { ResourceManager, type ResourceConfig } from './ResourceManager';

interface Tab {
  key: string;
  label: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  config: ResourceConfig<any>;
}

export function TabbedResources({ tabs, banner }: { tabs: Tab[]; banner?: ReactNode }) {
  const [active, setActive] = useState(tabs[0]?.key);
  const current = tabs.find((t) => t.key === active) ?? tabs[0];
  return (
    <div className="space-y-4">
      {banner}
      <div className="inline-flex flex-wrap rounded-lg border border-ink-700 bg-ink-900 p-1">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActive(t.key)}
            className={`rounded-md px-3 py-1.5 text-sm ${active === t.key ? 'bg-ink-700 text-cream-50' : 'text-ink-400 hover:text-cream-50'}`}>
            {t.label}
          </button>
        ))}
      </div>
      <ResourceManager config={current.config} />
    </div>
  );
}
