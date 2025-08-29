
import { Header } from "@/components/Header";
import { ReportsContainer } from "@/components/reports/ReportsContainer";


const Reports = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <div className="container mx-auto pt-24 pb-10 flex-grow">
        <ReportsContainer />
      </div>
      
    </div>
  );
};

export default Reports;
