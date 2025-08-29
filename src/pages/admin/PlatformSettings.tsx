import React from 'react';
import { Header } from '@/components/Header';
import { PlatformSettings } from '@/components/admin/PlatformSettings';

export default function PlatformSettingsPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8 max-w-7xl">
        <PlatformSettings />
      </main>
    </div>
  );
}