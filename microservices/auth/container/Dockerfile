# ---- deps: instala dependencias (compila módulos nativos, ej. sharp/libvips) ----
FROM node:20-alpine AS deps
WORKDIR /usr/src/app

RUN apk add --no-cache \
    vips-dev \
    python3 \
    make \
    g++ \
    libc6-compat

COPY microservices/auth/package*.json ./
COPY yarn.lock ./
COPY tsconfig.json ./
COPY tsconfig.paths.json ./

RUN yarn config set network-timeout 600000 && \
    yarn config set registry https://registry.npmjs.org/ && \
    yarn install --network-timeout 600000 || \
    npm install --registry https://registry.npmjs.org/ --timeout=600000

# ---- runtime: mismas devDependencies (nodemon/ts-node hacen hot-reload del
# código fuente, no hay build de por medio), pero SIN el toolchain de
# compilación (python3/make/g++/vips-dev) que solo se necesitaba para instalar
# node_modules — ahorra varios cientos de MB por imagen ----
FROM node:20-alpine
WORKDIR /usr/src/app

RUN apk add --no-cache vips libc6-compat

RUN npm install -g nodemon ts-node tsconfig-paths

COPY --from=deps /usr/src/app/node_modules ./node_modules
COPY microservices/auth/package*.json ./
COPY yarn.lock ./
COPY tsconfig.json ./
COPY tsconfig.paths.json ./

COPY microservices/auth/ ./microservices/auth/
COPY shared/ ./shared/

EXPOSE 3101

CMD ["yarn", "start:dev:auth"]
