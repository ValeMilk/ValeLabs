import { formatarData } from '../types/shared-types';

export const AZUL = '#2a78d6';
export const VERDE = '#16A34A';
export const VERMELHO = '#E24B4A';
export const VERDE_ESCURO = '#166534';
export const VERMELHO_ESCURO = '#991B1B';

/**
 * Paleta categórica validada (CVD ΔE ≥ 8 em pares adjacentes, piso de visão
 * normal ≥ 15). A ordem é fixa: a cor acompanha a entidade, não a posição, então
 * filtrar séries não repinta as que sobraram.
 */
export const PALETA_SERIES = [
  '#2a78d6', // azul
  '#eb6834', // laranja
  '#1baf7a', // água
  '#eda100', // amarelo
  '#e87ba4', // magenta
  '#008300', // verde
  '#4a3aa7', // violeta
  '#e34948', // vermelho
];

export const COR_SERIE_EXCEDENTE = '#6B7280';

/**
 * Rótulos do eixo X adaptados à distribuição das datas: quando várias análises
 * caem no mesmo dia, a data sozinha não distingue os pontos e a hora entra junto.
 */
export function criarRotuladorDeData(datas: string[]) {
  const diasDistintos = new Set(datas.map((d) => new Date(d).toDateString()));
  const hora = (data: string) =>
    new Date(data).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

  return {
    curto: (data: string) => {
      if (diasDistintos.size <= 1) return hora(data);
      if (diasDistintos.size < datas.length) {
        const d = new Date(data);
        return `${d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })} ${hora(data)}`;
      }
      return formatarData(data);
    },
    completo: (data: string) => `${formatarData(data)} ${hora(data)}`,
  };
}
