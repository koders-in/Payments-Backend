FROM node:16-buster-slim
WORKDIR /usr/src/app
COPY package*.json ./
npm install phantomjs-prebuilt@2.1.14 --ignore-scripts
RUN npm install
COPY . .
EXPOSE 9442
CMD [ "node", "./src/server.js" ]
