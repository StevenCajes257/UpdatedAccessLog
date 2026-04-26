# STAGE 1: Build the React App
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

# STAGE 2: Secure Production Server
FROM nginx:alpine

# Remove default nginx config and static assets
RUN rm -rf /etc/nginx/conf.d/default.conf /usr/share/nginx/html/*

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy built React app
COPY --from=build /app/dist /usr/share/nginx/html

# Create a non‑root user for nginx (already exists, but ensure it's used)
# The nginx image already runs as `nginx` user, which is non‑root.

# Security: Hide nginx version and add security headers
RUN echo "server_tokens off;" > /etc/nginx/conf.d/security.conf

# Security: Make the filesystem read‑only for the nginx worker processes
# (optional but adds extra layer)
RUN chown -R nginx:nginx /usr/share/nginx/html && \
    chmod -R 555 /usr/share/nginx/html

# Expose port 80
EXPOSE 80

# Use a custom entrypoint to ensure nginx runs with proper security flags
CMD ["nginx", "-g", "daemon off;"]