FROM node:14-buster-slim
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
RUN npm install -g phantomjs --force
COPY . .
EXPOSE 9442
CMD [ "node", "./src/server.js" ]
