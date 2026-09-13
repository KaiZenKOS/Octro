# Image de dev/demo pour apps/api. Construit le monorepo npm workspaces
# comme `npm run build` a la racine (packages/contracts, domain, credit,
# xrpl, application, puis apps/api via les references TypeScript) et lance
# l'API Fastify.
#
# composition.ts bascule sur PostgreSQL/XRPL reels des que POSTGRES_ENABLED /
# LENDING_V1_ENABLED valent "true" (voir .env, fourni via env_file au
# runtime) ; sinon des doublures en memoire/factices restent utilisees.
FROM node:22-alpine

WORKDIR /app

# Sources completes du monorepo (voir .dockerignore pour les exclusions).
# Necessaire avant `npm ci` : npm doit voir le package.json de chaque
# workspace (apps/*, packages/*) declare par le champ "workspaces" racine.
COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps
COPY infra ./infra
# Certificat public (pas une cle privee) epingle pour la verification TLS du
# Postgres distant (PGSSLROOTCERT dans .env) — sans lui l'API ne peut pas
# ouvrir de connexion chiffree verifiee au demarrage en conteneur.
COPY .certs/octro-postgres-ca.pem ./.certs/octro-postgres-ca.pem

RUN npm ci

# Construit uniquement ce que reference tsconfig.json racine : contracts,
# domain, application, apps/api (pas apps/client ni apps/worker).
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "apps/api/dist/index.js"]
