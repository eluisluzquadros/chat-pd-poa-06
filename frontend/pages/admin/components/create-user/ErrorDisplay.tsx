
interface ErrorDisplayProps {
  error: string | null;
}

const ErrorDisplay = ({ error }: ErrorDisplayProps) => {
  if (!error) return null;
  
  return (
    <div className="bg-red-50 p-3 rounded border border-red-200 text-red-700 text-sm">
      {error}
    </div>
  );
};

export default ErrorDisplay;
