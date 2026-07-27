import { useState } from 'react';
import { DynamicForm, type FieldDef, type FormValues } from '@/components/Form';
import { PublicShell, SuccessScreen, submitPublic } from './PublicForms';
import { EVENT } from '@/lib/constants';
import { Honeypot, useHoneypot } from './Honeypot';

const FIELDS: FieldDef[] = [
  { name: 'name', label: 'Team Name', required: true, colSpan: 2 },
  { name: 'represents', label: 'Country / community represented' },
  { name: 'neighbourhood', label: 'Neighbourhood' },
  { name: 'captain_name', label: 'Captain full name', required: true },
  { name: 'captain_email', label: 'Captain email', type: 'email', required: true },
  { name: 'captain_phone', label: 'Captain phone', type: 'tel' },
  { name: 'manager_name', label: 'Manager name' },
  { name: 'color_primary', label: 'Primary colour', placeholder: '#227d4f' },
];

export function TeamRegistration() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const hp = useHoneypot();

  if (done) return <SuccessScreen title="Team registration received" message="Thank you! Our tournament director will review your entry and follow up about the roster, fees and group draw." />;

  const submit = async (values: FormValues) => {
    setSubmitting(true); setError(null);
    const res = await submitPublic('teams', { ...values, registration_status: 'pending', payment_status: 'unpaid', registration_fee: 450, submission_source: 'public_form' }, hp.value);
    setSubmitting(false);
    if (res.ok) setDone(true); else setError(res.error ?? 'Something went wrong');
  };

  return (
    <PublicShell title="Register your team" subtitle={`7-a-side · ${EVENT.playersMin}–${EVENT.playersMax} players · ${EVENT.teams} teams · four groups of four`}>
      <div className="card p-6">
        <DynamicForm fields={FIELDS} onSubmit={submit} submitLabel="Submit registration" error={error} submitting={submitting}
          extra={<Honeypot {...hp} />} />
        <p className="text-2xs text-ink-500 mt-3">Player fees are capped at CAD ${EVENT.maxPlayerFee}. You'll add your full roster after your team is approved.</p>
      </div>
    </PublicShell>
  );
}
