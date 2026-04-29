import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Config() {
  return (
    <div className="p-6 max-w-3xl space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Configurações</h1>
        <p className="text-sm text-muted-foreground">Ajustes da operação.</p>
      </div>
      <Card>
        <CardHeader><CardTitle className="text-base">Capacidade</CardTitle></CardHeader>
        <CardContent className="text-sm text-muted-foreground space-y-2">
          <p>Capacidade configurada: <strong>10 clientes ativos em paralelo</strong>.</p>
          <p>Estimativa de entrega: ~3 a 4 semanas por cliente (~10 a 12h de trabalho ativo).</p>
          <p className="pt-2 border-t">Em versões futuras: atribuição por funcionário, integração direta com Antigravity, exportação de checklist em PDF.</p>
        </CardContent>
      </Card>
    </div>
  );
}
