import { useState } from "react";
import { AdminDashboard } from "@/components/admin/AdminDashboard";
import { RoleGuard } from "@/components/layout/RoleGuard";
import { Header } from "@/components/Header";
import { subDays } from "date-fns";

export default function AdminReports() {
  const [startDate, setStartDate] = useState(() => subDays(new Date(), 30));
  const [endDate, setEndDate] = useState(() => new Date());

  const handleDateRangeChange = (start: Date, end: Date) => {
    setStartDate(start);
    setEndDate(end);
  };

  return (
    <RoleGuard adminOnly={true}>
      <div className="min-h-screen bg-background">
        <Header />
        <div className="container mx-auto py-8 px-4">
          <AdminDashboard
            startDate={startDate}
            endDate={endDate}
            onDateRangeChange={handleDateRangeChange}
          />
        </div>
      </div>
    </RoleGuard>
  );
}