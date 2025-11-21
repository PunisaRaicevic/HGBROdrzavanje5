import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Globe, ChevronDown } from 'lucide-react';
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

  const [showTestAccounts, setShowTestAccounts] = useState(false);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-primary/5 via-background to-background">
      {/* Language Selector - Top Right */}
      <div className="absolute top-4 right-4 z-10">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button 
              variant="outline" 
              className="gap-2 bg-background/80 backdrop-blur-sm min-h-11"
              data-testid="button-language-selector"
            >
              <Globe className="h-5 w-5" />
              <span className="text-base font-medium">{i18n.language === 'sr' ? 'SR' : 'EN'}</span>
              <ChevronDown className="h-4 w-4 opacity-50" />
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

      {/* Main Content */}
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-6">
            <img 
              src={logoImage} 
              alt="Budvanska Rivijera Logo" 
              className="h-32 w-auto object-contain"
            />
          </div>
          <h1 className="text-3xl font-semibold text-foreground mb-2">
            {i18n.language === 'sr' ? 'Tehnička Služba' : 'Technical Service'}
          </h1>
          <p className="text-muted-foreground text-base">
            {i18n.language === 'sr' ? 'Prijavite se da nastavite' : 'Sign in to continue'}
          </p>
        </div>

        {/* Login Form */}
        <div className="max-w-sm mx-auto w-full">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="username" className="text-base">{t('username')}</Label>
              <Input
                id="username"
                type="text"
                placeholder={i18n.language === 'sr' ? 'Unesite korisničko ime' : 'Enter username'}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                className="h-12 text-base"
                data-testid="input-username"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-base">{t('password')}</Label>
              <Input
                id="password"
                type="password"
                placeholder={i18n.language === 'sr' ? 'Unesite lozinku' : 'Enter password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-12 text-base"
                data-testid="input-password"
              />
            </div>

            <Button 
              type="submit" 
              className="w-full h-12 text-base font-medium mt-6" 
              disabled={isLoading} 
              data-testid="button-login"
            >
              {isLoading ? (i18n.language === 'sr' ? 'Prijavljivanje...' : 'Signing in...') : t('login')}
            </Button>
          </form>

          {/* Development Mode - Test Accounts */}
          {import.meta.env.DEV && (
            <div className="mt-8">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setShowTestAccounts(!showTestAccounts)}
                className="w-full text-sm text-muted-foreground min-h-11"
              >
                {showTestAccounts ? '▼' : '▶'} Test nalozi (Dev Mode)
              </Button>
              
              {showTestAccounts && (
                <div className="mt-3 p-4 rounded-md bg-muted/30 border border-muted">
                  <div className="space-y-2 text-xs">
                    <div className="grid grid-cols-3 gap-2 font-medium text-muted-foreground pb-2 border-b">
                      <span>{t('username')}</span>
                      <span>Lozinka</span>
                      <span>Uloga</span>
                    </div>
                    {[
                      { user: 'admin', role: 'Admin' },
                      { user: 'aleksandar', role: 'Operater' },
                      { user: 'petar', role: 'Šef' },
                      { user: 'direktor', role: 'Menadžer' },
                      { user: 'jovan', role: 'Radnik' },
                      { user: 'marko', role: 'Serviser' },
                      { user: 'milica', role: 'Recepcioner' }
                    ].map(({ user, role }) => (
                      <div key={user} className="grid grid-cols-3 gap-2 text-muted-foreground">
                        <span className="font-mono text-xs">{user}</span>
                        <span className="font-mono text-xs">pass...</span>
                        <span className="text-xs">{role}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="pb-8 text-center">
        <p className="text-xs text-muted-foreground">
          © 2025 Budvanska Rivijera • {i18n.language === 'sr' ? 'Sva prava zadržana' : 'All rights reserved'}
        </p>
      </div>
    </div>
  );
}
