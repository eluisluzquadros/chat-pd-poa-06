import React from 'react';
import { Header } from '@/components/Header';
import { BenchmarkDashboard } from "@/components/admin/BenchmarkDashboard";

export default function BenchmarkDashboardPage() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8 max-w-7xl">
        <BenchmarkDashboard />
      </main>
    </div>
  );
}