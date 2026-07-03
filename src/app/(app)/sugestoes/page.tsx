import { getSuggestions } from "@/lib/data/suggestion";
import { SuggestionsView } from "@/components/suggestions/suggestions-view";
import { Reveal } from "@/components/effects/reveal";

export default async function SugestoesPage() {
  const suggestions = await getSuggestions();
  return (
    <div className="max-w-3xl space-y-6">
      <Reveal>
        <h1 className="text-gradient text-4xl font-bold leading-none tracking-tighter" style={{ fontFamily: "var(--font-display)" }}>
          Sugestões
        </h1>
        <p className="mt-2 text-sm text-muted-foreground">Registre melhorias e problemas com texto e print.</p>
      </Reveal>
      <SuggestionsView suggestions={suggestions} />
    </div>
  );
}
