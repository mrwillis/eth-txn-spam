FROM node:14.18.1

COPY package.json package.json
COPY tsconfig.json tsconfig.json

RUN npm i

COPY src/ src/
CMD npm run start