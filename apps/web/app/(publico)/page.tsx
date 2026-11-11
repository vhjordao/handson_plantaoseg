import { ComoFunciona } from "@/components/landing/como-funciona";
import { Compromissos } from "@/components/landing/compromissos";
import { Dores } from "@/components/landing/dores";
import { Evidencia } from "@/components/landing/evidencia";
import { Fim } from "@/components/landing/fim";
import { Perguntas } from "@/components/landing/perguntas";
import { Vitrine } from "@/components/landing/vitrine";

export default function Landing() {
  return (
    <>
      <Vitrine />
      <Dores />
      <ComoFunciona />
      <Compromissos />
      <Evidencia />
      <Perguntas />
      <Fim />
    </>
  );
}
