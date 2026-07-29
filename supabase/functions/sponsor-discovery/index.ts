// =====================================================================
// Supabase Edge Function: sponsor-discovery
// Researches PUBLIC business information for potential sponsors.
//
// Providers (server-side secrets only — never exposed to the client):
//   - TAVILY_API_KEY   (https://tavily.com)
//   - SERPER_API_KEY   (https://serper.dev)
//
// If neither secret is configured the function returns a clear
// `provider: "none"` response so the UI can tell the user which secret
// is missing. Manual URL import and CSV import continue to work without
// any provider because they never call this function's search path.
//
// The function extracts ONLY publicly available business information and
// computes an explainable match score. It never scrapes private profiles
// or infers sensitive personal information.
// =====================================================================

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface DiscoveryInput {
  runId?: string;
  keywords?: string[];
  locationFilters?: string[];
  industryFilters?: string[];
  requiredSignals?: string[];
  excludedIndustries?: string[];
  excludedCompanies?: string[];
  minAsk?: number;
  maxAsk?: number;
  seedUrls?: string[];
  resultLimit?: number;
}

interface RawResult {
  organization_name: string;
  domain: string | null;
  website: string | null;
  description: string | null;
  industry: string | null;
  location: string | null;
  community_page_url: string | null;
  sponsorship_evidence: string | null;
  source_urls: string[];
  public_contact: Record<string, string>;
}

// --- Explainable match scoring ---------------------------------------
const SIGNAL_WEIGHTS: Record<string, number> = {
  black_culture: 30,
  football: 20,
  montreal: 20,
  youth: 15,
  previous_sponsorship: 10,
  local_business: 5,
};

const SIGNAL_TERMS: Record<string, string[]> = {
  black_culture: ['black', 'afro', 'african', 'caribbean', 'diaspora', 'culture', 'community'],
  football: ['football', 'soccer', 'sport', 'tournament', 'athletic', 'club'],
  montreal: ['montréal', 'montreal', 'québec', 'quebec', 'qc', 'canada'],
  youth: ['youth', 'jeunesse', 'young', 'student', 'mentor', 'grassroots'],
  previous_sponsorship: ['sponsor', 'partner', 'commandite', 'donation', 'foundation', 'giving'],
  local_business: ['inc', 'ltée', 'ltd', 'shop', 'store', 'boutique', 'company'],
};

function scoreResult(r: RawResult): { score: number; breakdown: Record<string, number> } {
  const haystack = [
    r.organization_name,
    r.description ?? '',
    r.industry ?? '',
    r.location ?? '',
    r.sponsorship_evidence ?? '',
    r.community_page_url ?? '',
    ...(r.source_urls ?? []),
  ]
    .join(' ')
    .toLowerCase();

  const breakdown: Record<string, number> = {};
  let total = 0;
  for (const [signal, weight] of Object.entries(SIGNAL_WEIGHTS)) {
    const terms = SIGNAL_TERMS[signal] ?? [];
    const hit = terms.some((t) => haystack.includes(t));
    const points = hit ? weight : 0;
    breakdown[signal] = points;
    total += points;
  }
  return { score: Math.min(100, total), breakdown };
}

function domainFromUrl(url: string): string | null {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '');
  } catch {
    return null;
  }
}

// --- Provider: Tavily -------------------------------------------------
async function searchTavily(key: string, input: DiscoveryInput): Promise<RawResult[]> {
  const query = [
    ...(input.keywords ?? []),
    ...(input.locationFilters ?? []),
    ...(input.industryFilters ?? []),
    'sponsorship OR community partner OR commandite',
  ].join(' ');

  const resp = await fetch('https://api.tavily.com/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      api_key: key,
      query,
      search_depth: 'advanced',
      max_results: Math.min(input.resultLimit ?? 20, 50),
      include_answer: false,
    }),
  });
  if (!resp.ok) throw new Error(`Tavily error ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  const results = (data.results ?? []) as Array<{ url: string; title: string; content: string }>;

  return results.map((it) => {
    const domain = domainFromUrl(it.url);
    return {
      organization_name: it.title?.split(/[|\-–—]/)[0]?.trim() || domain || 'Unknown',
      domain,
      website: domain ? `https://${domain}` : it.url,
      description: it.content?.slice(0, 400) ?? null,
      industry: null,
      location: (input.locationFilters ?? [])[0] ?? null,
      community_page_url: /communaut|community|sponsor|partner/i.test(it.url) ? it.url : null,
      sponsorship_evidence: /sponsor|partner|commandite|donat|foundation/i.test(it.content ?? '')
        ? it.content.slice(0, 240)
        : null,
      source_urls: [it.url],
      public_contact: {},
    };
  });
}

