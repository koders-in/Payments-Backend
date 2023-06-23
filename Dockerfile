FROM node:latest
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install phantomjs-prebuilt@2.1.14 --ignore-scripts
RUN npm install
COPY . .
EXPOSE 9442
CMD [ "node", "./src/server.js" ]
