# Stage 1: Build TypeScript source code
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

COPY package*.json ./
COPY tsconfig.json ./
COPY src/database/prisma ./src/database/prisma/

# Install all dependencies (including devDependencies)
RUN npm ci

COPY . .

# Generate Prisma Client and build TS to JS
RUN npx prisma generate --schema=src/database/prisma/schema.prisma
RUN npm run build

# Remove development dependencies to save space
RUN npm prune --production


# Stage 2: Final lightweight image
FROM node:20-alpine

WORKDIR /usr/src/app

COPY package*.json ./
COPY --from=builder /usr/src/app/node_modules ./node_modules
COPY --from=builder /usr/src/app/dist ./dist
COPY --from=builder /usr/src/app/src/database/prisma ./src/database/prisma

EXPOSE 3000

ENV NODE_ENV=production

CMD ["npm", "start"]
