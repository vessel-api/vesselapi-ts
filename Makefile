.PHONY: build test lint typecheck clean all

all: lint typecheck test build

build:
	npx tsup

test:
	npx vitest run

test-smoke:
	SMOKE=1 npx vitest run tests/smoke.test.ts

lint:
	npx eslint src/ tests/

typecheck:
	npx tsc --noEmit

clean:
	rm -rf dist
