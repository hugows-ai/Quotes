import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useTranslations } from '@/hooks/useTranslations';

// >>> Link do instalador (.exe) do aplicativo para Windows. <<<
// Troque pelo endereço onde você hospedou o arquivo (ex.: GitHub Releases),
// ou coloque o .exe em public/downloads/ e mantenha o caminho abaixo.
export const DESKTOP_APP_DOWNLOAD_URL =
  'https://github.com/hugows-ai/Quotes/releases/download/v1.0.0/Quotes-Portable-1.0.0.exe';

const LABELS: Record<string, string> = {
  'pt-BR': 'Baixar app para Windows',
  en: 'Download Windows app',
  es: 'Descargar app para Windows',
};

export function DownloadAppButton() {
  const { language } = useTranslations();
  // Dentro do próprio app desktop o botão não faz sentido.
  if (typeof window !== 'undefined' && 'quotesBridge' in window) return null;

  return (
    <div className="px-3 pt-1">
      <Button
        asChild
        variant="ghost"
        size="sm"
        className="w-full gap-2 text-muted-foreground"
      >
        <a href={DESKTOP_APP_DOWNLOAD_URL} download>
          <Download className="h-4 w-4" />
          {LABELS[language] || LABELS.en}
        </a>
      </Button>
    </div>
  );
}
