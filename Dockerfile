FROM node:22-bullseye

# install libreoffice binary + fonts
RUN apt-get update && apt-get install -y \
    libreoffice-writer \
    fonts-dejavu \
    fonts-liberation \
    fonts-noto-core \
    fonts-noto-extra \
    fonts-noto-symbols \
    fonts-noto-symbols2 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3005

CMD ["npm", "start"]
