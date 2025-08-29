import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://ngrqwmvuhvjkeohesbxs.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ncnF3bXZ1aHZqa2VvaGVzYnhzIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzYwOTAxNywiZXhwIjoyMDY5MTg1MDE3fQ.7jVZP70RAjpfFPfehZt5Gr3vSxn8DZ3YyPJNjCwZXEo";

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTables() {
  console.log("Verificando tabelas existentes...");
  
  const { error: legalError, count: legalCount } = await supabase
    .from("legal_articles")
    .select("*", { count: "exact", head: true });
  
  console.log("legal_articles:", \!legalError ? "Existe" : legalError.message);
  
  const { error: regimeError, count: regimeCount } = await supabase
    .from("regime_urbanistico_completo")
    .select("*", { count: "exact", head: true });
    
  console.log("regime_urbanistico_completo:", \!regimeError ? "Existe" : regimeError.message);
  
  const { count: rowsCount } = await supabase
    .from("document_rows")
    .select("*", { count: "exact", head: true });
    
  console.log("document_rows: Existe (" + rowsCount + " registros)");
  
  const { count: nodesCount } = await supabase
    .from("knowledge_graph_nodes")
    .select("*", { count: "exact", head: true });
    
  console.log("knowledge_graph_nodes: Existe (" + nodesCount + " registros)");
  
  const { data: flood } = await supabase
    .from("knowledge_graph_nodes")
    .select("*")
    .eq("node_type", "flood_protection")
    .single();
  
  if (flood && flood.properties) {
    console.log("Proteção enchentes:", flood.properties.entity_value || flood.properties.description);
  }
}

checkTables().catch(console.error);
