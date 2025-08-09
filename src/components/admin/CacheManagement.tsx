import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash2, RefreshCw, Database, Clock, TrendingUp } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface CacheStats {
  totalEntries: number;
  expiredEntries: number;
  avgHits: number;
  newestEntry: string;
  oldestEntry: string;
}

export function CacheManagement() {
  const [stats, setStats] = useState<CacheStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isCleaningUp, setIsCleaningUp] = useState(false);
  const [maxAge, setMaxAge] = useState(168); // 7 days
  const [minHits, setMinHits] = useState(2);
  const { toast } = useToast();

  const fetchCacheStats = async () => {
    try {
      setIsLoading(true);
      
      // Get total entries and average hits
      const { data: countData } = await supabase
        .from('query_cache')
        .select('*', { count: 'exact' });

      const { data: hitsData } = await supabase
        .from('query_cache')
        .select('hit_count');

      // Get expired entries count
      const { data: expiredData } = await supabase
        .from('query_cache')
        .select('*', { count: 'exact' })
        .lt('expires_at', new Date().toISOString());

      // Get oldest and newest entries
      const { data: oldestData } = await supabase
        .from('query_cache')
        .select('created_at')
        .order('created_at', { ascending: true })
        .limit(1);

      const { data: newestData } = await supabase
        .from('query_cache')
        .select('created_at')
        .order('created_at', { ascending: false })
        .limit(1);

      const avgHits = hitsData?.length 
        ? hitsData.reduce((sum, item) => sum + (item.hit_count || 0), 0) / hitsData.length 
        : 0;

      setStats({
        totalEntries: countData?.length || 0,
        expiredEntries: expiredData?.length || 0,
        avgHits: Math.round(avgHits * 10) / 10,
        newestEntry: newestData?.[0]?.created_at || '',
        oldestEntry: oldestData?.[0]?.created_at || ''
      });
    } catch (error) {
      console.error('Error fetching cache stats:', error);
      toast({
        title: "Erro ao carregar estatísticas",
        description: "Não foi possível carregar as estatísticas do cache",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const performCleanup = async (force: boolean = false) => {
    try {
      setIsCleaningUp(true);
      
      const { data, error } = await supabase.functions.invoke('cache-cleanup', {
        body: {
          force,
          maxAge: maxAge,
          minHits: minHits
        }
      });

      if (error) throw error;

      toast({
        title: "Limpeza concluída",
        description: `${data.deletedEntries} entradas removidas do cache`,
      });

      // Refresh stats
      await fetchCacheStats();
    } catch (error) {
      console.error('Error during cleanup:', error);
      toast({
        title: "Erro na limpeza",
        description: "Não foi possível limpar o cache",
        variant: "destructive"
      });
    } finally {
      setIsCleaningUp(false);
    }
  };

  useEffect(() => {
    fetchCacheStats();
  }, []);

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleString('pt-BR');
  };

  const getHealthStatus = () => {
    if (!stats) return 'unknown';
    if (stats.expiredEntries > stats.totalEntries * 0.3) return 'warning';
    if (stats.totalEntries > 1000) return 'warning';
    return 'healthy';
  };

  const healthStatus = getHealthStatus();

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Gerenciamento de Cache</h2>
          <p className="text-muted-foreground">Monitore e gerencie o cache de consultas do sistema</p>
        </div>
        <Button onClick={fetchCacheStats} disabled={isLoading} variant="outline">
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} />
          Atualizar
        </Button>
      </div>

      {/* Status Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Entradas</CardTitle>
            <Database className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalEntries || 0}</div>
            <Badge variant={healthStatus === 'healthy' ? 'default' : 'destructive'} className="mt-2">
              {healthStatus === 'healthy' ? 'Saudável' : 'Atenção'}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Entradas Expiradas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.expiredEntries || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              {stats?.totalEntries ? 
                `${Math.round((stats.expiredEntries / stats.totalEntries) * 100)}% do total` : 
                'N/A'
              }
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Hits Médios</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.avgHits || 0}</div>
            <p className="text-xs text-muted-foreground mt-2">
              Uso médio por entrada
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Status</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge 
              variant={healthStatus === 'healthy' ? 'default' : healthStatus === 'warning' ? 'secondary' : 'destructive'}
              className="text-sm"
            >
              {healthStatus === 'healthy' && 'Ótimo'}
              {healthStatus === 'warning' && 'Precisa Limpeza'}
              {healthStatus === 'unknown' && 'Carregando...'}
            </Badge>
            <p className="text-xs text-muted-foreground mt-2">
              Última entrada: {formatDate(stats?.newestEntry || '')}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Cleanup Controls */}
      <Card>
        <CardHeader>
          <CardTitle>Controles de Limpeza</CardTitle>
          <p className="text-sm text-muted-foreground">
            Configure e execute a limpeza automática do cache
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="maxAge">Idade Máxima (horas)</Label>
              <Input
                id="maxAge"
                type="number"
                value={maxAge}
                onChange={(e) => setMaxAge(Number(e.target.value))}
                min="1"
                max="720"
              />
              <p className="text-xs text-muted-foreground">
                Entradas mais antigas que isso serão removidas se tiverem poucos hits
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="minHits">Hits Mínimos</Label>
              <Input
                id="minHits"
                type="number"
                value={minHits}
                onChange={(e) => setMinHits(Number(e.target.value))}
                min="1"
                max="100"
              />
              <p className="text-xs text-muted-foreground">
                Entradas antigas com menos hits que isso serão removidas
              </p>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button 
              onClick={() => performCleanup(false)}
              disabled={isCleaningUp}
              variant="default"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpeza Inteligente
            </Button>
            
            <Button 
              onClick={() => performCleanup(true)}
              disabled={isCleaningUp}
              variant="destructive"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Limpar Tudo
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Cache Details */}
      {stats && (
        <Card>
          <CardHeader>
            <CardTitle>Detalhes do Cache</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <div>
                <p className="font-medium">Entrada mais antiga:</p>
                <p className="text-muted-foreground">{formatDate(stats.oldestEntry)}</p>
              </div>
              <div>
                <p className="font-medium">Entrada mais recente:</p>
                <p className="text-muted-foreground">{formatDate(stats.newestEntry)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}