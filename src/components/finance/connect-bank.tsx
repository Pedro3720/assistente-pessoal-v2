"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Link2, Lock, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Modal } from "@/components/ui/modal";
import { savePluggyItem } from "@/lib/actions/pluggy";

// o widget só é baixado quando o usuário decide conectar
const PluggyConnect = dynamic(
  () => import("react-pluggy-connect").then((m) => m.PluggyConnect),
  { ssr: false }
);

type Etapa = "fechado" | "consentimento" | "widget";

/**
 * Conectar banco pelo Open Finance.
 *
 * O fluxo tem duas partes de propósito: primeiro o consentimento, explicando o
 * que será lido e deixando claro que a senha é digitada na Pluggy; depois o
 * widget. O Zênite nunca recebe, transporta ou guarda credencial bancária:
 * o navegador só recebe um Connect Token curto, emitido pelo servidor.
 */
export function ConnectBank() {
  const router = useRouter();
  const { resolvedTheme } = useTheme();
  const [etapa, setEtapa] = useState<Etapa>("fechado");
  const [token, setToken] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(false);

  async function iniciar() {
    setCarregando(true);
    try {
      const res = await fetch("/api/pluggy/connect-token", { method: "POST" });
      const dados = await res.json();
      if (!res.ok) throw new Error(dados?.error ?? "Não foi possível iniciar a conexão.");
      setToken(dados.connectToken);
      setEtapa("widget");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Não foi possível iniciar a conexão.");
      setEtapa("fechado");
    } finally {
      setCarregando(false);
    }
  }

  async function aoConectar(itemId: string) {
    setEtapa("fechado");
    setToken(null);
    const aviso = toast.loading("Conectando e buscando suas contas...");
    try {
      const r = await savePluggyItem(itemId);
      toast.success(
        `Banco conectado: ${r.contas} ${r.contas === 1 ? "conta" : "contas"} e ${r.transacoes} ${
          r.transacoes === 1 ? "transação" : "transações"
        }.`,
        { id: aviso }
      );
      router.refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar a conexão.", { id: aviso });
    }
  }

  return (
    <>
      <button
        onClick={() => setEtapa("consentimento")}
        className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground"
      >
        <Link2 className="h-3.5 w-3.5" /> Conectar banco
      </button>

      {etapa === "consentimento" && (
        <Modal onClose={() => setEtapa("fechado")} title="Conectar seu banco">
          <div className="space-y-4">
            <div className="flex gap-3 rounded-xl border border-border bg-muted/40 p-3">
              <Lock className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
              <p className="text-sm text-muted-foreground">
                A senha do seu banco é digitada na tela da <strong>Pluggy</strong>, a empresa
                autorizada pelo Banco Central que faz a conexão. O Zênite não vê, não recebe e não
                guarda a sua senha em momento nenhum.
              </p>
            </div>

            <div>
              <p className="mb-2 text-sm font-medium">O que o app vai ler:</p>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                <li className="flex gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
                  Suas contas e os saldos delas
                </li>
                <li className="flex gap-2">
                  <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-positive" />
                  As movimentações dos últimos 90 dias e as novas que aparecerem
                </li>
              </ul>
            </div>

            <p className="text-xs text-muted-foreground">
              A leitura é somente consulta: nada pode ser movimentado na sua conta pelo app. Você
              pode desconectar quando quiser, e ao desconectar escolhe se apaga ou mantém as
              transações já importadas.
            </p>

            <div className="flex gap-2">
              <button
                onClick={iniciar}
                disabled={carregando}
                className="flex-1 rounded-lg bg-primary py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                {carregando ? "Abrindo..." : "Continuar"}
              </button>
              <button
                onClick={() => setEtapa("fechado")}
                className="rounded-lg border border-border px-4 py-2.5 text-sm text-muted-foreground hover:bg-accent"
              >
                Cancelar
              </button>
            </div>
          </div>
        </Modal>
      )}

      {etapa === "widget" && token && (
        <PluggyConnect
          connectToken={token}
          includeSandbox={process.env.NODE_ENV !== "production"}
          language="pt"
          theme={resolvedTheme === "light" ? "light" : "dark"}
          onSuccess={(dados: { item: { id: string } }) => aoConectar(dados.item.id)}
          onError={() => {
            toast.error("Não foi possível concluir a conexão.");
            setEtapa("fechado");
            setToken(null);
          }}
          onClose={() => {
            setEtapa("fechado");
            setToken(null);
          }}
        />
      )}
    </>
  );
}
