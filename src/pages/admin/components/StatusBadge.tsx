
import { Badge } from "@/components/ui/badge";

interface StatusBadgeProps {
  status: string;
  accountCreated: boolean;
}

const StatusBadge = ({ status, accountCreated }: StatusBadgeProps) => {
  if (accountCreated) {
    return <Badge className="bg-green-500">Conta criada</Badge>;
  }
  
  switch (status) {
    case 'pending':
      return <Badge variant="outline" className="text-yellow-500 border-yellow-500">Pendente</Badge>;
    case 'approved':
      return <Badge className="bg-blue-500">Aprovado</Badge>;
    case 'rejected':
      return <Badge variant="destructive">Rejeitado</Badge>;
    default:
      return <Badge variant="outline">Desconhecido</Badge>;
  }
};

export default StatusBadge;
