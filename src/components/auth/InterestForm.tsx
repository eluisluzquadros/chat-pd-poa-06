
import { Button } from "@/components/ui/button";
import { FormFields } from "./interest/FormFields";
import { useInterestForm } from "./interest/useInterestForm";

interface InterestFormProps {
  onClose: () => void;
}

export const InterestForm = ({ onClose }: InterestFormProps) => {
  const { formValues, isLoading, updateField, handleSubmit } = useInterestForm(onClose);

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <FormFields 
        formValues={formValues}
        isLoading={isLoading}
        updateField={updateField}
      />

      <div className="flex flex-col space-y-2">
        <Button
          type="submit"
          className="w-full"
          disabled={isLoading}
        >
          {isLoading ? "Enviando..." : "Enviar Interesse"}
        </Button>

        <Button
          type="button"
          variant="ghost"
          className="w-full"
          onClick={onClose}
          disabled={isLoading}
        >
          Voltar
        </Button>
      </div>
    </form>
  );
};
