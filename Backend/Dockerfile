# Gunakan image Node.js versi 20 yang berbasis Alpine (sangat ringan)
FROM node:20-alpine

# Buat direktori kerja
WORKDIR /usr/src/app

# Copy package.json dan package-lock.json (jika ada)
COPY package*.json ./

# Install dependencies Node.js
RUN npm install --only=production

# Copy seluruh source code backend
COPY . .

# Ekspos port 3000
EXPOSE 3000

# Jalankan server
CMD ["npm", "start"]
