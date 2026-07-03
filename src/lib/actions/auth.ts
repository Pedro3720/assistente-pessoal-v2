"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signupInput } from "@/lib/validation/profile";
import { uploadAvatarFile } from "@/lib/storage/avatar";

export async function login(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/", "layout");
  redirect("/");
}

export async function signup(formData: FormData) {
  const supabase = await createClient();

  const { error } = await supabase.auth.signUp({
    email: String(formData.get("email") ?? ""),
    password: String(formData.get("password") ?? ""),
  });

  if (error) {
    redirect(`/login?error=${encodeURIComponent(error.message)}`);
  }

  redirect(
    `/login?message=${encodeURIComponent(
      "Conta criada. Se a confirmação por e-mail estiver ativa, confirme antes de entrar."
    )}`
  );
}

export async function signupWithProfile(formData: FormData): Promise<void> {
  const supabase = await createClient();

  const parsed = signupInput.safeParse({
    display_name: formData.get("display_name"),
    email: formData.get("email"),
    password: formData.get("password"),
    phone: (formData.get("phone") as string) || null,
    avatar_url: (formData.get("avatar_url") as string) || null,
  });
  if (!parsed.success) {
    redirect(`/cadastro?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }
  const { display_name, email, password, phone } = parsed.data;

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { display_name, phone } },
  });
  if (error) {
    redirect(`/cadastro?error=${encodeURIComponent(error.message)}`);
  }

  // Confirmação de e-mail DESLIGADA → há sessão: sobe foto e completa o perfil.
  if (data.session && data.user) {
    let avatar_url = parsed.data.avatar_url;
    const file = formData.get("avatar_file");
    if (file instanceof File && file.size > 0) {
      try {
        avatar_url = await uploadAvatarFile(supabase, data.user.id, file);
      } catch {
        // Conta já foi criada; falha no upload da foto não deve interromper o cadastro.
        avatar_url = parsed.data.avatar_url;
      }
    }
    const { error: profileError } = await supabase
      .from("profiles")
      .upsert({ id: data.user.id, display_name, phone, avatar_url });
    if (profileError) {
      redirect(
        `/login?message=${encodeURIComponent(
          "Conta criada, mas houve um erro ao salvar o perfil. Tente entrar e completar o perfil."
        )}`
      );
    }
    revalidatePath("/", "layout");
    redirect("/");
  }

  // Confirmação de e-mail LIGADA → sem sessão: perfil básico já veio do gatilho.
  redirect(
    `/login?message=${encodeURIComponent(
      "Conta criada. Confirme o e-mail e depois envie sua foto em Perfil."
    )}`
  );
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
