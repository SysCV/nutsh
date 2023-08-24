ARG REGISTRY_HOST
ARG REGISTRY_REPO
ARG BUILD_COMMIT_IDENTIFIER
FROM ${REGISTRY_HOST}/${REGISTRY_REPO}:devel-${BUILD_COMMIT_IDENTIFIER} AS build

ADD . /project
WORKDIR /project
RUN task openapi && task proto && task build

# runtime
FROM alpine:3.17.3

COPY --from=build /project/build/nutsh /

EXPOSE 12346
ENTRYPOINT ["/nutsh"]
CMD ["--port", "12346"]
