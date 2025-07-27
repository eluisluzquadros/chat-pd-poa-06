
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

interface TagInputProps {
  tags: string[];
  setTags: (tags: string[]) => void;
}

export function TagInput({ tags, setTags }: TagInputProps) {
  const [currentTag, setCurrentTag] = useState("");

  const handleAddTag = () => {
    if (currentTag.trim() && !tags.includes(currentTag.trim())) {
      setTags([...tags, currentTag.trim()]);
      setCurrentTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(tag => tag !== tagToRemove));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTag();
    }
  };

  return (
    <div className="grid gap-2">
      <Label htmlFor="tags">Tags</Label>
      <div className="flex gap-2">
        <Input
          id="tags"
          value={currentTag}
          onChange={(e) => setCurrentTag(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="Adicione tags e pressione Enter"
        />
        <Button type="button" onClick={handleAddTag} variant="secondary">
          Adicionar
        </Button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="bg-secondary px-2 py-1 rounded-full text-sm flex items-center gap-1"
            >
              {tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="text-muted-foreground hover:text-foreground"
              >
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
