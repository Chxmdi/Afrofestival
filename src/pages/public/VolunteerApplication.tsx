import { useState } from 'react';
import { DynamicForm, type FieldDef, type FormValues } from '@/components/Form';
import { PublicShell, SuccessScreen, submitPublic } from './PublicForms';
import { Honeypot, useHoneypot } from './Honeypot';

const FIELDS: FieldDef[] = [
  { name: 'full_name', label: 'Full name', required: true, colSpan: 2 },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'skills', label: 'Skills / interests', type: 'tags', help: 'Comma-separated', colSpan: 2 },
  { name: 'availability', label: 'Availability', placeholder: 'Event day, set-up, tear-down' },
  { name: 'emergency_contact_name', label: 'Emergency contact' },
  { name: 'emergency_contact_phone', label: 'Emergency phone', type: 'tel' },
  { name: 'consent_given', label: 'I consent to being contacted and to the volunteer guidelines', type: 'boolean', colSpan: 2 },
];

export function VolunteerApplication() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const hp = useHoneypot();

  if (done) return <SuccessScreen title="Thanks for volunteering!" message="Our volunteer coordinator will be in touch about roles, shifts and training." />;

  const submit = async (values: FormValues) => {
    setSubmitting(true); setError(null);
    const res = await submitPublic('volunteers', { ...values, status: 'applied', submission_source: 'public_form' }, hp.value);
    setSubmitting(false);
    if (res.ok) setDone(true); else setError(res.error ?? 'Something went wrong');
  };

  return (
    <PublicShell title="Volunteer sign-up" subtitle="Join the crew that makes the festival run">
      <div className="card p-6">
        <DynamicForm fields={FIELDS} onSubmit={submit} submitLabel="Sign me up" error={error} submitting={submitting} extra={<Honeypot {...hp} />} />
      </div>
    </PublicShell>
  );
}
