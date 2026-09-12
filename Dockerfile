# Image de dev/demo pour apps/api (S1). Construit le monorepo npm workspaces
# comme `npm run build` a la racine (packages/contracts, domain, application,
# puis apps/api via les references TypeScript) et lance l'API Fastify.
#
# L'API S1 reste une composition en memoire (voir apps/api/src/composition.ts) :
# ce conteneur ne prouve ni n'implique une persistance PostgreSQL/MongoDB reelle.
FROM node:22-alpine

WORKDIR /app

# Sources completes du monorepo (voir .dockerignore pour les exclusions).
# Necessaire avant `npm ci` : npm doit voir le package.json de chaque
# workspace (apps/*, packages/*) declare par le champ "workspaces" racine.
COPY package.json package-lock.json tsconfig.json tsconfig.base.json ./
COPY packages ./packages
COPY apps ./apps

RUN npm ci

# Construit uniquement ce que reference tsconfig.json racine : contracts,
# domain, application, apps/api (pas apps/client ni apps/worker).
RUN npm run build

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "apps/api/dist/index.js"]
