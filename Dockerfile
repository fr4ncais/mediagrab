FROM ubuntu:22.04

# Install Node.js, Python, ffmpeg, git
RUN apt-get update && apt-get install -y \
    curl \
    git \
    python3 \
    python3-pip \
    ffmpeg \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Install yt-dlp
RUN pip3 install yt-dlp

# Install Deno
RUN curl -fsSL https://deno.land/install.sh | sh
ENV DENO_INSTALL="/root/.deno"
ENV PATH="$DENO_INSTALL/bin:$PATH"

# Set working directory
WORKDIR /app

# Copy files
COPY . .

# Install Node dependencies
RUN npm install

# Expose port
EXPOSE 3000

# Start server
CMD ["node", "server.js"]