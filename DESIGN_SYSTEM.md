# 🎨 Design System - Supply ERP

Documentação completa do design system utilizado na aplicação Supply ERP, incluindo paleta de cores, ícones, animações, tipografia e componentes reutilizáveis.

---

## 📋 Sumário
1. [Paleta de Cores](#paleta-de-cores)
2. [Tipografia](#tipografia)
3. [Ícones](#ícones)
4. [Animações](#animações)
5. [Componentes](#componentes)
6. [Padrões de Uso](#padrões-de-uso)

---

## 🎨 Paleta de Cores

### Cores Primárias

| Cor | Hex | RGB | Uso |
|-----|-----|-----|-----|
| **Blue 600** | `#2563eb` | `37, 99, 235` | Botões primários, ações principais, links |
| **Blue 700** | `#1d4ed8` | `29, 78, 216` | Hover de botões primários |
| **Blue 50** | `#eff6ff` | `239, 246, 255` | Backgrounds de notificações informativas |

### Cores de Status

#### ✅ Sucesso / Concluído
```
Green 500: #22c55e (RGB: 34, 197, 94)
Green 600: #16a34a (RGB: 22, 163, 74)
Green 50:  #f0fdf4 (RGB: 240, 253, 244)
Green 100: #dcfce7 (RGB: 220, 252, 231)
```
**Uso:** Indicadores de sucesso, itens concluídos, status "online"

#### ⚠️ Atenção / Aviso
```
Yellow 50:  #fefce8 (RGB: 254, 252, 232)
Yellow 300: #fcd34d (RGB: 252, 211, 77)
Yellow 600: #ca8a04 (RGB: 202, 138, 4)
Yellow 800: #713f12 (RGB: 113, 63, 18)
```
**Uso:** Avisos, itens pendentes, sincronizações incompletas

#### 🔴 Erro / Crítico
```
Red 50:   #fef2f2 (RGB: 254, 242, 242)
Red 100:  #fee2e2 (RGB: 254, 226, 226)
Red 600:  #dc2626 (RGB: 220, 38, 38)
Red 700:  #b91c1c (RGB: 185, 28, 28)
```
**Uso:** Erros, excluções, dados críticos, status "offline"

#### 🟠 Info / Notificação
```
Orange 50:   #fff7ed (RGB: 255, 247, 237)
Orange 300:  #fdba74 (RGB: 253, 186, 116)
Orange 600:  #ea580c (RGB: 234, 88, 12)
Orange 800:  #92400e (RGB: 146, 64, 14)
```
**Uso:** Conexão precária, avisos importantes, estados alternativos

#### 🟣 Secundária
```
Purple 600: #9333ea (RGB: 147, 51, 234)
Purple 700: #7e22ce (RGB: 126, 34, 206)
```
**Uso:** Ações secundárias, exports, operações especiais

### Cores Neutras

| Cor | Hex | RGB | Uso |
|-----|-----|-----|-----|
| **White** | `#ffffff` | `255, 255, 255` | Backgrounds, cards, modais |
| **Gray 50** | `#f9fafb` | `249, 250, 251` | Backgrounds alternativos, hover |
| **Gray 100** | `#f3f4f6` | `243, 244, 246` | Borders, inputs |
| **Gray 300** | `#d1d5db` | `209, 213, 219` | Borders secundárias |
| **Gray 400** | `#9ca3af` | `156, 163, 175` | Texto desabilitado |
| **Gray 500** | `#6b7280` | `107, 114, 128` | Texto secundário |
| **Gray 600** | `#4b5563` | `75, 85, 99` | Texto terciário |
| **Gray 700** | `#374151` | `55, 65, 81` | Texto principal |
| **Gray 800** | `#1f2937` | `31, 41, 55` | Texto bold |
| **Gray 900** | `#111827` | `17, 24, 39` | Texto muito escuro |

### Gradientes

```css
/* Gradiente Azul para Roxo (não usado atualmente) */
from-blue-500 via-blue-600 to-purple-600

/* Gradiente Laranja (não usado atualmente) */
from-orange-400 to-orange-600
```

---

## 📝 Tipografia

### Tamanhos

| Classe Tailwind | Tamanho | Line Height | Uso |
|-----------------|---------|-------------|-----|
| `text-xs` | 12px | 16px | Labels, helper text, breadcrumbs |
| `text-sm` | 14px | 20px | Corpo de texto, descrições |
| `text-base` | 16px | 24px | Texto padrão |
| `text-lg` | 18px | 28px | Subtítulos, seções importantes |
| `text-xl` | 20px | 28px | Títulos de páginas |
| `text-2xl` | 24px | 32px | Títulos principais |

### Pesos

| Classe | Peso | Uso |
|--------|------|-----|
| `font-normal` | 400 | Texto corpo |
| `font-medium` | 500 | Ênfase média, labels |
| `font-semibold` | 600 | Subtítulos, valores importantes |
| `font-bold` | 700 | Títulos, destaques |



## ✨ Animações

### Animações Tailwind Nativas

#### Spin (Carregamento)
```tsx
<div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>

// Com ícone
<RefreshCw className="animate-spin" size={20} />
```
**Uso:** Indicador de carregamento, sincronização em andamento

#### Pulse
```tsx
<div className="animate-pulse bg-blue-200 rounded-lg h-12 w-12"></div>
```
**Uso:** Placeholder de skeleton loading, estados de espera

### Transições CSS

#### Hover (Botões)
```tsx
<button className="bg-blue-600 hover:bg-blue-700 transition-colors">
  Clique aqui
</button>
```
**Duração:** 150-200ms

#### Opacity Fade
```tsx
<div className="opacity-0 hover:opacity-100 transition-opacity duration-300">
  Conteúdo fade-in
</div>
```

#### Scale (Zoom leve)
```tsx
<button className="hover:scale-105 transition-transform duration-200">
  Botão com zoom
</button>
```

### Animações Customizadas (CSS)

```css
/* Animação de pulsação suave */
@keyframes pulse-glow {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

/* Animação de deslize de entrada */
@keyframes slide-in {
  from {
    opacity: 0;
    transform: translateX(-20px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
}

/* Animação de bounce */
@keyframes bounce-subtle {
  0%, 100% {
    transform: translateY(0);
  }
  50% {
    transform: translateY(-4px);
  }
}
```

### Padrões de Animação por Contexto

#### Carregamento de Página
```tsx
{loading && (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
  </div>
)}
```

#### Sincronização (Loading Bar)
```tsx
{syncing && (
  <div className="h-1 bg-blue-600 animate-pulse absolute top-0 left-0 right-0"></div>
)}
```

#### Transição de Modal
```tsx
{vencimentoModal && (
  <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 animate-fadeIn">
    {/* Conteúdo */}
  </div>
)}
```

---

## 🧩 Componentes

### Botões

#### Primário (Blue)
```tsx
<button className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed">
  <Icon size={18} />
  Label
</button>
```

#### Sucesso (Green)
```tsx
<button className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700">
  <Icon size={18} />
  Label
</button>
```

#### Perigo (Red)
```tsx
<button className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700">
  <Icon size={18} />
  Label
</button>
```

#### Secundário (Purple)
```tsx
<button className="flex items-center space-x-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700">
  <Icon size={18} />
  Label
</button>
```

### Cards

#### Card Padrão
```tsx
<div className="bg-white rounded-lg shadow p-4">
  {/* Conteúdo */}
</div>
```

#### Card com Hover
```tsx
<div className="bg-white rounded-lg shadow hover:shadow-lg transition-shadow p-4">
  {/* Conteúdo */}
</div>
```

### Notificações

#### Info (Blue)
```tsx
<div className="bg-blue-50 border border-blue-300 rounded-lg p-3 flex items-center space-x-3">
  <InfoIcon className="text-blue-600" />
  <p className="text-blue-800">Mensagem informativa</p>
</div>
```

#### Sucesso (Green)
```tsx
<div className="bg-green-50 border border-green-300 rounded-lg p-3 flex items-center space-x-3">
  <CheckCircle className="text-green-600" />
  <p className="text-green-800">Operação concluída</p>
</div>
```

#### Aviso (Yellow)
```tsx
<div className="bg-yellow-50 border border-yellow-300 rounded-lg p-3 flex items-center space-x-3">
  <AlertTriangle className="text-yellow-600" />
  <p className="text-yellow-800">Atenção: verifique antes de continuar</p>
</div>
```

#### Erro (Red)
```tsx
<div className="bg-red-50 border border-red-300 rounded-lg p-3 flex items-center space-x-3">
  <AlertCircle className="text-red-600" />
  <p className="text-red-800">Erro ao processar</p>
</div>
```

#### Offline (Orange)
```tsx
<div className="bg-orange-50 border border-orange-300 rounded-lg p-3 flex items-center space-x-3">
  <WifiOff className="text-orange-600" />
  <p className="text-orange-800">Sem conexão</p>
</div>
```

### Inputs

#### Input Padrão
```tsx
<input
  type="text"
  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
  placeholder="Digite aqui"
/>
```

#### Input com Label
```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Label
  </label>
  <input
    type="text"
    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
  />
</div>
```

### Tabelas

#### Célula de Cabeçalho
```tsx
<th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100">
  Coluna
</th>
```

#### Célula de Dados
```tsx
<td className="px-3 py-2 whitespace-nowrap text-sm text-gray-900">
  Valor
</td>
```

#### Célula de Número (right-aligned)
```tsx
<td className="px-3 py-2 whitespace-nowrap text-sm text-right font-semibold text-gray-900">
  {formatNumber(valor)}
</td>
```

### Badges/Tags

#### Categoria ABC - A (Alta prioridade)
```tsx
<span className="px-2 py-0.5 rounded-full text-xs font-bold bg-red-100 text-red-700">
  A
</span>
```

#### Categoria ABC - B (Média prioridade)
```tsx
<span className="px-2 py-0.5 rounded-full text-xs font-bold bg-yellow-100 text-yellow-700">
  B
</span>
```

#### Categoria ABC - C (Baixa prioridade)
```tsx
<span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
  C
</span>
```

#### Tipo de Produto
```tsx
<span className="px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-700">
  Produto Acabado
</span>
```

---

## 📐 Padrões de Uso

### Espaçamento

```
xs: 4px   (0.25rem)
sm: 8px   (0.5rem)
md: 12px  (0.75rem)
lg: 16px  (1rem)
xl: 20px  (1.25rem)
2xl: 24px (1.5rem)
```

**Exemplos:**
```tsx
<div className="p-3">Padding pequeno</div>
<div className="m-4">Margin média</div>
<div className="gap-2 flex">Espaçamento entre itens</div>
<div className="space-y-3">Espaço vertical entre filhos</div>
```

### Breakpoints Responsivos

| Breakpoint | Tamanho | Uso |
|------------|---------|-----|
| `sm` | 640px | Tablets pequenos |
| `md` | 768px | Tablets |
| `lg` | 1024px | Desktops |
| `xl` | 1280px | Desktops grandes |
| `2xl` | 1536px | Ultra wide |

**Exemplo:**
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
  {/* 1 coluna em mobile, 2 em tablet pequeno, 4 em desktop */}
</div>
```

### Acessibilidade

#### Focus States
```tsx
<button className="... focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2">
  Botão acessível
</button>
```

#### ARIA Labels
```tsx
<button aria-label="Fechar modal" className="...">
  <X size={20} />
</button>
```

#### Disabled State
```tsx
<input disabled className="... disabled:opacity-50 disabled:cursor-not-allowed" />
```

---

## 🎯 Guia de Decisão

### Quando usar cada cor

- **Blue**: Ações primárias, informações, navegação
- **Green**: Sucesso, concluído, online, dados válidos
- **Red**: Erro, perigo, delete, offline permanente
- **Yellow**: Aviso, atenção, pendente
- **Orange**: Info média, conexão instável
- **Purple**: Ações secundárias, exports, especiais
- **Gray**: Texto, backgrounds, desabilitado

### Quando usar cada animação

- **Spin**: Carregamento, sincronização ativa
- **Pulse**: Estados de espera, placeholders
- **Fade**: Transições suaves entre estados
- **Slide**: Entrada de modais, notificações

---

## 📚 Referências

- **Tailwind CSS**: [tailwindcss.com](https://tailwindcss.com)
- **Lucide Icons**: [lucide.dev](https://lucide.dev)
- **Color Palette**: [tailwindcss.com/docs/customizing-colors](https://tailwindcss.com/docs/customizing-colors)

---

**Última atualização:** 12/08/2026
**Mantido por:** GitHub Copilot
