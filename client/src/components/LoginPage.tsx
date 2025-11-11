import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Globe } from 'lucide-react';
import logoImage from '@assets/budvanska-color-centralno-transparent_1762428184467.png';

interface LoginPageProps {
  onLogin: (username: string, password: string) => Promise<void>;
}

export default function LoginPage({ onLogin }: LoginPageProps) {
  const { t, i18n } = useTranslation();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      await onLogin(username, password);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLanguageChange = (lang: string) => {
    i18n.changeLanguage(lang);
    localStorage.setItem('language', lang);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <Card className="w-full max-w-md relative">
        <div className="absolute top-4 right-4 z-10">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="outline" 
                size="sm"
                className="gap-1.5"
                data-testid="button-language-selector"
              >
                <Globe className="h-4 w-4" />
                <span className="text-xs font-medium">{i18n.language.toUpperCase()}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
            <DropdownMenuItem 
              onClick={() => handleLanguageChange('sr')}
              data-testid="option-language-sr"
              className={i18n.language === 'sr' ? 'bg-accent' : ''}
            >
              Srpski
            </DropdownMenuItem>
            <DropdownMenuItem 
              onClick={() => handleLanguageChange('en')}
              data-testid="option-language-en"
              className={i18n.language === 'en' ? 'bg-accent' : ''}
            >
              English
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
        </div>

        <CardHeader className="space-y-4">
          <div className="flex items-center justify-center">
            <img 
              src={logoImage} 
              alt="Budvanska Rivijera Logo" 
              className="h-24 w-auto object-contain"
            />
          </div>
          <div className="text-center">
            <CardTitle className="text-2xl">
              {i18n.language === 'sr' ? 'Tehnička Služba' : 'Technical Service'}
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">{t('username')}</Label>
              <Input
                id="username"
                type="text"
                placeholder={i18n.language === 'sr' ? 'aleksandar' : 'username'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                data-testid="input-username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                data-testid="input-password"
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading} data-testid="button-login">
              {isLoading ? 'Prijavljivanje...' : t('login')}
            </Button>
          </form>

          {/* Development helper - test accounts */}
          {import.meta.env.DEV && (
            <div className="mt-6 p-4 rounded-md bg-muted/50 border">
              <p className="text-xs font-medium text-muted-foreground mb-3">Test nalozi (Dev Mode):</p>
              <div className="space-y-1.5 text-xs">
                <div className="grid grid-cols-[1.5fr,1.2fr,1.2fr] gap-2 font-medium text-muted-foreground pb-1 border-b">
                  <span>{t('username')}</span>
                  <span>{t('password')}</span>
                  <span>Uloga</span>
                </div>
                <div className="grid grid-cols-[1.5fr,1.2fr,1.2fr] gap-2 text-muted-foreground font-mono">
                  <span>admin</span>
                  <span>password123</span>
                  <span className="font-sans">admin</span>
                </div>
                <div className="grid grid-cols-[1.5fr,1.2fr,1.2fr] gap-2 text-muted-foreground font-mono">
                  <span>aleksandar</span>
                  <span>password123</span>
                  <span className="font-sans">operater</span>
                </div>
                <div className="grid grid-cols-[1.5fr,1.2fr,1.2fr] gap-2 text-muted-foreground font-mono">
                  <span>petar</span>
                  <span>password123</span>
                  <span className="font-sans">sef</span>
                </div>
                <div className="grid grid-cols-[1.5fr,1.2fr,1.2fr] gap-2 text-muted-foreground font-mono">
                  <span>direktor</span>
                  <span>password123</span>
                  <span className="font-sans">menadzer</span>
                </div>
                <div className="grid grid-cols-[1.5fr,1.2fr,1.2fr] gap-2 text-muted-foreground font-mono">
                  <span>jovan</span>
                  <span>password123</span>
                  <span className="font-sans">radnik</span>
                </div>
                <div className="grid grid-cols-[1.5fr,1.2fr,1.2fr] gap-2 text-muted-foreground font-mono">
                  <span>marko</span>
                  <span>password123</span>
                  <span className="font-sans">serviser</span>
                </div>
                <div className="grid grid-cols-[1.5fr,1.2fr,1.2fr] gap-2 text-muted-foreground font-mono">
                  <span>milica</span>
                  <span>password123</span>
                  <span className="font-sans">recepcioner</span>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
