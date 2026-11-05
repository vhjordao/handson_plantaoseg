/**
 * O relógio da demonstração: fixo na âncora (quinta, 01/10/2026, 9h) e só anda quando a
 * pessoa que conduz a apresentação manda (`avancar`). Nada aqui lê a hora do computador.
 */
import type { DataHora } from "../types";
import { diaDe, somarMinutos } from "./datas";

export class Relogio {
  private minutos = 0;

  constructor(readonly ancora: DataHora) {}

  agora(): DataHora {
    return somarMinutos(this.ancora, this.minutos);
  }

  /** O dia de "agora", como "AAAA-MM-DD" (o "hoje" que o texto da vaga pode citar). */
  hoje(): string {
    return diaDe(this.agora());
  }

  /** Adianta o relógio; só para frente. Devolve o novo "agora". */
  avancar(minutos: number): DataHora {
    if (!Number.isFinite(minutos) || minutos < 0) {
      throw new RangeError("O relógio da demonstração só avança (minutos >= 0).");
    }
    this.minutos += minutos;
    return this.agora();
  }

  /** Quantos minutos o relógio já andou desde a âncora (vai para o estado guardado). */
  get minutosAvancados(): number {
    return this.minutos;
  }

  restaurar(minutosAvancados: number): void {
    this.minutos = Math.max(0, minutosAvancados);
  }

  reiniciar(): void {
    this.minutos = 0;
  }
}
