FROM node:16-buster-slim
WORKDIR /usr/src/app
COPY package*.json ./
RUN npm install
RUN sudo npm install -g phantomjs-prebuilt 
RUN apt-get update \

    && apt-get install -y --no-install-recommends \

        curl \

    && mkdir /tmp/phantomjs \

    && curl -L https://bitbucket.org/ariya/phantomjs/downloads/phantomjs-2.1.1-linux-x86_64.tar.bz2 \

           | tar -xj --strip-components=1 -C /tmp/phantomjs \

    && cd /tmp/phantomjs \

    && mv bin/phantomjs /usr/local/bin \

    && cd \

    && apt-get purge --auto-remove -y \

        curl \

    && apt-get clean \

    && rm -rf /tmp/* /var/lib/apt/lists/*

# Run as non-root user 

RUN useradd --system --uid 72379 -m --shell /usr/sbin/nologin phantomjs

USER phantomjs 
COPY . .
EXPOSE 9442
CMD [ "node", "./src/server.js" ]
