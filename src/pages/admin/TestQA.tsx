import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function TestQA() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const testDirectCall = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    console.log('Starting direct test call...');
    
    try {
      // Test 1: Simple function call
      console.log('Test 1: Calling qa-validator with minimal body');
      const response = await supabase.functions.invoke('qa-validator', {
        body: { model: 'agentic-rag' }
      });
      
      console.log('Response received:', response);
      setResult(response);
      
    } catch (err) {
      console.error('Test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const testWithFetch = async () => {
    setLoading(true);
    setError(null);
    setResult(null);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      const response = await fetch('https://ngrqwmvuhvjkeohesbxs.supabase.co/functions/v1/qa-validator', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ model: 'agentic-rag' })
      });
      
      const data = await response.json();
      console.log('Fetch response:', data);
      setResult({ data, error: null });
      
    } catch (err) {
      console.error('Fetch test failed:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-4">
      <h1 className="text-2xl font-bold">Test QA Function</h1>
      
      <div className="space-x-4">
        <Button onClick={testDirectCall} disabled={loading}>
          Test Supabase Invoke
        </Button>
        
        <Button onClick={testWithFetch} disabled={loading} variant="outline">
          Test Direct Fetch
        </Button>
      </div>
      
      {loading && <p>Loading...</p>}
      
      {error && (
        <Card className="border-red-500">
          <CardHeader>
            <CardTitle className="text-red-500">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm">{error}</pre>
          </CardContent>
        </Card>
      )}
      
      {result && (
        <Card>
          <CardHeader>
            <CardTitle>Result</CardTitle>
          </CardHeader>
          <CardContent>
            <pre className="text-sm overflow-auto">
              {JSON.stringify(result, null, 2)}
            </pre>
          </CardContent>
        </Card>
      )}
    </div>
  );
}