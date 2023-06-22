FROM node:16-buster-slim
WORKDIR /usr/src/app
COPY package*.json ./
RUN  npm install phantomjs-prebuilt --phantomjs_cdnurl=https://bitbucket.org/ariya/phantomjs/downloads
RUN npm install
COPY . .
EXPOSE 9442
CMD [ "node", "./src/server.js" ]
