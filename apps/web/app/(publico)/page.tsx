import { ComoFunciona } from "@/components/landing/como-funciona";
import { Compromissos } from "@/components/landing/compromissos";
import { Dores } from "@/components/landing/dores";
import { Evidencia } from "@/components/landing/evidencia";
import { Fim } from "@/components/landing/fim";
import { Hero } from "@/components/landing/hero";
import { Perguntas } from "@/components/landing/perguntas";

export default function Landing() {
  return (
    <>
      <Hero />
      <Dores />
      <ComoFunciona />
      <Compromissos />
      <Evidencia />
      <Perguntas />
      <Fim />
    </>
  );
}
