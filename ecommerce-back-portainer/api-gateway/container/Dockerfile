FROM node:20-alpine

WORKDIR /usr/src/app

RUN apk add --no-cache \
    vips-dev \
    python3 \
    make \
    g++ \
    libc6-compat

RUN npm install -g nodemon ts-node tsconfig-paths

COPY package*.json ./
COPY yarn.lock ./
COPY nest-cli.json ./
COPY tsconfig.json ./
COPY tsconfig.build.json ./
COPY tsconfig.paths.json ./

RUN yarn config set network-timeout 600000 && \
    yarn config set registry https://registry.npmjs.org/ && \
    yarn install --network-timeout 600000 || \
    npm install --registry https://registry.npmjs.org/ --timeout=600000

COPY api-gateway/ ./api-gateway/
COPY microservices/ ./microservices/
COPY shared/ ./shared/

EXPOSE 3100

CMD ["yarn", "start:dev:gateway"]
