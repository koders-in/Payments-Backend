FROM node:16-buster-slim
WORKDIR /usr/src/app
COPY package*.json ./
RUN wget -qO- "https://github.com/dustinblackman/phantomized/releases/download/2.1.1a/dockerized-phantomjs.tar.gz" | tar xz -C /
RUN npm install
COPY . .
EXPOSE 9442
CMD [ "node", "./src/server.js" ]
