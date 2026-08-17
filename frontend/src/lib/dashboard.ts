import { differenceInCalendarDays } from 'date-fns';

export interface FaixaReprovacao {
  bg: string;
  text: string;
  label: string;
}

// Faixas de cor por % de reprovação, conforme especificação do dashboard.
export function faixaReprovacao(percentual: number | null): FaixaReprovacao {
  if (percentual === null) {
    return { bg: '#F3F4F6', text: '#6B7280', label: 'Sem análises' };
  }
  if (percentual === 0) {
    return { bg: '#EAF3DE', text: '#27500A', label: '0%' };
  }
  if (percentual <= 25) {
    return { bg: '#FAEEDA', text: '#633806', label: '1–25%' };
  }
  if (percentual < 75) {
    return { bg: '#F09595', text: '#791F1F', label: '26–74%' };
  }
  return { bg: '#E24B4A', text: '#FFFFFF', label: '≥75%' };
}

export function tempoRelativo(dataPrevista: string | Date): string {
  const dias = differenceInCalendarDays(new Date(dataPrevista), new Date());
  if (dias < 0) return `há ${Math.abs(dias)} dia${Math.abs(dias) === 1 ? '' : 's'}`;
  if (dias === 0) return 'vence hoje';
  if (dias === 1) return 'amanhã';
  return `em ${dias} dias`;
}
