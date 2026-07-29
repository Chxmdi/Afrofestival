import { useState } from 'react';
import { DynamicForm, type FieldDef, type FormValues } from '@/components/Form';
import { PublicShell, SuccessScreen, submitPublic } from './PublicForms';
import { Honeypot, useHoneypot } from './Honeypot';

const FIELDS: FieldDef[] = [
  { name: 'name', label: 'Organization', required: true, colSpan: 2 },
  { name: 'website', label: 'Website', type: 'url' },
  { name: 'industry', label: 'Industry' },
  { name: 'location', label: 'Location' },
  { name: 'contact_source', label: 'Your name', required: true },
  { name: 'internal_notes', label: 'How would you like to partner?', type: 'textarea', colSpan: 2, help: 'Tell us about your goals — cash, in-kind, or activation ideas.' },
  { name: 'suggested_ask', label: 'Budget you have in mind (CAD, optional)', type: 'money', min: 0 },
];

export function SponsorInquiry() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const hp = useHoneypot();

  if (done) return <SuccessScreen title="Thank you for your interest" message="Our sponsorship lead will reach out with partnership packages tailored to your goals." />;

  const submit = async (values: FormValues) => {
    setSubmitting(true); setError(null);
    const res = await submitPublic('sponsor_prospects', { ...values, stage: 'contact_identified', probability: 0.2, submission_source: 'inquiry' }, hp.value);
    setSubmitting(false);
    if (res.ok) setDone(true); else setError(res.error ?? 'Something went wrong');
  };

  return (
    <PublicShell title="Become a sponsor" subtitle="Reach an engaged Montréal audience celebrating football and Black culture">
      <div className="card p-6">
        <DynamicForm fields={FIELDS} onSubmit={submit} submitLabel="Send inquiry" error={error} submitting={submitting} extra={<Honeypot {...hp} />} />
      </div>
    </PublicShell>
  );
}
