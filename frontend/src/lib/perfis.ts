/**
 * Perfis de acesso do sistema.
 *
 * - Admin: acesso total, incluindo a gestão de usuários.
 * - Diretora / Supervisora Qualidade: gestão completa, exceto usuários.
 * - Qualidade: perfil operacional — só Dashboard e Lançamentos, e em
 *   Lançamentos apenas registra leituras (editar), sem criar nem deletar.
 */

export const PERFIL_ADMIN = ['Admin'];

/** Perfis que administram cadastros (produtos, padrões, microrganismos, auditoria). */
export const PERFIS_GESTAO = ['Admin', 'Diretora', 'Supervisora Qualidade'];

export function ehAdmin(perfil?: string | null): boolean {
  return PERFIL_ADMIN.includes(perfil ?? '');
}

export function podeGerenciar(perfil?: string | null): boolean {
  return PERFIS_GESTAO.includes(perfil ?? '');
}
