ARG REGISTRY_HOST
ARG REGISTRY_REPO
ARG BUILD_COMMIT_IDENTIFIER
FROM ${REGISTRY_HOST}/${REGISTRY_REPO}:devel-sam-${BUILD_COMMIT_IDENTIFIER} AS build

ADD . /project
WORKDIR /project
RUN task proto:service && task sam:build

# runtime
FROM ${REGISTRY_HOST}/${REGISTRY_REPO}:runtime3rd-sam-${BUILD_COMMIT_IDENTIFIER}

COPY --from=build /project/build/nutsh-sam /

ENTRYPOINT ["/nutsh-sam", "start"]
