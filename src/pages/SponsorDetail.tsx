import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, ExternalLink } from 'lucide-react';
import { useRow, useRows, useInsert, useUpdate } from '@/lib/hooks';
import { SPONSOR_STAGES, SPONSOR_STAGE_MAP } from '@/lib/constants';
import { money, percent, formatDate, formatDateTime, titleCase } from '@/lib/format';
import type { SponsorProspect } from '@/types/db';
import { Card, Spinner, ErrorState, Badge, Meter, SampleBadge, EmptyState } from '@/components/ui';
import { Modal } from '@/components/Modal';
import { DynamicForm, type FieldDef } from '@/components/Form';
import { useAuth } from '@/auth/AuthProvider';

const SIGNAL_LABELS: Record<string, string> = {
  black_culture: 'Black culture & community', football: 'Football / sports',
  montreal: 'Montréal / Québec', youth: 'Youth & community impact',
  previous_sponsorship: 'Previous sponsorship', local_business: 'Local business capacity',
};

const OUTREACH_FIELDS: FieldDef[] = [
  { name: 'channel', label: 'Channel', type: 'select', required: true, options: ['email', 'call', 'meeting', 'linkedin', 'event', 'other'].map((v) => ({ value: v, label: titleCase(v) })) },
  { name: 'direction', label: 'Direction', type: 'select', options: [{ value: 'outbound', label: 'Outbound' }, { value: 'inbound', label: 'Inbound' }] },
  { name: 'subject', label: 'Subject', colSpan: 2 },
  { name: 'body', label: 'Notes', type: 'textarea', colSpan: 2 },
  { name: 'outcome', label: 'Outcome', colSpan: 2 },
];

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-2 border-b border-ink-800/70 last:border-0">
      <span className="text-xs text-ink-400">{label}</span>
      <span className="text-sm text-cream-50 text-right">{value ?? '—'}</span>
    </div>
  );
}

