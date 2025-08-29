
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface RecommendationCardProps {
  title: string;
  description: string;
  priority: "alta" | "media" | "baixa";
  tags: string[];
}

export const RecommendationCard = ({ title, description, priority, tags }: RecommendationCardProps) => {
  return (
    <div className="p-6 rounded-xl card-gradient border border-accent/20 space-y-4">
      <div className="space-y-2">
        <div className="flex items-start justify-between gap-4">
          <h3 className="font-semibold text-lg">{title}</h3>
          <Badge variant={
            priority === "alta" ? "destructive" :
            priority === "media" ? "default" :
            "secondary"
          }>
            {priority}
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="flex flex-wrap gap-2">
        {tags.map((tag) => (
          <Badge key={tag} variant="outline">
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  );
};
