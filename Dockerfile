# Use Node 22 to satisfy Vite's requirements
FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 8309

# We pass the host and port here so package.json stays clean
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "8309"]