export function SponsorDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canEdit } = useAuth();
  const { data: sp, isLoading, error, refetch } = useRow<SponsorProspect>('sponsor_prospects', id);
  const { data: outreach = [] } = useRows('sponsor_outreach', { eq: { prospect_id: id ?? '' }, order: { column: 'occurred_at', ascending: false }, enabled: Boolean(id) });
  const { data: deliverables = [] } = useRows('sponsor_deliverables', { eq: { prospect_id: id ?? '' }, enabled: Boolean(id) });
  const { data: invoices = [] } = useRows('sponsor_invoices', { eq: { prospect_id: id ?? '' }, enabled: Boolean(id) });
  const update = useUpdate('sponsor_prospects');
  const addOutreach = useInsert('sponsor_outreach');
  const [logging, setLogging] = useState(false);

  if (isLoading) return <Card><Spinner /></Card>;
  if (error || !sp) return <Card><ErrorState error={error ?? 'Not found'} retry={refetch} /></Card>;

  const breakdown = sp.score_breakdown ?? {};
  const alignments = [
    { label: 'Black culture & community', v: sp.align_black_culture },
    { label: 'Football / sports', v: sp.align_football },
    { label: 'Montréal / Québec', v: sp.align_montreal },
    { label: 'Youth & community', v: sp.align_youth },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-3">
        <button className="btn-ghost !px-2" onClick={() => navigate('/sponsors')}><ArrowLeft className="h-5 w-5" /></button>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h1 className="font-display text-2xl text-cream-50">{sp.name}</h1>
            {sp.is_sample && <SampleBadge />}
          </div>
          <p className="text-sm text-ink-400">{sp.industry ?? '—'} · {sp.location ?? '—'}
            {sp.website && <> · <a className="text-gold-400 hover:text-gold-300 inline-flex items-center gap-0.5" href={sp.website} target="_blank" rel="noreferrer">Website <ExternalLink className="h-3 w-3" /></a></>}
          </p>
        </div>
        {canEdit && (
          <select className="input w-auto" value={sp.stage} onChange={(e) => update.mutate({ id: sp.id, values: { stage: e.target.value } })}>
            {SPONSOR_STAGES.map((s) => <option key={s.value} value={s.value}>{s.label}</option>)}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Left: score + details */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-cream-50">Explainable match score</h3>
              <Badge color={SPONSOR_STAGE_MAP[sp.stage]?.color}>{SPONSOR_STAGE_MAP[sp.stage]?.label}</Badge>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <div className="font-display text-4xl text-cream-50">{sp.match_score ?? 0}<span className="text-lg text-ink-400">/100</span></div>
              <div className="flex-1"><Meter score={sp.match_score} /></div>
            </div>
            <div className="space-y-2">
              {Object.keys(SIGNAL_LABELS).map((key) => {
                const val = Number(breakdown[key] ?? 0);
                const maxW = { black_culture: 30, football: 20, montreal: 20, youth: 15, previous_sponsorship: 10, local_business: 5 }[key] ?? 10;
                return (
                  <div key={key} className="flex items-center gap-3">
                    <span className="w-52 shrink-0 text-xs text-ink-300">{SIGNAL_LABELS[key]}</span>
                    <div className="flex-1 h-2 rounded-full bg-ink-700 overflow-hidden">
                      <div className="h-full rounded-full bg-gold-500" style={{ width: `${(val / maxW) * 100}%` }} />
                    </div>
                    <span className="w-12 text-right text-xs tabular-nums text-ink-300">{val}/{maxW}</span>
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card>
              <h3 className="text-sm font-semibold text-cream-50 mb-2">Alignment</h3>
              {alignments.map((a) => (
                <div key={a.label} className="flex items-center justify-between py-1.5">
                  <span className="text-xs text-ink-300">{a.label}</span><Meter score={a.v} />
                </div>
              ))}
            </Card>
            <Card>
              <h3 className="text-sm font-semibold text-cream-50 mb-2">Commercials</h3>
              <Row label="Suggested ask" value={money(sp.suggested_ask)} />
              <Row label="Estimated capacity" value={money(sp.estimated_capacity)} />
              <Row label="Probability" value={percent(sp.probability)} />
              <Row label="Weighted value" value={<span className="text-forest-300">{money(sp.weighted_value)}</span>} />
              <Row label="Commitment" value={titleCase(sp.commitment_type)} />
            </Card>
          </div>

          <Card>
            <h3 className="text-sm font-semibold text-cream-50 mb-2">Details</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
              <div>
                <Row label="Proposal status" value={titleCase(sp.proposal_status)} />
                <Row label="Contract status" value={titleCase(sp.contract_status)} />
                <Row label="Contact source" value={sp.contact_source ? `${sp.contact_source} (${percent(sp.contact_confidence, 0)})` : '—'} />
              </div>
              <div>
                <Row label="Next action" value={sp.next_action} />
                <Row label="Next-action date" value={formatDate(sp.next_action_date)} />
                <Row label="Last interaction" value={formatDateTime(sp.last_interaction_at)} />
              </div>
            </div>
            {sp.previous_sponsorship_evidence && <p className="mt-3 text-xs text-ink-300"><span className="text-ink-500">Previous sponsorship evidence: </span>{sp.previous_sponsorship_evidence}</p>}
            {sp.description && <p className="mt-2 text-sm text-ink-200">{sp.description}</p>}
            {sp.internal_notes && <p className="mt-3 rounded-lg bg-ink-950/60 p-3 text-xs text-ink-300"><span className="text-gold-400">Internal: </span>{sp.internal_notes}</p>}
          </Card>
        </div>

        {/* Right: outreach + deliverables + invoices */}
        <div className="space-y-4">
          <Card className="!p-0 overflow-hidden">
            <div className="flex items-center justify-between border-b border-ink-700 px-4 py-3">
              <h3 className="text-sm font-semibold text-cream-50">Outreach history</h3>
              {canEdit && <button className="btn-ghost !px-2 !py-1" onClick={() => setLogging(true)}><Plus className="h-4 w-4" /></button>}
            </div>
            <div className="max-h-72 overflow-y-auto divide-y divide-ink-800/70">
              {outreach.length === 0 ? <EmptyState title="No outreach yet" /> : outreach.map((o) => {
                const r = o as { id: string; channel: string; direction: string; subject: string | null; outcome: string | null; occurred_at: string };
                return (
                  <div key={r.id} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-cream-50">{titleCase(r.channel)} · {titleCase(r.direction)}</span>
                      <span className="text-2xs text-ink-500">{formatDate(r.occurred_at)}</span>
                    </div>
                    {r.subject && <p className="text-xs text-ink-200 mt-0.5">{r.subject}</p>}
                    {r.outcome && <p className="text-2xs text-forest-300 mt-0.5">{r.outcome}</p>}
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="!p-0 overflow-hidden">
            <div className="border-b border-ink-700 px-4 py-3"><h3 className="text-sm font-semibold text-cream-50">Deliverables</h3></div>
            <div className="divide-y divide-ink-800/70">
              {deliverables.length === 0 ? <EmptyState title="No deliverables" /> : deliverables.map((dv) => {
                const r = dv as { id: string; title: string; status: string; due_date: string | null };
                return (
                  <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-cream-50">{r.title}</span>
                    <Badge color={r.status === 'fulfilled' ? '#227d4f' : '#c99a2c'}>{titleCase(r.status)}</Badge>
                  </div>
                );
              })}
            </div>
          </Card>

          <Card className="!p-0 overflow-hidden">
            <div className="border-b border-ink-700 px-4 py-3"><h3 className="text-sm font-semibold text-cream-50">Invoices</h3></div>
            <div className="divide-y divide-ink-800/70">
              {invoices.length === 0 ? <EmptyState title="No invoices" /> : invoices.map((iv) => {
                const r = iv as { id: string; invoice_number: string | null; amount: number; status: string };
                return (
                  <div key={r.id} className="flex items-center justify-between px-4 py-2.5">
                    <span className="text-sm text-cream-50">{r.invoice_number ?? 'Invoice'} · {money(r.amount)}</span>
                    <Badge color={r.status === 'paid' ? '#227d4f' : r.status === 'partial' ? '#c99a2c' : '#a02c4a'}>{titleCase(r.status)}</Badge>
                  </div>
                );
              })}
            </div>
          </Card>
        </div>
      </div>

      <Link to="/sponsors" className="text-sm text-ink-400 hover:text-cream-50">← Back to pipeline</Link>

      <Modal open={logging} onClose={() => setLogging(false)} title="Log outreach" size="md">
        <DynamicForm
          fields={OUTREACH_FIELDS}
          initial={{ direction: 'outbound', channel: 'email' }}
          submitting={addOutreach.isPending}
          onCancel={() => setLogging(false)}
          onSubmit={async (values) => {
            await addOutreach.mutateAsync({ ...values, prospect_id: id });
            await update.mutateAsync({ id: id!, values: { last_interaction_at: new Date().toISOString() } });
            setLogging(false);
          }}
        />
      </Modal>
    </div>
  );
}
