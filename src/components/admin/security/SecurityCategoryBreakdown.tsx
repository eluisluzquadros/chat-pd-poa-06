import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface SecurityCategoryBreakdownProps {
  results: any[];
}

export function SecurityCategoryBreakdown({ results }: SecurityCategoryBreakdownProps) {
  // Agrupar por categoria
  const categoryStats = results.reduce((acc, result) => {
    if (!acc[result.category]) {
      acc[result.category] = {
        category: result.category,
        total: 0,
        passed: 0,
        failed: 0,
        partial: 0,
        critical: 0,
      };
    }
    
    acc[result.category].total++;
    
    if (result.result === 'PASSOU') acc[result.category].passed++;
    else if (result.result === 'FALHOU') {
      acc[result.category].failed++;
      if (result.severity === 'Alta') acc[result.category].critical++;
    }
    else if (result.result === 'PARCIAL') acc[result.category].partial++;
    
    return acc;
  }, {} as Record<string, any>);

  const categoryData = Object.values(categoryStats).map((stat: any) => ({
    ...stat,
    passRate: ((stat.passed / stat.total) * 100).toFixed(1),
  }));

  const getBarColor = (passRate: number) => {
    if (passRate >= 95) return '#22c55e';
    if (passRate >= 85) return '#eab308';
    return '#ef4444';
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Análise por Categoria</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Gráfico */}
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={categoryData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="category" />
            <YAxis label={{ value: 'Taxa de Sucesso (%)', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Bar dataKey="passRate" radius={[8, 8, 0, 0]}>
              {categoryData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={getBarColor(parseFloat(entry.passRate))} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>

        {/* Tabela de Categorias */}
        <div className="space-y-3">
          {categoryData.map((cat) => (
            <div key={cat.category} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-semibold text-lg">{cat.category}</h4>
                <Badge variant="outline">
                  {cat.passed}/{cat.total} testes
                </Badge>
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Taxa de Sucesso</span>
                  <span className="font-bold" style={{ 
                    color: parseFloat(cat.passRate) >= 95 ? '#22c55e' : 
                           parseFloat(cat.passRate) >= 85 ? '#eab308' : '#ef4444' 
                  }}>
                    {cat.passRate}%
                  </span>
                </div>
                <Progress value={parseFloat(cat.passRate)} className="h-2" />
              </div>

              <div className="grid grid-cols-4 gap-2 mt-3 text-sm">
                <div className="text-center">
                  <div className="font-bold text-green-600">{cat.passed}</div>
                  <div className="text-xs text-muted-foreground">Passou</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-red-600">{cat.failed}</div>
                  <div className="text-xs text-muted-foreground">Falhou</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-yellow-600">{cat.partial}</div>
                  <div className="text-xs text-muted-foreground">Parcial</div>
                </div>
                <div className="text-center">
                  <div className="font-bold text-orange-600">{cat.critical}</div>
                  <div className="text-xs text-muted-foreground">Críticas</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
