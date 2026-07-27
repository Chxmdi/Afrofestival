import { useState } from 'react';
import { DynamicForm, type FieldDef, type FormValues } from '@/components/Form';
import { PublicShell, SuccessScreen, submitPublic } from './PublicForms';
import { PERFORMER_DISCIPLINES } from '@/lib/constants';
import { Honeypot, useHoneypot } from './Honeypot';

const FIELDS: FieldDef[] = [
  { name: 'name', label: 'Artist / act name', required: true, colSpan: 2 },
  { name: 'discipline', label: 'Discipline', type: 'select', required: true, options: PERFORMER_DISCIPLINES.map((d) => ({ value: d.value, label: d.label })) },
  { name: 'contact_name', label: 'Contact name', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'website', label: 'Website / portfolio', type: 'url' },
  { name: 'black_owned', label: 'Black-owned / Black artist (optional self-ID)', type: 'boolean' },
  { name: 'fee', label: 'Fee expectation (CAD, optional)', type: 'money', min: 0 },
  { name: 'bio', label: 'Tell us about your act', type: 'textarea', colSpan: 2 },
];

export function PerformerApplication() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const hp = useHoneypot();

  if (done) return <SuccessScreen title="Application received" message="Thanks for your interest in performing. Our programme team will review and reach out about the lineup." />;

  const submit = async (values: FormValues) => {
    setSubmitting(true); setError(null);
    const res = await submitPublic('performers', { ...values, status: 'prospect', submission_source: 'public_form' }, hp.value);
    setSubmitting(false);
    if (res.ok) setDone(true); else setError(res.error ?? 'Something went wrong');
  };

  return (
    <PublicShell title="Performer & creator application" subtitle="DJs, musicians, dancers, spoken-word artists, visual artists, barbers, hosts, freestylers & fashion">
      <div className="card p-6">
        <DynamicForm fields={FIELDS} onSubmit={submit} submitLabel="Submit application" error={error} submitting={submitting} extra={<Honeypot {...hp} />} />
      </div>
    </PublicShell>
  );
}
