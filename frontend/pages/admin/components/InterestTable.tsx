
import { InterestUser } from "@/types/interest";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface InterestTableProps {
  interests: InterestUser[];
  onSelectInterest: (interest: InterestUser) => void;
  loading?: boolean;
  onAccountCreated?: () => void;
}

const InterestTable = ({ interests, onSelectInterest, loading = false }: InterestTableProps) => {
  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="outline">Pendente</Badge>;
      case 'approved':
        return <Badge variant="success">Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Rejeitado</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };


  return (
    <div className="rounded-md border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Nome</TableHead>
            <TableHead>Email</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {loading ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                Carregando manifestações de interesse...
              </TableCell>
            </TableRow>
          ) : interests.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} className="text-center py-6 text-gray-500">
                Nenhuma manifestação de interesse encontrada
              </TableCell>
            </TableRow>
          ) : (
            interests.map((interest) => (
              <TableRow key={interest.id}>
                <TableCell className="font-medium">{interest.full_name}</TableCell>
                <TableCell>{interest.email}</TableCell>
                <TableCell>
                  {getStatusBadge(interest.status || 'pending')}
                </TableCell>
                <TableCell className="text-right">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onSelectInterest(interest)}
                  >
                    Converter em Usuário
                  </Button>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>
    </div>
  );
};

export default InterestTable;
