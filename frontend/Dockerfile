# Stage 1: Build
FROM node:20-alpine as builder

WORKDIR /app

# Install git and clone repo
RUN apk add --no-cache git

RUN git clone https://github.com/ValeMilk/ValeLabs.git .

WORKDIR /app/frontend

# Install dependencies
RUN npm install

# Build
RUN npm run build

# Stage 2: Runtime
FROM nginx:alpine

# Copy nginx config
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf

# Copy built app from builder
COPY --from=builder /app/frontend/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD wget --quiet --tries=1 --spider http://localhost/health || exit 1

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
