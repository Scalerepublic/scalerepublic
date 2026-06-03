FROM oven/bun:1 AS build
WORKDIR /workspace

COPY packages/backend/package.json packages/backend/bun.lock ./packages/backend/
COPY packages/frontend/package.json packages/frontend/bun.lock ./packages/frontend/
COPY packages/backend ./packages/backend
COPY packages/frontend ./packages/frontend

WORKDIR /workspace/packages/frontend
ARG VITE_API_URL=http://backend:3000
ENV VITE_API_URL=${VITE_API_URL}
RUN bun install --frozen-lockfile
RUN bun run build

FROM oven/bun:1 AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY --from=build /workspace/packages/frontend/build ./build
COPY --from=build /workspace/packages/frontend/package.json ./
COPY --from=build /workspace/packages/frontend/node_modules ./node_modules

EXPOSE 3000
CMD ["bun", "build/index.js"]
