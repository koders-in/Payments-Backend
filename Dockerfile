FROM node:16-buster-slim
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
RUN npm install phantomjs-prebuilt
COPY . .
EXPOSE 9442
CMD [ "node", "./src/server.js" ]
