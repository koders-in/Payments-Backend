FROM node:16-buster-slim
WORKDIR /usr/src/app
COPY package*.json ./
RUN  apt-get update
RUN apt-get install sudo -y
RUN npm install
RUN sudo npm install -g phantomjs-prebuilt 
COPY . .
EXPOSE 9442
CMD [ "node", "./src/server.js" ]
