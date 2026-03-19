FROM node:20-alpine
WORKDIR /app
COPY nfse-api/package.json nfse-api/package-lock.json* ./
RUN npm install --production
COPY nfse-api/src/ ./src/
EXPOSE 8080
CMD ["node", "src/index.js"]
