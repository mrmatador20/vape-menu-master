import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, Trash2, Shield, FileText, Loader2 } from 'lucide-react';
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Textarea } from '@/components/ui/textarea';
import { usePrivacyRights } from '@/hooks/usePrivacyRights';
import { Link } from 'react-router-dom';

export const PrivacyDataCard = () => {
  const { exportData, isExporting, requestDeletion, isRequesting } = usePrivacyRights();
  const [reason, setReason] = useState('');

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Shield className="h-5 w-5" /> Privacidade e Dados (LGPD)
        </CardTitle>
        <CardDescription>
          Você tem direito a acessar, corrigir, portar e excluir seus dados — Art. 18 da Lei 13.709/2018.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={exportData} disabled={isExporting} variant="outline" className="w-full justify-start">
          {isExporting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Download className="h-4 w-4 mr-2" />}
          Exportar todos os meus dados (JSON)
        </Button>

        <Button asChild variant="outline" className="w-full justify-start">
          <Link to="/data-rights"><FileText className="h-4 w-4 mr-2" />Ver minhas solicitações e consentimentos</Link>
        </Button>

        <Button asChild variant="ghost" className="w-full justify-start text-xs">
          <Link to="/privacy-policy">Ler Política de Privacidade</Link>
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" className="w-full justify-start">
              <Trash2 className="h-4 w-4 mr-2" />Solicitar exclusão da conta
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Solicitar exclusão dos seus dados</AlertDialogTitle>
              <AlertDialogDescription>
                Sua conta será anonimizada em até 15 dias úteis. Dados fiscais (pedidos) serão
                mantidos por 5 anos por obrigação legal (Art. 173 CTN), de forma desvinculada da sua
                identidade. Após a solicitação, você não poderá mais fazer login.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <Textarea
              placeholder="Motivo (opcional)"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              maxLength={500}
            />
            <AlertDialogFooter>
              <AlertDialogCancel>Cancelar</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => requestDeletion(reason || undefined)}
                disabled={isRequesting}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {isRequesting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Confirmar solicitação
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </CardContent>
    </Card>
  );
};
