FROM node:9.6.1

COPY . /opt/dcs

WORKDIR /opt/dcs

RUN sed -i 's/localhost/ipfs/' index.js
RUN sed -i 's/localhost/ipfs/' app.js
RUN sed -i 's/localhost/ipfs/' actions/*.js

RUN chown node: * -R

RUN npm install