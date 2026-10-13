FROM node:22-bullseye

# install libreoffice binary + fonts
RUN apt-get install -y --no-install-recommends \
    libreoffice-writer \
    fonts-dejavu \
    fonts-liberation \
    fonts-noto

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY . .

EXPOSE 3005

CMD ["npm", "start"]
