"use client";

import * as React from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { entrarComSenha, LoginInvalidoError, limparLogin } from "@/lib/api/live/autenticacao";
import { lerConfigLive } from "@/lib/api/live/config";
import { entrarComLogin } from "@/lib/session/acoes";

/**
 * A entrada do sistema real, para a demonstração guiada (D1 do ADR 0015): e-mail e senha dos
 * logins criados pelo script. Aceita colar e o gerenciador de senhas (WCAG 3.3.8). Sem a
 * configuração do sistema real, nada aparece.
 */
export function EntrarComLogin({ de }: { de?: string }) {
  const config = React.useMemo(() => lerConfigLive(), []);
  const [erro, setErro] = React.useState<string | null>(null);
  const [enviando, setEnviando] = React.useState(false);
  if (!config) return null;

  const enviar = async (evento: React.FormEvent<HTMLFormElement>) => {
    evento.preventDefault();
    const dados = new FormData(evento.currentTarget);
    const email = String(dados.get("email") ?? "");
    const senha = String(dados.get("senha") ?? "");
    if (!email || !senha) {
      setErro("Preencha o e-mail e a senha.");
      return;
    }
    setEnviando(true);
    setErro(null);
    try {
      const tokens = await entrarComSenha(config, email, senha);
      const resultado = await entrarComLogin(tokens.acesso, de ?? null);
      if ("erro" in resultado) {
        limparLogin();
        setErro(resultado.erro);
        return;
      }
      // Carga completa: as cascas do servidor leem a sessão nova.
      window.location.assign(resultado.destino);
    } catch (falha) {
      setErro(
        falha instanceof LoginInvalidoError
          ? falha.message
          : "O sistema real não respondeu. Tente de novo ou entre no modo de demonstração.",
      );
    } finally {
      setEnviando(false);
    }
  };

  return (
    <section
      aria-labelledby="titulo-login"
      className="mt-10 max-w-[44rem] rounded-cartao border border-divisor bg-papel p-5"
    >
      <h2 id="titulo-login" className="font-serif text-2xl font-semibold">
        Entrar no sistema real
      </h2>
      <p className="mt-2 text-tinta-suave">
        Para a demonstração guiada, com os logins da demonstração. Os dados continuam fictícios; o
        que muda é que tudo passa pela API, pelo banco e pela cascata de verdade.
      </p>
      {erro ? (
        <Alert tone="erro" className="mt-4">
          {erro}
        </Alert>
      ) : null}
      <form onSubmit={enviar} className="mt-4 grid gap-4 sm:grid-cols-2" noValidate>
        <Field id="login-email" label="E-mail">
          {(aria) => (
            <Input {...aria} name="email" type="email" autoComplete="username" spellCheck={false} />
          )}
        </Field>
        <Field id="login-senha" label="Senha">
          {(aria) => (
            <Input {...aria} name="senha" type="password" autoComplete="current-password" />
          )}
        </Field>
        <div className="sm:col-span-2">
          <Button type="submit" disabled={enviando}>
            {enviando ? "Entrando…" : "Entrar com login"}
          </Button>
        </div>
      </form>
    </section>
  );
}
