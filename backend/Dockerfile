# Etapa 1: Build
FROM node:20-alpine AS builder

WORKDIR /app

# Clone do repositório
RUN apk add --no-cache git && \
    git clone https://github.com/ValeMilk/ValeLabs.git .

WORKDIR /app/backend

RUN npm install && \
    npm run build

# Etapa 2: Runtime
FROM node:20-alpine

WORKDIR /app

# Clone do repositório (apenas arquivo necessários)
RUN apk add --no-cache git && \
    git clone https://github.com/ValeMilk/ValeLabs.git . && \
    cd backend && \
    npm install --omit=dev

# Copiar build da etapa anterior
COPY --from=builder /app/backend/dist ./dist

# Expor porta
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/health', (r) => {if (r.statusCode !== 200) throw new Error(r.statusCode)})"

# Comando para iniciar
CMD ["node", "dist/index.js"]
