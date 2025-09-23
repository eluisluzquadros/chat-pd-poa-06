import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

export default function TestQACases() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testCases = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('test-qa-cases');
      if (error) throw error;
      setResult(data);
    } catch (error) {
      setResult({ error: error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Test QA Cases</h1>
      
      <Button onClick={testCases} disabled={loading}>
        {loading ? "Testing..." : "Test QA Cases"}
      </Button>

      {result && (
        <Card className="mt-4 p-4">
          <pre className="whitespace-pre-wrap">
            {JSON.stringify(result, null, 2)}
          </pre>
        </Card>
      )}
    </div>
  );
}