import SecurityValidation from '@/pages/admin/SecurityValidation';

export function SecurityTab() {
  return (
    <div className="space-y-6">
      <SecurityValidation embedded={true} />
    </div>
  );
}
