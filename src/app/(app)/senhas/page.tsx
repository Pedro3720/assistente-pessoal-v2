import { getPasswords } from "@/lib/data/password";
import { PasswordsView } from "@/components/passwords/passwords-view";
import type { PasswordItem } from "@/types/password";

export default async function SenhasPage() {
  let passwords: PasswordItem[];
  try {
    passwords = await getPasswords();
  } catch (e) {
    return <PasswordsLoadError message={e instanceof Error ? e.message : "Erro desconhecido"} />;
  }

  return <PasswordsView passwords={passwords} />;
}

function PasswordsLoadError({ message }: { message: string }) {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="text-3xl md:text-4xl font-extrabold leading-none tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
        Senhas
      </h1>
      <div className="mt-6 rounded-xl border border-amber-300 bg-amber-50 p-6 text-sm text-amber-900">
        <p className="font-semibold">Não foi possível carregar o cofre.</p>
        <p className="mt-1 font-mono text-xs text-amber-800">{message}</p>
        <p className="mt-3">
          Se a tabela ainda não existe, rode{" "}
          <code className="rounded bg-amber-100 px-1">supabase/migrations/20260701000003_passwords.sql</code>{" "}
          no SQL Editor do Supabase e recarregue.
        </p>
      </div>
    </div>
  );
}
