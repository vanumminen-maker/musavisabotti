FROM node:20-slim
WORKDIR /app

RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
RUN npm install

COPY . .

CMD ["sh", "-c", "npx tsx src/deploy-commands.ts && npx tsx src/index.ts"]
