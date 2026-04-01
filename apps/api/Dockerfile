FROM node:20-alpine

WORKDIR /app

# Copy workspace root manifests
COPY package.json package-lock.json ./

# Stub the mobile workspace so npm doesn't try to install its large native deps
RUN mkdir -p apps/mobile && \
    echo '{"name":"@strikemate/mobile","version":"0.0.1","private":true}' \
    > apps/mobile/package.json

# Copy shared packages consumed by apps/api
COPY packages/ ./packages/

# Copy the API app
COPY apps/api/ ./apps/api/

# Install production dependencies. tsx is a regular dependency (not devDep) so it
# is included here and used as the runtime TypeScript runner.
RUN npm ci --omit=dev

EXPOSE 3001

WORKDIR /app/apps/api

CMD ["npm", "start"]
