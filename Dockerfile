FROM node:18.16.0

WORKDIR /usr/src/app

COPY package*.json ./

RUN npm install --update-notifier=false

ADD . /usr/src/app

RUN npm run build-ts

RUN npm prune --omit=dev

COPY wait-for-it.sh wait-for-it.sh
RUN chmod +x wait-for-it.sh
