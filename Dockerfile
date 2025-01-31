FROM node:18-slim

WORKDIR /app

# Install OpenSSL and other required packages
RUN apt-get update -y && \
    apt-get install -y openssl && \
    rm -rf /var/lib/apt/lists/*

COPY package.json .yarnrc.yml ./
COPY .yarn .yarn
RUN yarn install

COPY . .

RUN yarn prisma generate

CMD ["yarn", "dev"]
