import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTheme } from "@/components/ui/theme-provider";
import { Monitor, Moon, Sun } from "lucide-react";

const AppearanceTab = () => {
  const { theme, setTheme, mounted } = useTheme();

  if (!mounted) return null;

  const themeOptions = [
    { value: "light", label: "Claro", icon: Sun },
    { value: "dark", label: "Escuro", icon: Moon },
    { value: "system", label: "Sistema", icon: Monitor },
  ];

  const currentTheme = themeOptions.find(option => option.value === theme);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            {currentTheme?.icon && <currentTheme.icon className="h-5 w-5" />}
            Aparência
          </CardTitle>
          <CardDescription>
            Personalize a aparência da interface de acordo com suas preferências.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="theme-select">Tema</Label>
            <Select value={theme} onValueChange={setTheme}>
              <SelectTrigger id="theme-select" className="w-full max-w-xs">
                <SelectValue placeholder="Selecione um tema" />
              </SelectTrigger>
              <SelectContent>
                {themeOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    <div className="flex items-center gap-2">
                      <option.icon className="h-4 w-4" />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground">
              {theme === "system" 
                ? "Seguirá automaticamente as configurações do seu sistema operacional."
                : `Tema ${theme === "light" ? "claro" : "escuro"} ativado.`
              }
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AppearanceTab;