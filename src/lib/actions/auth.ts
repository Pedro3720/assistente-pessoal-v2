"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { signupInput } from "@/lib/validation/profile";
import { uploadAvatarFile } from "@/lib/storage/avatar";
import { headers } from "next/headers";
import { resetRequestInput, passwordInput } from "@/lib/validation/auth";
import { clientIp, rateLimitOk } from "@/lib/ratelimit";

export async function login(formData: FormData) {
  const ip = await clientIp();
  if (!(await rateLimitOk("auth", ip))) {
    redirect(
      `/login?error=${encodeURIComponent("Muitas tentativas. Aguarde um instante e tente de novo.")}`
    );
  }

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
  const ip = await clientIp();
  if (!(await rateLimitOk("auth", ip))) {
    redirect(
      `/login?error=${encodeURIComponent("Muitas tentativas. Aguarde um instante e tente de novo.")}`
    );
  }

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
  const ip = await clientIp();
  if (!(await rateLimitOk("auth", ip))) {
    redirect(
      `/cadastro?error=${encodeURIComponent("Muitas tentativas. Aguarde um instante e tente de novo.")}`
    );
  }

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

export async function requestPasswordReset(formData: FormData): Promise<void> {
  const ip = await clientIp();
  if (!(await rateLimitOk("passwordReset", ip))) {
    redirect(
      `/recuperar-senha?message=${encodeURIComponent(
        "Muitas solicitações. Aguarde um pouco antes de tentar de novo."
      )}`
    );
  }

  const parsed = resetRequestInput.safeParse({ email: String(formData.get("email") ?? "") });
  if (!parsed.success) {
    redirect(`/recuperar-senha?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const proto = h.get("x-forwarded-proto") ?? "https";
  const origin = `${proto}://${host}`;

  const supabase = await createClient();
  // Ignora o resultado de propósito: sempre mostra a mesma mensagem neutra (anti-enumeração).
  await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/api/auth/callback`,
  });
  redirect(
    `/recuperar-senha?message=${encodeURIComponent(
      "Se existir uma conta com esse e-mail, enviamos um link para redefinir a senha."
    )}`
  );
}

export async function updatePassword(newPassword: string): Promise<{ error?: string }> {
  const ip = await clientIp();
  if (!(await rateLimitOk("passwordChange", ip))) {
    return { error: "Muitas tentativas. Aguarde um instante e tente de novo." };
  }

  const parsed = passwordInput.safeParse({ password: newPassword });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const supabase = await createClient();
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) return { error: error.message };
  revalidatePath("/", "layout");
  return {};
}
