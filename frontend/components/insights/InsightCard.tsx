
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface InsightCardProps {
  title: string;
  description: string;
}

export const InsightCard = ({ title, description }: InsightCardProps) => {
  return (
    <Card className="border-accent/20 bg-transparent">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <CardDescription>{description}</CardDescription>
      </CardContent>
    </Card>
  );
};
