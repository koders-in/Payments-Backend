FROM node:v18.12.1
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
COPY . .
EXPOSE 9442
CMD [ "node", "./src/server.js" ]
