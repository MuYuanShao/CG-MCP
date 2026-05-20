FROM maven:3.9-eclipse-temurin-17 AS build

WORKDIR /workspace
COPY pom.xml ./
COPY src ./src
RUN mvn -B -DskipTests package

FROM eclipse-temurin:17-jre-alpine

WORKDIR /api
COPY --from=build /workspace/target/spd-mcp-api.jar ./spd-mcp-api.jar

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/api/spd-mcp-api.jar"]
