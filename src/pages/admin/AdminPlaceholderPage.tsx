import React from 'react';
import { Card } from '../../components/ui/Card';
import { Alert } from '../../components/ui/Alert';
import { EmptyState } from '../../components/ui/EmptyState';
import { Button } from '../../components/ui/Button';
import { Database, Plus } from 'lucide-react';

interface AdminPlaceholderPageProps {
  title: string;
  description: string;
  moduleName: string;
  architectureNote?: string;
}

export const AdminPlaceholderPage: React.FC<AdminPlaceholderPageProps> = ({
  title,
  description,
  moduleName,
  architectureNote,
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-brand-navy-950">{title}</h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{description}</p>
        </div>
        <Button variant="primary" size="sm" startIcon={<Plus className="w-4 h-4" />}>
          Add New {moduleName}
        </Button>
      </div>

      <Alert variant="info" title="Phase 1 Foundation Status">
        {architectureNote ||
          `The ${moduleName} module UI shell and route are configured. Persistent data storage, PostgreSQL schema, and Supabase RPC operations will be integrated in subsequent phases according to the Git migration policy.`}
      </Alert>

      <Card className="p-8">
        <EmptyState
          icon={<Database className="w-12 h-12 text-slate-300" />}
          title={`No ${moduleName} records found`}
          description={`This screen will connect directly to the Git-tracked Supabase PostgreSQL schema for ${moduleName.toLowerCase()}.`}
          action={
            <Button variant="outline" size="sm">
              Configure {moduleName} Schema
            </Button>
          }
        />
      </Card>
    </div>
  );
};
