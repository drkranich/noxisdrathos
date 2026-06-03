import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { uploadToBucket } from "@/lib/storage";
import { useAuth } from "@/lib/auth";
import { CinematicHero } from "@/components/CinematicHero";

export const Route = createFileRoute("/_authenticated/app/settings")({
  head: () => ({ meta: [{ title: "Configurações — Observatório" }, { name: "robots", content: "noindex" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name,bio,avatar_url")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setDisplayName(data.display_name ?? "");
          setBio(data.bio ?? "");
          setAvatarUrl(data.avatar_url ?? "");
        }
      });
  }, [user?.id]);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    setUploadingAvatar(true);
    setMsg(null);
    try {
      const result = await uploadToBucket({
        bucket: "avatars",
        file,
        pathPrefix: user.id,
      });
      // Gera URL pública para o avatar (bucket avatars é público)
      const { data } = supabase.storage.from("avatars").getPublicUrl(result.path);
      setAvatarUrl(data.publicUrl);
      setMsg("Avatar enviado.");
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Falha no upload.");
    } finally {
      setUploadingAvatar(false);
      setTimeout(() => setMsg(null), 2500);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setSaving(true);
    setMsg(null);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: displayName || null, bio: bio || null, avatar_url: avatarUrl || null })
      .eq("id", user.id);
    setSaving(false);
    setMsg(error ? "Falha ao salvar." : "Atualizado.");
    setTimeout(() => setMsg(null), 2500);
  };

  const sendReset = async () => {
    if (!user?.email) return;
    await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setMsg("Email enviado.");
    setTimeout(() => setMsg(null), 2500);
  };

  return (
    <div className="pb-24">
      <CinematicHero
        eyebrow="conta · configurações"
        title="Configurações."
        lead="Sua identidade silenciosa dentro do observatório."
        height="sm"
      />

      <div className="px-8 lg:px-14 pt-10 max-w-2xl space-y-10">
        <form onSubmit={save} className="border border-border p-6 space-y-5">
          <h2 className="font-display text-xl">Perfil</h2>
          <Field label="nome de exibição">
            <input
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              className="w-full bg-transparent border-b border-border focus:border-foreground outline-none py-2 text-sm"
              maxLength={80}
            />
          </Field>
          <Field label="bio">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full bg-transparent border border-border focus:border-foreground outline-none p-3 text-sm resize-none"
              maxLength={500}
            />
          </Field>
          <Field label="avatar">
            <div className="flex items-center gap-4 mt-2">
              {avatarUrl ? (
                <img src={avatarUrl} alt="avatar" className="h-14 w-14 rounded-full object-cover border border-border shrink-0" />
              ) : (
                <div className="h-14 w-14 rounded-full bg-muted border border-border shrink-0" />
              )}
              <div className="flex-1 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer font-mono text-[11px] uppercase tracking-[0.25em] border border-border px-3 py-2 hover:bg-accent transition w-fit">
                  {uploadingAvatar ? "enviando…" : "escolher foto"}
                  <input
                    type="file"
                    accept="image/*"
                    className="sr-only"
                    disabled={uploadingAvatar}
                    onChange={handleAvatarUpload}
                  />
                </label>
                {avatarUrl && (
                  <button
                    type="button"
                    onClick={() => setAvatarUrl("")}
                    className="font-mono text-[10px] uppercase tracking-[0.25em] text-muted-foreground hover:text-destructive"
                  >
                    remover
                  </button>
                )}
              </div>
            </div>
          </Field>
          <div className="flex items-center gap-4">
            <button
              type="submit"
              disabled={saving}
              className="font-mono text-[11px] uppercase tracking-[0.3em] bg-foreground text-background px-5 py-3 disabled:opacity-50"
            >
              {saving ? "salvando…" : "salvar →"}
            </button>
            {msg ? <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{msg}</span> : null}
          </div>
        </form>

        <section className="border border-border p-6 space-y-4">
          <h2 className="font-display text-xl">Conta</h2>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">email</span>
            <span className="font-mono text-xs">{user?.email}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">id</span>
            <span className="font-mono text-[10px]">{user?.id}</span>
          </div>
          <div className="flex flex-wrap gap-4 pt-2">
            <button
              onClick={sendReset}
              className="font-mono text-[11px] uppercase tracking-[0.3em] border border-border px-4 py-2 hover:bg-accent"
            >
              redefinir senha
            </button>
            <button
              onClick={() => signOut()}
              className="font-mono text-[11px] uppercase tracking-[0.3em] border border-border px-4 py-2 hover:bg-accent"
            >
              sair
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="font-mono text-[10px] uppercase tracking-[0.3em] text-muted-foreground">{label}</span>
      <div className="mt-2">{children}</div>
    </label>
  );
}
