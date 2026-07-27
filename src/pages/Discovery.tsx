import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Radar, Play, Upload, LinkIcon, Check, X, ArrowRight, AlertTriangle, Loader2 } from 'lucide-react';
import { useRows, useInsert, useUpdate } from '@/lib/hooks';
import { supabase } from '@/lib/supabase';
import { formatDateTime, titleCase } from '@/lib/format';
import { Card, SectionTitle, Spinner, EmptyState, Badge, Meter } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { useAuth } from '@/auth/AuthProvider';

interface Run { id: string; label: string | null; status: string; provider: string | null; results_found: number; records_created: number; created_at: string; keywords: string[]; error_message: string | null }
interface Result { id: string; run_id: string; organization_name: string; domain: string | null; website: string | null; description: string | null; industry: string | null; location: string | null; sponsorship_evidence: string | null; source_urls: string[]; match_score: number | null; score_breakdown: Record<string, number>; approval_status: string; imported_prospect_id: string | null }

// Lightweight client-side scorer (mirrors the edge function) for manual/CSV imports.
const WEIGHTS: Record<string, number> = { black_culture: 30, football: 20, montreal: 20, youth: 15, previous_sponsorship: 10, local_business: 5 };
const TERMS: Record<string, string[]> = {
  black_culture: ['black', 'afro', 'african', 'caribbean', 'diaspora', 'culture', 'community'],
  football: ['football', 'soccer', 'sport', 'tournament', 'athletic', 'club'],
  montreal: ['montréal', 'montreal', 'québec', 'quebec', 'qc', 'canada'],
  youth: ['youth', 'jeunesse', 'young', 'student', 'mentor', 'grassroots'],
  previous_sponsorship: ['sponsor', 'partner', 'commandite', 'donation', 'foundation'],
  local_business: ['inc', 'ltée', 'ltd', 'shop', 'store', 'boutique'],
};
function scoreText(text: string) {
  const h = text.toLowerCase();
  const breakdown: Record<string, number> = {};
  let total = 0;
  for (const [sig, w] of Object.entries(WEIGHTS)) { const hit = TERMS[sig].some((t) => h.includes(t)); breakdown[sig] = hit ? w : 0; total += breakdown[sig]; }
  return { score: Math.min(100, total), breakdown };
}
function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (!lines.length) return [];
  const headers = lines[0].split(',').map((h) => h.trim().toLowerCase());
  return lines.slice(1).map((line) => {
    const cells = line.match(/("([^"]|"")*"|[^,]*)/g)?.filter((_, i, arr) => i < arr.length) ?? [];
    const rec: Record<string, string> = {};
    headers.forEach((h, i) => { rec[h] = (cells[i] ?? '').replace(/^"|"$/g, '').replace(/""/g, '"').trim(); });
    return rec;
  });
}

