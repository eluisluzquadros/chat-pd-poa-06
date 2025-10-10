import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { knowledgeBaseService } from '@/services/knowledgeBaseService';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

const formSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório').regex(/^[a-z0-9_-]+$/, 'Use apenas letras minúsculas, números, _ e -'),
  display_name: z.string().min(1, 'Nome de exibição é obrigatório'),
  description: z.string().optional(),
  provider: z.enum(['llamacloud', 'pinecone', 'weaviate', 'custom']),
  index_id: z.string().min(1, 'ID da base é obrigatório'),
  api_key_secret_name: z.string().default('LLAMACLOUD_API_KEY'),
  top_k: z.number().min(1).max(20).default(5),
  score_threshold: z.number().min(0).max(1).default(0.7),
});

type FormValues = z.infer<typeof formSchema>;

interface KnowledgeBaseFormProps {
  knowledgeBaseId?: string | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export function KnowledgeBaseForm({
  knowledgeBaseId,
  onSuccess,
  onCancel,
}: KnowledgeBaseFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [isFetching, setIsFetching] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      provider: 'llamacloud',
      api_key_secret_name: 'LLAMACLOUD_API_KEY',
      top_k: 5,
      score_threshold: 0.7,
    },
  });

  const provider = watch('provider');

  useEffect(() => {
    if (knowledgeBaseId) {
      setIsFetching(true);
      knowledgeBaseService
        .getAllKnowledgeBases()
        .then((kbs) => {
          const kb = kbs.find((k) => k.id === knowledgeBaseId);
          if (kb) {
            setValue('name', kb.name);
            setValue('display_name', kb.display_name);
            setValue('description', kb.description || '');
            setValue('provider', kb.provider);
            setValue('index_id', kb.config.index_id || '');
            setValue('api_key_secret_name', kb.config.api_key_secret_name || 'LLAMACLOUD_API_KEY');
            setValue('top_k', kb.retrieval_settings.top_k || 5);
            setValue('score_threshold', kb.retrieval_settings.score_threshold || 0.7);
          }
        })
        .finally(() => setIsFetching(false));
    }
  }, [knowledgeBaseId, setValue]);

  const onSubmit = async (values: FormValues) => {
    setIsLoading(true);
    try {
      const kbData = {
        name: values.name,
        display_name: values.display_name,
        description: values.description,
        provider: values.provider,
        config: {
          index_id: values.index_id,
          api_key_secret_name: values.api_key_secret_name,
        },
        retrieval_settings: {
          top_k: values.top_k,
          score_threshold: values.score_threshold,
        },
      };

      if (knowledgeBaseId) {
        await knowledgeBaseService.updateKnowledgeBase(knowledgeBaseId, kbData);
        toast.success('Base de conhecimento atualizada');
      } else {
        await knowledgeBaseService.createKnowledgeBase(kbData);
        toast.success('Base de conhecimento criada');
      }

      onSuccess();
    } catch (error: any) {
      console.error('Error saving KB:', error);
      toast.error(error.message || 'Erro ao salvar base de conhecimento');
    } finally {
      setIsLoading(false);
    }
  };

  if (isFetching) {
    return (
      <div className="flex justify-center items-center py-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="name">Nome Técnico *</Label>
        <Input
          id="name"
          placeholder="regulamento_poa"
          {...register('name')}
        />
        {errors.name && (
          <p className="text-sm text-destructive">{errors.name.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Identificador único (minúsculas, números, _ e -)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="display_name">Nome de Exibição *</Label>
        <Input
          id="display_name"
          placeholder="Regulamento de POA"
          {...register('display_name')}
        />
        {errors.display_name && (
          <p className="text-sm text-destructive">{errors.display_name.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea
          id="description"
          placeholder="Base de conhecimento com regulamentos urbanísticos..."
          {...register('description')}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="provider">Provider *</Label>
        <Select
          value={provider}
          onValueChange={(value) => setValue('provider', value as any)}
        >
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="llamacloud">LlamaCloud</SelectItem>
            <SelectItem value="pinecone" disabled>Pinecone (em breve)</SelectItem>
            <SelectItem value="weaviate" disabled>Weaviate (em breve)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="index_id">External Knowledge ID *</Label>
        <Input
          id="index_id"
          placeholder="e.g., llama-parse-xxxxx ou pipeline-xxxxx"
          {...register('index_id')}
        />
        {errors.index_id && (
          <p className="text-sm text-destructive">{errors.index_id.message}</p>
        )}
        <p className="text-xs text-muted-foreground">
          ID do index/pipeline na plataforma externa
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="api_key_secret_name">Nome do Secret da API Key</Label>
        <Input
          id="api_key_secret_name"
          placeholder="LLAMACLOUD_API_KEY"
          {...register('api_key_secret_name')}
        />
        <p className="text-xs text-muted-foreground">
          Nome do secret no Vault do Supabase
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="top_k">Top K</Label>
          <Input
            id="top_k"
            type="number"
            min="1"
            max="20"
            {...register('top_k', { valueAsNumber: true })}
          />
          {errors.top_k && (
            <p className="text-sm text-destructive">{errors.top_k.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Número de resultados (1-20)
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="score_threshold">Score Threshold</Label>
          <Input
            id="score_threshold"
            type="number"
            step="0.1"
            min="0"
            max="1"
            {...register('score_threshold', { valueAsNumber: true })}
          />
          {errors.score_threshold && (
            <p className="text-sm text-destructive">{errors.score_threshold.message}</p>
          )}
          <p className="text-xs text-muted-foreground">
            Similaridade mínima (0.0-1.0)
          </p>
        </div>
      </div>

      <div className="flex justify-end gap-2 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" disabled={isLoading}>
          {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {knowledgeBaseId ? 'Atualizar' : 'Criar'}
        </Button>
      </div>
    </form>
  );
}
