import { useState } from 'react';
import { DynamicForm, type FieldDef, type FormValues } from '@/components/Form';
import { PublicShell, SuccessScreen, submitPublic } from './PublicForms';
import { VENDOR_CATEGORIES } from '@/lib/constants';
import { Honeypot, useHoneypot } from './Honeypot';

const FIELDS: FieldDef[] = [
  { name: 'legal_name', label: 'Legal business name', required: true, colSpan: 2 },
  { name: 'trading_name', label: 'Trading name' },
  { name: 'category', label: 'Category', type: 'select', required: true, options: VENDOR_CATEGORIES.map((c) => ({ value: c, label: c })) },
  { name: 'contact_name', label: 'Primary contact', required: true },
  { name: 'email', label: 'Email', type: 'email', required: true },
  { name: 'phone', label: 'Phone', type: 'tel' },
  { name: 'website', label: 'Website / social', type: 'url' },
  { name: 'black_owned', label: 'Black-owned (optional self-ID)', type: 'boolean' },
  { name: 'african_caribbean', label: 'African / Caribbean (optional)', type: 'boolean' },
  { name: 'menu_products', label: 'Menu / product list', type: 'textarea', colSpan: 2 },
  { name: 'tent_needs', label: 'Tent needs' },
  { name: 'table_needs', label: 'Tables needed', type: 'number', min: 0 },
  { name: 'electricity_needs', label: 'Electricity needs' },
  { name: 'water_needs', label: 'Water hookup needed', type: 'boolean' },
  { name: 'propane_cooking', label: 'Propane / cooking on site', type: 'boolean' },
  { name: 'food_permit', label: 'Hold a food permit', type: 'boolean' },
  { name: 'mapaq_number', label: 'MAPAQ number (if applicable)' },
  { name: 'insurance', label: 'Have liability insurance', type: 'boolean' },
];

export function VendorApplication() {
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const hp = useHoneypot();

  if (done) return <SuccessScreen title="Application received" message="Thanks for applying to be a vendor. Our vendor lead will review your application and reach out about booth placement, fees and documentation." />;

  const submit = async (values: FormValues) => {
    setSubmitting(true); setError(null);
    const res = await submitPublic('vendor_applications', { ...values, status: 'submitted', submission_source: 'public_form' }, hp.value);
    setSubmitting(false);
    if (res.ok) setDone(true); else setError(res.error ?? 'Something went wrong');
  };

  return (
    <PublicShell title="Vendor application" subtitle="Food, beverage, fashion, beauty, hair & barbering, art, jewellery, community, media and more">
      <div className="card p-6">
        <DynamicForm fields={FIELDS} onSubmit={submit} submitLabel="Submit application" error={error} submitting={submitting} extra={<Honeypot {...hp} />} />
      </div>
    </PublicShell>
  );
}
