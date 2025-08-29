
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ReactNode } from "react";

interface AccountCardProps {
  title: string;
  buttonText: string;
  buttonIcon: ReactNode;
  disabled?: boolean;
  onClick?: () => void;
}

const AccountCard = ({ 
  title, 
  buttonText, 
  buttonIcon, 
  disabled = false, 
  onClick 
}: AccountCardProps) => {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Button 
          variant="outline" 
          className="w-full flex items-center justify-center gap-2"
          disabled={disabled}
          onClick={onClick}
        >
          {buttonIcon}
          <span>{buttonText}</span>
        </Button>
      </CardContent>
    </Card>
  );
};

export default AccountCard;
