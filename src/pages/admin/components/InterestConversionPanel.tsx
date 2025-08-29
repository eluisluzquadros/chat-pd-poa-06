
import { useState } from "react";
import SearchBar from "./SearchBar";
import InterestTable from "./InterestTable";
import ConversionDialog from "./ConversionDialog";
import { useInterestManagement } from "../hooks/useInterestManagement";

interface InterestConversionPanelProps {
  onUserCreated: () => void;
}

const InterestConversionPanel = ({ onUserCreated }: InterestConversionPanelProps) => {
  const [searchTerm, setSearchTerm] = useState("");
  const { interests, selectedInterest, setSelectedInterest, refetch } = useInterestManagement(searchTerm);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };

  const handleConvertSuccess = () => {
    refetch();
    onUserCreated();
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <SearchBar 
          searchTerm={searchTerm} 
          onSearchChange={handleSearchChange} 
          placeholder="Buscar manifestações..."
        />
      </div>

      <InterestTable 
        interests={interests} 
        onSelectInterest={setSelectedInterest} 
        loading={false}
        onAccountCreated={handleConvertSuccess}
      />

      {selectedInterest && (
        <ConversionDialog
          interest={selectedInterest}
          open={!!selectedInterest}
          onOpenChange={(open) => !open && setSelectedInterest(null)}
          onSuccess={handleConvertSuccess}
        />
      )}
    </div>
  );
};

export default InterestConversionPanel;
