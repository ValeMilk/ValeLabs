import { Analise } from "../models/Analise";
import { StatusConformidade, Criticidade, determinarCriticidade } from "../../shared-types";

export class DashboardService {
  /**
   * Obter resumo de análises por categoria
   * Retorna: criticidade, contadores (aprovadas, reprovadas, pendentes, sem padrão)
   */
  async obterPorCategoria() {
    // 1. Buscar todas as análises agrupadas por categoria
    const analises = await Analise.find({})
      .select("categoria statusConformidade")
      .lean();

    // 2. Agrupar por categoria
    const porCategoria: Record<string, any[]> = {};
    analises.forEach((a: any) => {
      if (!porCategoria[a.categoria]) {
        porCategoria[a.categoria] = [];
      }
      porCategoria[a.categoria].push(a);
    });

    // 3. Calcular criticidade e contadores para cada categoria
    const resultado = Object.entries(porCategoria).map(([categoria, analisesCategoria]) => {
      const contadores = {
        total: analisesCategoria.length,
        aprovadas: 0,
        reprovadas: 0,
        pendentes: 0,
        semPadrao: 0
      };

      analisesCategoria.forEach((a: any) => {
        if (a.statusConformidade === StatusConformidade.APROVADO) contadores.aprovadas++;
        if (a.statusConformidade === StatusConformidade.REPROVADO) contadores.reprovadas++;
        if (a.statusConformidade === StatusConformidade.PENDENTE) contadores.pendentes++;
        if (a.statusConformidade === StatusConformidade.SEM_PADRÃO) contadores.semPadrao++;
      });

      // Determinar criticidade pela pior análise
      const criticidade = determinarCriticidade(analisesCategoria);

      return {
        categoria,
        criticidade,
        contadores,
        percentualReprovacao: analisesCategoria.length > 0 
          ? Math.round((contadores.reprovadas / analisesCategoria.length) * 100)
          : 0,
        percentualPendentes: analisesCategoria.length > 0
          ? Math.round((contadores.pendentes / analisesCategoria.length) * 100)
          : 0
      };
    });

    // 4. Ordenar por criticidade (crítico primeiro, depois atenção, depois conforme)
    const ordem = {
      [Criticidade.CRÍTICO]: 0,
      [Criticidade.ATENÇÃO]: 1,
      [Criticidade.CONFORME]: 2
    };

    resultado.sort((a, b) => ordem[a.criticidade] - ordem[b.criticidade]);

    return resultado;
  }

  /**
   * Obter análises detalhadas de uma categoria específica
   */
  async obterPorCategoriaDetalhado(categoria: string) {
    const analises = await Analise.find({ categoria })
      .populate("produtoId", "nome categoria")
      .sort({ dataInoculacao: -1 });

    return analises;
  }

  /**
   * Obter análises detalhadas de um produto específico
   */
  async obterPorProduto(produtoId: string) {
    const analises = await Analise.find({ produtoId })
      .sort({ dataInoculacao: -1 });

    return analises;
  }

  /**
   * Obter tendência agregada por categoria e período
   */
  async obterTendenciaCategoria(
    categoria: string,
    dataInicio: Date,
    dataFim: Date,
    periodo: "dia" | "semana" | "mês" = "dia"
  ) {
    const analises = await Analise.find({
      categoria,
      dataInoculacao: { $gte: dataInicio, $lte: dataFim }
    })
      .select("dataInoculacao statusConformidade microrganismo resultado")
      .lean();

    // Agrupar por período e microrganismo
    const porPeriodo: Record<string, Record<string, any>> = {};

    analises.forEach((a: any) => {
      const dataKey = this.formatarDataPorPeriodo(a.dataInoculacao, periodo);
      
      if (!porPeriodo[dataKey]) {
        porPeriodo[dataKey] = {};
      }
      
      if (!porPeriodo[dataKey][a.microrganismo]) {
        porPeriodo[dataKey][a.microrganismo] = {
          total: 0,
          aprovadas: 0,
          reprovadas: 0,
          pendentes: 0
        };
      }

      const stats = porPeriodo[dataKey][a.microrganismo];
      stats.total++;
      
      if (a.statusConformidade === StatusConformidade.APROVADO) stats.aprovadas++;
      if (a.statusConformidade === StatusConformidade.REPROVADO) stats.reprovadas++;
      if (a.statusConformidade === StatusConformidade.PENDENTE) stats.pendentes++;
    });

    return Object.entries(porPeriodo).map(([data, microrganismos]) => ({
      data,
      microrganismos
    }));
  }

  /**
   * Formatar data por período
   */
  private formatarDataPorPeriodo(data: Date, periodo: "dia" | "semana" | "mês"): string {
    const d = new Date(data);
    
    if (periodo === "dia") {
      return d.toISOString().split("T")[0];
    }
    
    if (periodo === "semana") {
      const start = new Date(d);
      const day = start.getDay();
      const diff = start.getDate() - day + (day === 0 ? -6 : 1);
      start.setDate(diff);
      return start.toISOString().split("T")[0];
    }
    
    if (periodo === "mês") {
      return d.toISOString().slice(0, 7);
    }
    
    return d.toISOString().split("T")[0];
  }
}
