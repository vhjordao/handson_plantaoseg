/**
 * As personas fictícias da demonstração, lidas das fixtures geradas do pipeline real
 * (`scripts/exportar_fixtures_web.py`). Só o servidor importa este arquivo: a tela de entrada
 * passa ao navegador apenas o que ele precisa para sortear.
 */
import { z } from "zod";
import mundo from "@/lib/demo/mundo.json";
import { PersonaSchema, type Papel, type Persona } from "@/lib/api/types";

export type PersonaCoordenador = Extract<Persona, { papel: "coordenador" }>;
export type PersonaMedico = Extract<Persona, { papel: "medico" }>;

// Valida uma vez, na carga do módulo: se a fixture sair do contrato, o build avisa.
const PERSONAS: Persona[] = z.array(PersonaSchema).parse(mundo.personas);

export function listarPersonasDemo(): {
  coordenadores: PersonaCoordenador[];
  medicos: PersonaMedico[];
} {
  return {
    coordenadores: PERSONAS.filter((p): p is PersonaCoordenador => p.papel === "coordenador"),
    medicos: PERSONAS.filter((p): p is PersonaMedico => p.papel === "medico"),
  };
}

/**
 * Quem entrou com o login da demonstração (modo `live`). O coordenador vale para a rede inteira;
 * o médico é o do login, e usa a persona de mesmo id quando ela existe.
 */
export function personaDoLogin(papel: "coordenador" | "medico", id: string | null): Persona {
  if (papel === "coordenador") {
    return {
      papel: "coordenador",
      id: "login",
      pseudoId: "login",
      nome: "Coordenação (login da demonstração)",
      cargo: "Coordenação de escala",
      unidade: { id: "rede", nome: "Rede simulada, três hospitais", zona: "rede" },
    };
  }
  const persona = id ? encontrarPersona("medico", id) : null;
  if (persona) return persona;
  const pseudonimo = (id ?? "login").slice(0, 8);
  return {
    papel: "medico",
    id: id ?? "login",
    medico: {
      id: id ?? "login",
      pseudonimo,
      nome: `Médico ${pseudonimo}`,
      crm: "Login da demonstração",
      especialidade: "clinica_medica",
      especialidadeSecundaria: null,
    },
  };
}

/** Confere se a persona existe e é do papel pedido: o cookie nunca vale sem isso. */
export function encontrarPersona(papel: Papel, id: string | null | undefined): Persona | null {
  if (!id) return null;
  return PERSONAS.find((p) => p.papel === papel && p.id === id) ?? null;
}
