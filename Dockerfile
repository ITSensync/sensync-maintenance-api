FROM node:22-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       libreoffice-writer \
       fonts-dejavu \
       fonts-liberation \
       fonts-noto \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

RUN which soffice && soffice --version

EXPOSE 3005

CMD ["npm", "start"]

