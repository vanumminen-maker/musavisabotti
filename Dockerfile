FROM node:20-slim
WORKDIR /app

RUN apt-get update && apt-get install -y \
    ffmpeg \
    python3 \
    python3-pip \
    python3-venv \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

RUN python3 -m venv /opt/venv
RUN /opt/venv/bin/pip install --upgrade pip yt-dlp
ENV PATH="/opt/venv/bin:$PATH"

COPY package*.json ./
RUN npm install

COPY . .

CMD ["sh", "-c", "npx tsx src/deploy-commands.ts && npx tsx src/index.ts"]
