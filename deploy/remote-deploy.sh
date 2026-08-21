#!/usr/bin/env bash
# Roda DENTRO do servidor (via SSH pelo CD, ou manualmente por você).
# Assume que o código já foi atualizado em /root/valelabs (git pull/reset)
# antes deste script rodar — ele só cuida da parte Docker.
set -euo pipefail

cd /root/valelabs

docker-compose -f docker-compose-custom.yml down
docker-compose -f docker-compose-custom.yml build --no-cache frontend backend
docker-compose -f docker-compose-custom.yml up -d frontend backend

# Só remove camadas de imagem sem tag (sobra do --no-cache) — nunca imagem,
# container ou volume de outro projeto que rode nesta máquina.
docker image prune -f

echo "✅ Deploy ok!"
