.PHONY: run build clean tidy test

BINARY := bin/nexus-server.exe
MAIN   := ./cmd/server

run:
	go run $(MAIN)

build:
	go build -o $(BINARY) $(MAIN)

tidy:
	go mod tidy

clean:
	rm -rf bin/

test:
	go test ./...
