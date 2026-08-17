import { CheckCircle, Clock, ListX, XCircle } from 'lucide-react';

export function ConformidadePill({ status }: { status: string }) {
  if (status === 'APROVADO') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-green-100 text-green-700">
        <CheckCircle size={12} /> Aprovada
      </span>
    );
  }
  if (status === 'REPROVADO') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-100 text-red-700">
        <XCircle size={12} /> Reprovada
      </span>
    );
  }
  if (status === 'SEM_PADRÃO') {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
        <ListX size={12} /> Sem padrão
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-600">
      <Clock size={12} /> Pendente
    </span>
  );
}
