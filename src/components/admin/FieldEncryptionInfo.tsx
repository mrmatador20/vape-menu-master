import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Lock, Shield, CheckCircle, Info } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

const FieldEncryptionInfo = () => {
  const encryptedFields = [
    { table: 'profiles', field: 'phone', status: 'protected', method: 'RLS + TLS' },
    { table: 'profiles', field: 'address_*', status: 'protected', method: 'RLS + TLS' },
    { table: 'saved_addresses', field: 'all fields', status: 'protected', method: 'RLS + TLS' },
    { table: 'notification_preferences', field: 'phone_number', status: 'protected', method: 'RLS + TLS' },
    { table: 'mfa_backup_codes', field: 'code_hash', status: 'hashed', method: 'SHA-256' },
    { table: 'security_questions', field: 'answer_*_hash', status: 'hashed', method: 'SHA-256' },
    { table: 'account_recovery_tokens', field: 'token', status: 'protected', method: 'RLS + Service Role' },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Lock className="h-5 w-5" />
          Proteção de Dados Sensíveis
        </CardTitle>
        <CardDescription>
          Status de criptografia e proteção de campos sensíveis no banco de dados
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            <strong>Supabase Vault</strong> é destinado a gerenciamento de secrets (API keys, tokens), 
            não para criptografia de campos de usuário. Para dados sensíveis, utilizamos uma combinação 
            de RLS (Row Level Security), criptografia TLS em trânsito, e hashing para dados que não 
            precisam ser reversíveis.
          </AlertDescription>
        </Alert>

        {/* Protection Methods */}
        <div className="space-y-4">
          <h4 className="font-medium flex items-center gap-2">
            <Shield className="h-4 w-4" />
            Métodos de Proteção Implementados
          </h4>

          <div className="grid gap-3">
            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default">TLS 1.3</Badge>
                <span className="font-medium">Criptografia em Trânsito</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Todos os dados são criptografados durante a transmissão entre cliente e servidor
                usando TLS 1.3, o padrão mais seguro disponível.
              </p>
            </div>

            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default">AES-256</Badge>
                <span className="font-medium">Criptografia em Repouso</span>
              </div>
              <p className="text-sm text-muted-foreground">
                O Supabase criptografa automaticamente todos os dados em repouso no banco de dados
                usando AES-256, padrão de criptografia de nível militar.
              </p>
            </div>

            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default">RLS</Badge>
                <span className="font-medium">Row Level Security</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Políticas de segurança em nível de linha garantem que usuários só acessem
                seus próprios dados, mesmo em caso de vulnerabilidade na aplicação.
              </p>
            </div>

            <div className="p-3 border rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Badge variant="default">SHA-256</Badge>
                <span className="font-medium">Hashing Irreversível</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Dados que não precisam ser lidos (códigos de backup, respostas de segurança)
                são armazenados como hash, impossibilitando recuperação em caso de vazamento.
              </p>
            </div>
          </div>
        </div>

        {/* Fields Status Table */}
        <div className="space-y-3">
          <h4 className="font-medium">Status dos Campos Sensíveis</h4>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3">Tabela</th>
                  <th className="text-left p-3">Campo</th>
                  <th className="text-left p-3">Status</th>
                  <th className="text-left p-3">Método</th>
                </tr>
              </thead>
              <tbody>
                {encryptedFields.map((field, index) => (
                  <tr key={index} className="border-t">
                    <td className="p-3 font-mono text-xs">{field.table}</td>
                    <td className="p-3 font-mono text-xs">{field.field}</td>
                    <td className="p-3">
                      <Badge 
                        variant={field.status === 'hashed' ? 'secondary' : 'default'}
                        className="gap-1"
                      >
                        <CheckCircle className="h-3 w-3" />
                        {field.status === 'hashed' ? 'Hashed' : 'Protegido'}
                      </Badge>
                    </td>
                    <td className="p-3 text-muted-foreground">{field.method}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Recommendations */}
        <div className="bg-muted/50 p-4 rounded-lg space-y-2">
          <h4 className="font-medium text-sm">Proteções Adicionais Ativas:</h4>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Validação e sanitização de entrada em todos os formulários
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Logs de auditoria para acesso a dados sensíveis
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Mascaramento de dados em views públicas (user IDs anonimizados)
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Políticas de retenção configuráveis para dados sensíveis
            </li>
            <li className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              Backup automático com criptografia AES-256
            </li>
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          💡 Para criptografia adicional de campos específicos no nível de aplicação, 
          considere implementar criptografia client-side antes de enviar ao banco de dados.
          Isso adiciona uma camada extra de proteção, mas aumenta a complexidade de manutenção.
        </p>
      </CardContent>
    </Card>
  );
};

export default FieldEncryptionInfo;
