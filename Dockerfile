# Image de dev/demo pour apps/api. Construit les workspaces TypeScript et
# embarque le moteur Python déterministe appelé par l'adaptateur API.
#
# Les repositories API restent en mémoire (voir apps/api/src/composition.ts) :
# le package PostgreSQL présent dans le monorepo n'est pas encore composé ici.
FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Sources completes du monorepo (voir .dockerignore pour les exclusions).
# Necessaire avant `npm ci` : npm doit voir le package.json de chaque
# workspace (apps/*, packages/*) declare par le champ "workspaces" racine.
COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
COPY services ./services
COPY docs/v2.2/hackathon.config.json ./docs/v2.2/hackathon.config.json

RUN npm ci

# Construit uniquement ce que reference tsconfig.json racine : contracts,
# domain, application, apps/api (pas apps/client ni apps/worker).
RUN npm run build

ENV NODE_ENV=production
ENV OCTRO_PYTHON=python3
EXPOSE 3000

CMD ["node", "apps/api/dist/index.js"]
