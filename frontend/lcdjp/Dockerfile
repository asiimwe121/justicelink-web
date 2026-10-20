# Build args are overridable so the base images can be pinned by digest (docker-compose.yml passes them from .env).
ARG MAVEN_IMAGE=maven:3.9.6-eclipse-temurin-17
ARG JRE_IMAGE=eclipse-temurin:17-jre-jammy

# ── Stage 1: Build ──────────────────────────────────────────
FROM ${MAVEN_IMAGE} AS builder
WORKDIR /build
COPY pom.xml .
# Warm the dependency layer: reused until pom.xml changes.
RUN --mount=type=cache,target=/root/.m2 mvn -B -ntp -q dependency:go-offline
COPY src ./src
# Tests run in CI (mvn verify); the image build only packages, so it does not even compile them
# (-Dmaven.test.skip=true, unlike -DskipTests, which still compiles every file under src/test). A stale or broken
# test file therefore cannot stop a deploy. The jar is copied to a fixed name so the runtime stage never depends
# on a glob that could match more than one file.
RUN --mount=type=cache,target=/root/.m2 \
    mvn -B -ntp -q -Dmaven.test.skip=true package \
    && cp target/lcdjp-backend-*.jar /build/app.jar

# ── Stage 2: Run ────────────────────────────────────────────
FROM ${JRE_IMAGE}
# uid/gid 1001 must match the owner of the host ./logs folder (see docker-compose.yml).
RUN groupadd -r -g 1001 appgroup && useradd -r -u 1001 -g appgroup -m appuser \
    && mkdir -p /app/logs /app/legal-knowledge /app/static \
    && chown -R appuser:appgroup /app
WORKDIR /app
COPY --from=builder --chown=appuser:appgroup /build/app.jar /app/app.jar
USER appuser
EXPOSE 8080
ENV SPRING_PROFILES_ACTIVE=docker
# Read by the JVM itself, so no shell is needed in the entrypoint. docker-compose.yml can override it.
# Heap follows the container memory limit; the JVM exits on OOM so Docker's restart policy replaces it.
ENV JAVA_TOOL_OPTIONS="-XX:MaxRAMPercentage=70 -XX:+ExitOnOutOfMemoryError"
# Exec form: java is PID 1, so SIGTERM reaches Spring and graceful shutdown runs.
ENTRYPOINT ["java", "-jar", "/app/app.jar"]
