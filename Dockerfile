FROM node:22-bullseye

# install libreoffice binary + fonts
RUN apt-get update && apt-get install -y \
    libreoffice-writer \
    fonts-dejavu \
    fonts-liberation \
    fonts-noto \
    && rm -rf /var/lib/apt/lists/*

COPY local.conf /etc/fonts/local.conf
RUN fc-cache -f -v

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3005

CMD ["npm", "start"]
