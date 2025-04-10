FROM node:18

# Install Firefox
RUN apt-get update && apt-get install -y \
    firefox-esr \
    libxtst6 \
    libxss1 \
    libgconf-2-4 \
    libnss3 \
    libasound2 \
    && rm -rf /var/lib/apt/lists/*

# Install Google Cloud SDK
RUN apt-get update && apt-get install -y apt-transport-https ca-certificates gnupg
RUN echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | tee -a /etc/apt/sources.list.d/google-cloud-sdk.list
RUN curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | apt-key --keyring /usr/share/keyrings/cloud.google.gpg add -
RUN apt-get update && apt-get install -y google-cloud-sdk

# Create app directory
WORKDIR /app

# Copy Firebase configuration
COPY firebase.json .
COPY firestore.rules .
COPY firestore.indexes.json .

# Copy package.json and install dependencies
COPY functions/package.json functions/
RUN cd functions && npm install

# Copy the rest of the application
COPY . .

# Install Firebase CLI
RUN npm install -g firebase-tools

# Set environment variables
ENV NODE_ENV=production
ENV PORT=8080

# Expose port
EXPOSE 8080

# Start command
CMD ["npm", "start"]
