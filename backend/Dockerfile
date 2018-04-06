FROM elixir:1.6.0-alpine

RUN apk add --no-cache git
RUN apk add --no-cache alpine-sdk

RUN mix local.hex --force
RUN mix local.rebar

ENV MIX_ENV=prod

WORKDIR /app
ADD . .

RUN mix deps.clean --all
RUN mix deps.get
RUN mix deps.compile

EXPOSE 8080

CMD mix run --no-halt
