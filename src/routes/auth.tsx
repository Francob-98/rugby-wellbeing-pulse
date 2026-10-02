import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Acceso staff · CBMM Rugby" },
      { name: "description", content: "Ingreso para preparadores físicos y entrenadores del CBMM." },
      { property: "og:title", content: "Acceso staff · CBMM Rugby" },
      { property: "og:description", content: "Panel de control de cargas del plantel." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  const signIn = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) { toast.error("Email o contraseña incorrectos"); return; }
    navigate({ to: "/panel" });
  };

  const signUp = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    if (password.length < 8) { toast.error("La contraseña debe tener al menos 8 caracteres"); return; }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: window.location.origin + "/panel", data: { full_name: name } },
    });
    setLoading(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Revisá tu email para confirmar la cuenta");
  };

  return (
    <div className="stripe-bg flex min-h-screen items-center justify-center bg-pitch px-4">
      <div className="w-full max-w-sm rounded-lg bg-card p-6 shadow-xl">
        <Link to="/" className="font-display text-sm uppercase tracking-[0.2em] text-muted-foreground">CBMM · Rugby</Link>
        <h1 className="mb-6 mt-2 font-display text-3xl font-bold uppercase">Acceso staff</h1>
        <Tabs defaultValue="in">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="in">Ingresar</TabsTrigger>
            <TabsTrigger value="up">Crear cuenta</TabsTrigger>
          </TabsList>
          <TabsContent value="in">
            <form onSubmit={signIn} className="space-y-3 pt-3">
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Contraseña</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <Button className="w-full" disabled={loading}>Ingresar</Button>
            </form>
          </TabsContent>
          <TabsContent value="up">
            <form onSubmit={signUp} className="space-y-3 pt-3">
              <div className="space-y-1.5"><Label>Nombre</Label><Input required maxLength={100} value={name} onChange={(e) => setName(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Email</Label><Input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
              <div className="space-y-1.5"><Label>Contraseña</Label><Input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
              <Button className="w-full" disabled={loading}>Crear cuenta</Button>
              <p className="text-xs text-muted-foreground">La primera cuenta es administradora. Las siguientes necesitan aprobación del admin.</p>
            </form>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
