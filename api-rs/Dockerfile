# Explicit Dockerfile instead of Railway's auto-detected Railpack build —
# Railpack's Rust provider was producing a broken multi-stage build where
# `cargo build --release` succeeded but the following `cp` step couldn't
# find the binary (a cache-mount/layer mismatch on their end). A plain
# Dockerfile sidesteps that entirely and is the more standard approach for
# a compiled language anyway.

FROM rust:slim AS builder
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends pkg-config libssl-dev && rm -rf /var/lib/apt/lists/*
COPY . .
RUN cargo build --release

FROM debian:trixie-slim
RUN apt-get update && apt-get install -y --no-install-recommends ca-certificates libssl3 && rm -rf /var/lib/apt/lists/*
COPY --from=builder /app/target/release/nadine-api /usr/local/bin/nadine-api
CMD ["nadine-api"]
