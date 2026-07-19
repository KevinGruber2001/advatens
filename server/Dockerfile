# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Migrations are embedded into the binary via go:embed
RUN CGO_ENABLED=0 GOOS=linux go build -o /app/server ./cmd/api

# Runtime stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates && adduser -D -u 10001 app

WORKDIR /app

COPY --from=builder /app/server .

USER app

ENV GIN_MODE=release

EXPOSE 8888

CMD ["./server"]