// --- Provider: Serper (Google) ---------------------------------------
async function searchSerper(key: string, input: DiscoveryInput): Promise<RawResult[]> {
  const q = [
    ...(input.keywords ?? []),
    ...(input.locationFilters ?? []),
    ...(input.industryFilters ?? []),
    'sponsorship community partner',
  ].join(' ');

  const resp = await fetch('https://google.serper.dev/search', {
    method: 'POST',
    headers: { 'X-API-KEY': key, 'Content-Type': 'application/json' },
    body: JSON.stringify({ q, num: Math.min(input.resultLimit ?? 20, 30) }),
  });
  if (!resp.ok) throw new Error(`Serper error ${resp.status}: ${await resp.text()}`);
  const data = await resp.json();
  const organic = (data.organic ?? []) as Array<{ link: string; title: string; snippet: string }>;

  return organic.map((it) => {
    const domain = domainFromUrl(it.link);
    return {
      organization_name: it.title?.split(/[|\-–—]/)[0]?.trim() || domain || 'Unknown',
      domain,
      website: domain ? `https://${domain}` : it.link,
      description: it.snippet ?? null,
      industry: null,
      location: (input.locationFilters ?? [])[0] ?? null,
      community_page_url: /communaut|community|sponsor|partner/i.test(it.link) ? it.link : null,
      sponsorship_evidence: /sponsor|partner|commandite|donat/i.test(it.snippet ?? '')
        ? it.snippet
        : null,
      source_urls: [it.link],
      public_contact: {},
    };
  });
}

// --- Filtering & dedup ------------------------------------------------
function applyFilters(results: RawResult[], input: DiscoveryInput): RawResult[] {
  const excludedCos = (input.excludedCompanies ?? []).map((s) => s.toLowerCase());
  const excludedInd = (input.excludedIndustries ?? []).map((s) => s.toLowerCase());
  const required = input.requiredSignals ?? [];
  const seenDomains = new Set<string>();
  const seenNames = new Set<string>();

  return results.filter((r) => {
    const name = r.organization_name.toLowerCase();
    if (excludedCos.some((c) => name.includes(c))) return false;
    const blob = `${name} ${r.industry ?? ''} ${r.description ?? ''}`.toLowerCase();
    if (excludedInd.some((c) => blob.includes(c))) return false;

    // required signals must be present in the score breakdown
    if (required.length) {
      const { breakdown } = scoreResult(r);
      if (!required.every((s) => (breakdown[s] ?? 0) > 0)) return false;
    }

    // domain + name dedup
    const key = r.domain ?? name;
    if (seenDomains.has(key) || seenNames.has(name)) return false;
    seenDomains.add(key);
    seenNames.add(name);
    return true;
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const input = (await req.json()) as DiscoveryInput;
    const tavily = Deno.env.get('TAVILY_API_KEY');
    const serper = Deno.env.get('SERPER_API_KEY');
    const provider = tavily ? 'tavily' : serper ? 'serper' : 'none';

    // No provider configured — return an explicit, honest response.
    if (provider === 'none') {
      return new Response(
        JSON.stringify({
          provider: 'none',
          missing_secret: 'TAVILY_API_KEY or SERPER_API_KEY',
          message:
            'No search provider is configured. Set TAVILY_API_KEY or SERPER_API_KEY in Supabase Edge Function secrets. Manual URL import and CSV import still work without a provider.',
          results: [],
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
      );
    }

    let raw: RawResult[] = [];
    if (provider === 'tavily') raw = await searchTavily(tavily!, input);
    else raw = await searchSerper(serper!, input);

    const filtered = applyFilters(raw, input).slice(0, input.resultLimit ?? 20);
    const scored = filtered.map((r) => {
      const { score, breakdown } = scoreResult(r);
      return { ...r, match_score: score, score_breakdown: breakdown };
    });

    // Optionally persist results to a discovery run using the caller's JWT
    // so row-level security is enforced with their permissions.
    if (input.runId) {
      const authHeader = req.headers.get('Authorization') ?? '';
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const rows = scored.map((r) => ({
        run_id: input.runId,
        organization_name: r.organization_name,
        domain: r.domain,
        website: r.website,
        description: r.description,
        industry: r.industry,
        location: r.location,
        community_page_url: r.community_page_url,
        public_contact: r.public_contact,
        sponsorship_evidence: r.sponsorship_evidence,
        source_urls: r.source_urls,
        match_score: r.match_score,
        score_breakdown: r.score_breakdown,
        approval_status: 'pending',
      }));
      if (rows.length) await supabase.from('sponsor_discovery_results').insert(rows);
      await supabase
        .from('sponsor_discovery_runs')
        .update({
          status: 'completed',
          provider,
          results_found: scored.length,
          completed_at: new Date().toISOString(),
        })
        .eq('id', input.runId);
    }

    return new Response(
      JSON.stringify({ provider, results_found: scored.length, results: scored }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err instanceof Error ? err.message : err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
