FROM node:8.7

COPY . /opt/dcs

WORKDIR /opt/dcs

RUN npm install