export function Discovery() {
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const { data: runs = [], isLoading, refetch: refetchRuns } = useRows<Run>('sponsor_discovery_runs', { order: { column: 'created_at', ascending: false } });
  const insertRun = useInsert('sponsor_discovery_runs');
  const insertResult = useInsert('sponsor_discovery_results');
  const insertProspect = useInsert('sponsor_prospects');
  const updateResult = useUpdate('sponsor_discovery_results');

  const [activeRun, setActiveRun] = useState<string | null>(null);
  const currentRun = activeRun ?? runs[0]?.id ?? null;
  const { data: results = [], refetch: refetchResults } = useRows<Result>('sponsor_discovery_results', { eq: { run_id: currentRun ?? '' }, order: { column: 'match_score', ascending: false }, enabled: Boolean(currentRun) });

  const [form, setForm] = useState({ label: '', keywords: '', locations: 'Montréal, Québec', industries: '', required: '', excludedIndustries: 'Tobacco, Gambling', minAsk: '', maxAsk: '', seedUrls: '', limit: 20 });
  const [running, setRunning] = useState(false);
  const [notice, setNotice] = useState<{ tone: 'ok' | 'warn' | 'err'; msg: string } | null>(null);
  const [manualOpen, setManualOpen] = useState(false);
  const [manual, setManual] = useState({ name: '', url: '', description: '', industry: '', location: '' });
  const fileRef = useRef<HTMLInputElement>(null);

  const csvList = (s: string) => s.split(',').map((x) => x.trim()).filter(Boolean);

  const startRun = async () => {
    setRunning(true); setNotice(null);
    try {
      const runRow = await insertRun.mutateAsync({
        label: form.label || `Discovery ${new Date().toLocaleDateString()}`,
        keywords: csvList(form.keywords), location_filters: csvList(form.locations),
        industry_filters: csvList(form.industries), required_signals: csvList(form.required),
        excluded_industries: csvList(form.excludedIndustries),
        min_ask: form.minAsk ? Number(form.minAsk) : null, max_ask: form.maxAsk ? Number(form.maxAsk) : null,
        seed_urls: csvList(form.seedUrls), result_limit: Number(form.limit), status: 'running',
      }) as { id: string };
      setActiveRun(runRow.id);

      const { data, error } = await supabase.functions.invoke('sponsor-discovery', {
        body: {
          runId: runRow.id, keywords: csvList(form.keywords), locationFilters: csvList(form.locations),
          industryFilters: csvList(form.industries), requiredSignals: csvList(form.required),
          excludedIndustries: csvList(form.excludedIndustries), seedUrls: csvList(form.seedUrls),
          minAsk: form.minAsk ? Number(form.minAsk) : undefined, maxAsk: form.maxAsk ? Number(form.maxAsk) : undefined,
          resultLimit: Number(form.limit),
        },
      });
      if (error) throw error;
      if (data?.provider === 'none') {
        setNotice({ tone: 'warn', msg: data.message ?? `Missing secret: ${data.missing_secret}. Use manual URL or CSV import instead.` });
        await supabase.from('sponsor_discovery_runs').update({ status: 'completed', provider: 'none' }).eq('id', runRow.id);
      } else {
        setNotice({ tone: 'ok', msg: `Found ${data.results_found ?? 0} results via ${data.provider}. Review and approve below.` });
      }
      await Promise.all([refetchRuns(), refetchResults()]);
    } catch (e) {
      setNotice({ tone: 'err', msg: e instanceof Error ? e.message : String(e) });
    } finally {
      setRunning(false);
    }
  };

  const ensureManualRun = async (): Promise<string> => {
    if (currentRun) return currentRun;
    const r = await insertRun.mutateAsync({ label: 'Manual import', provider: 'manual', status: 'completed' }) as { id: string };
    setActiveRun(r.id);
    return r.id;
  };

  const addManual = async () => {
    const runId = await ensureManualRun();
    const domain = (() => { try { return new URL(manual.url.startsWith('http') ? manual.url : `https://${manual.url}`).hostname.replace(/^www\./, ''); } catch { return null; } })();
    const { score, breakdown } = scoreText(`${manual.name} ${manual.description} ${manual.industry} ${manual.location}`);
    await insertResult.mutateAsync({
      run_id: runId, organization_name: manual.name, domain, website: manual.url || (domain ? `https://${domain}` : null),
      description: manual.description || null, industry: manual.industry || null, location: manual.location || null,
      source_urls: manual.url ? [manual.url] : [], match_score: score, score_breakdown: breakdown, approval_status: 'pending',
    });
    setManual({ name: '', url: '', description: '', industry: '', location: '' });
    setManualOpen(false);
    refetchResults();
  };

  const importCSV = async (file: File) => {
    const text = await file.text();
    const records = parseCSV(text);
    if (!records.length) { setNotice({ tone: 'err', msg: 'No rows found in CSV.' }); return; }
    const runId = await ensureManualRun();
    const existingDomains = new Set(results.map((r) => r.domain));
    let created = 0;
    for (const rec of records) {
      const name = rec.name || rec.organization || rec.organization_name || rec.company;
      if (!name) continue;
      const url = rec.website || rec.url || rec.domain || '';
      const domain = (() => { try { return url ? new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '') : null; } catch { return null; } })();
      if (domain && existingDomains.has(domain)) continue;
      if (domain) existingDomains.add(domain);
      const { score, breakdown } = scoreText(`${name} ${rec.description ?? ''} ${rec.industry ?? ''} ${rec.location ?? ''}`);
      await insertResult.mutateAsync({
        run_id: runId, organization_name: name, domain, website: url || (domain ? `https://${domain}` : null),
        description: rec.description || null, industry: rec.industry || null, location: rec.location || null,
        source_urls: url ? [url] : [], match_score: score, score_breakdown: breakdown, approval_status: 'pending',
      });
      created++;
    }
    setNotice({ tone: 'ok', msg: `Imported ${created} organisations from CSV (duplicates skipped).` });
    refetchResults();
  };

  const approveToCRM = async (r: Result) => {
    const prospect = await insertProspect.mutateAsync({
      name: r.organization_name, website: r.website, domain: r.domain, industry: r.industry, location: r.location,
      description: r.description, stage: 'qualified', match_score: r.match_score, score_breakdown: r.score_breakdown,
      align_black_culture: r.score_breakdown?.black_culture ?? 0, align_football: r.score_breakdown?.football ?? 0,
      align_montreal: r.score_breakdown?.montreal ?? 0, align_youth: r.score_breakdown?.youth ?? 0,
      previous_sponsorship_evidence: r.sponsorship_evidence, contact_source: 'discovery', submission_source: 'discovery',
    }) as { id: string };
    await updateResult.mutateAsync({ id: r.id, values: { approval_status: 'imported', imported_prospect_id: prospect.id } });
    refetchResults(); refetchRuns();
  };

  const pending = useMemo(() => results.filter((r) => r.approval_status === 'pending'), [results]);

  return (
    <div className="space-y-5">
      <SectionTitle title="Sponsor Discovery" subtitle="Research public business information, review evidence, then approve into the CRM"
        action={
          <div className="flex gap-2">
            <input ref={fileRef} type="file" accept=".csv" className="hidden" onChange={(e) => e.target.files?.[0] && importCSV(e.target.files[0])} />
            <button className="btn-secondary" onClick={() => fileRef.current?.click()}><Upload className="h-4 w-4" /><span className="hidden sm:inline">Import CSV</span></button>
            <button className="btn-secondary" onClick={() => setManualOpen(true)}><LinkIcon className="h-4 w-4" /><span className="hidden sm:inline">Add URL</span></button>
          </div>
        } />

      {notice && (
        <div className={`flex items-start gap-2 rounded-lg border p-3 text-sm ${notice.tone === 'ok' ? 'border-forest-600/40 bg-forest-600/10 text-forest-300' : notice.tone === 'warn' ? 'border-gold-600/40 bg-gold-600/10 text-gold-300' : 'border-ember-600/40 bg-ember-600/10 text-ember-300'}`}>
          {notice.tone !== 'ok' && <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />}
          <span>{notice.msg}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Run config */}
        <Card className="lg:col-span-1">
          <div className="flex items-center gap-2 mb-3"><Radar className="h-4 w-4 text-gold-400" /><h3 className="text-sm font-semibold text-cream-50">New discovery run</h3></div>
          <div className="space-y-3">
            {([
              ['label', 'Label', 'e.g. Montréal Black-owned brands'],
              ['keywords', 'Keywords', 'comma-separated'],
              ['locations', 'Location filters', 'Montréal, Québec, Canada'],
              ['industries', 'Industry filters', 'Retail, Food & Beverage'],
              ['required', 'Required signals', 'black_culture, montreal'],
              ['excludedIndustries', 'Excluded industries', 'Tobacco, Gambling'],
              ['seedUrls', 'Seed URLs', 'https://…'],
            ] as const).map(([key, label, ph]) => (
              <div key={key}>
                <label className="label">{label}</label>
                <input className="input" placeholder={ph} value={String((form as unknown as Record<string, unknown>)[key] ?? '')}
                  onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))} />
              </div>
            ))}
            <div className="grid grid-cols-3 gap-2">
              <div><label className="label">Min ask</label><input className="input" type="number" value={form.minAsk} onChange={(e) => setForm((f) => ({ ...f, minAsk: e.target.value }))} /></div>
              <div><label className="label">Max ask</label><input className="input" type="number" value={form.maxAsk} onChange={(e) => setForm((f) => ({ ...f, maxAsk: e.target.value }))} /></div>
              <div><label className="label">Limit</label><input className="input" type="number" value={form.limit} onChange={(e) => setForm((f) => ({ ...f, limit: Number(e.target.value) }))} /></div>
            </div>
            <button className="btn-primary w-full" disabled={running || !canEdit} onClick={startRun}>
              {running ? <><Loader2 className="h-4 w-4 animate-spin" /> Running…</> : <><Play className="h-4 w-4" /> Start run</>}
            </button>
            <p className="text-2xs text-ink-500">Uses TAVILY_API_KEY or SERPER_API_KEY server-side. If neither is set, the run reports the missing secret — manual URL and CSV import still work.</p>
          </div>
        </Card>

        {/* Runs + results */}
        <div className="lg:col-span-2 space-y-4">
          <Card className="!p-0 overflow-hidden">
            <div className="border-b border-ink-700 px-5 py-3"><h3 className="text-sm font-semibold text-cream-50">Run history</h3></div>
            {isLoading ? <Spinner /> : runs.length === 0 ? <EmptyState title="No runs yet" message="Start a discovery run, add a URL, or import a CSV." /> : (
              <div className="divide-y divide-ink-800/70 max-h-56 overflow-y-auto">
                {runs.map((r) => (
                  <button key={r.id} onClick={() => setActiveRun(r.id)} className={`flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-ink-800/40 ${currentRun === r.id ? 'bg-ink-800/60' : ''}`}>
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm text-cream-50 truncate">{r.label ?? 'Untitled run'}</span>
                      <span className="block text-2xs text-ink-500">{formatDateTime(r.created_at)} · {r.provider ?? '—'}</span>
                    </span>
                    <Badge color={r.status === 'completed' ? '#227d4f' : r.status === 'failed' ? '#a02c4a' : '#c99a2c'}>{titleCase(r.status)}</Badge>
                    <span className="text-2xs text-ink-400 w-16 text-right">{r.results_found} found</span>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card className="!p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-700 px-5 py-3">
              <h3 className="text-sm font-semibold text-cream-50">Results {currentRun && `· ${pending.length} pending approval`}</h3>
            </div>
            {!currentRun ? <EmptyState title="Select a run" /> : results.length === 0 ? <EmptyState title="No results in this run" /> : (
              <div className="divide-y divide-ink-800/70">
                {results.map((r) => (
                  <div key={r.id} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-cream-50">{r.organization_name}</p>
                        <p className="text-2xs text-ink-400">{r.domain ?? '—'} · {r.industry ?? '—'} · {r.location ?? '—'}</p>
                        {r.description && <p className="text-xs text-ink-300 mt-1 line-clamp-2">{r.description}</p>}
                        {r.sponsorship_evidence && <p className="text-2xs text-forest-300 mt-1">Evidence: {r.sponsorship_evidence}</p>}
                        {r.source_urls?.length > 0 && (
                          <div className="mt-1 flex flex-wrap gap-2">
                            {r.source_urls.map((u, i) => <a key={i} href={u} target="_blank" rel="noreferrer" className="text-2xs text-gold-400 hover:text-gold-300 truncate max-w-[200px]">{u}</a>)}
                          </div>
                        )}
                      </div>
                      <div className="shrink-0 text-right space-y-2">
                        <Meter score={r.match_score} />
                        {r.approval_status === 'imported' ? (
                          <button className="btn-ghost !px-2 !py-1 text-forest-300" onClick={() => r.imported_prospect_id && navigate(`/sponsors/${r.imported_prospect_id}`)}>
                            In CRM <ArrowRight className="h-3 w-3" />
                          </button>
                        ) : r.approval_status === 'rejected' ? (
                          <Badge color="#a02c4a">Rejected</Badge>
                        ) : canEdit ? (
                          <div className="flex gap-1 justify-end">
                            <button className="btn-ghost !px-2 !py-1 hover:text-ember-400" title="Reject" onClick={() => updateResult.mutate({ id: r.id, values: { approval_status: 'rejected' } })}><X className="h-4 w-4" /></button>
                            <button className="btn-primary !px-2 !py-1" title="Approve into CRM" onClick={() => approveToCRM(r)}><Check className="h-4 w-4" /> Approve</button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal open={manualOpen} onClose={() => setManualOpen(false)} title="Add organisation by URL" size="md" footer={
        <><button className="btn-secondary" onClick={() => setManualOpen(false)}>Cancel</button><button className="btn-primary" onClick={addManual} disabled={!manual.name}>Add to results</button></>
      }>
        <div className="space-y-3">
          <div><label className="label">Organisation name *</label><input className="input" value={manual.name} onChange={(e) => setManual((m) => ({ ...m, name: e.target.value }))} /></div>
          <div><label className="label">Website / URL</label><input className="input" value={manual.url} onChange={(e) => setManual((m) => ({ ...m, url: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">Industry</label><input className="input" value={manual.industry} onChange={(e) => setManual((m) => ({ ...m, industry: e.target.value }))} /></div>
            <div><label className="label">Location</label><input className="input" value={manual.location} onChange={(e) => setManual((m) => ({ ...m, location: e.target.value }))} /></div>
          </div>
          <div><label className="label">Description</label><textarea className="input min-h-[70px]" value={manual.description} onChange={(e) => setManual((m) => ({ ...m, description: e.target.value }))} /></div>
          <p className="text-2xs text-ink-500">Only public business information is stored. A match score is computed automatically.</p>
        </div>
      </Modal>
    </div>
  );
}
