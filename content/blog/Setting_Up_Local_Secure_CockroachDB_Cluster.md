+++
title = "Local Secure CockroachDB Cluster on Docker"
date = "2024-04-14T10:53:17+05:30"
author = "Shubham Srivastava"
description = "Learn how to set up a secure CockroachDB cluster on Docker, step-by-step."
tags = ["CockroachDB", "SQL", "Distributed", "bash", "docker", "docker-compose"]
draft = false
+++

I spent an afternoon getting CockroachDB running locally with TLS and wrote this up so you don't have to repeat my mistakes.

Short version: it's possible, it's useful, and you'll probably hit a SAN mismatch at least once.

## TL;DR

- Create a tiny CA
- Issue node certs with SANs
- Run three Cockroach containers on a custom Docker network
- Initialize the cluster and mint a short-lived client cert

## Why bother

I wanted a local, TLS-enabled CockroachDB cluster to experiment with replication and TLS without touching production. This is a minimal, repeatable setup for development and debugging.

## What you need

- OpenSSL
- Docker & Docker Compose

## Plan (short)

1. Create a CA
2. Generate keys and CSRs for three nodes
3. Sign CSRs with SANs
4. Run containers on a custom network
5. Initialize the cluster and create a client cert

### 1) Create a CA

```bash
mkdir -p certs/ca

openssl genrsa -out certs/ca/ca.key 2048
openssl req -x509 -nodes -days 365 -key certs/ca/ca.key -out certs/ca/ca.crt -subj '/CN=LocalCA/O=CA/C=IN'
```

Verify files:

```bash
ls -l certs/ca
# ca.crt and ca.key should be present
```

### 2) Keys & CSRs for each node

Create private keys and CSRs for three nodes.

```bash
mkdir -p certs/node1 certs/node2 certs/node3

openssl genrsa -out certs/node1/node.key 2048
openssl genrsa -out certs/node2/node.key 2048
openssl genrsa -out certs/node3/node.key 2048

openssl req -new -key certs/node1/node.key -out certs/node1/node.csr -subj '/CN=node/O=LocalCockroachNode1/C=IN'
openssl req -new -key certs/node2/node.key -out certs/node2/node.csr -subj '/CN=node/O=LocalCockroachNode2/C=IN'
openssl req -new -key certs/node3/node.key -out certs/node3/node.csr -subj '/CN=node/O=LocalCockroachNode3/C=IN'
```

### 3) Sign the CSRs with SANs

Your node certificates must include SANs (IP/DNS) matching what the container uses. On macOS/linux you can use process substitution; otherwise write the SAN section to a temporary file and pass `-extfile`.

```bash
SAN_PARAM="[SAN]\nsubjectAltName=IP:10.5.0.11,DNS:roach1"
openssl x509 -req -in ./certs/node1/node.csr -CA ./certs/ca/ca.crt -CAkey ./certs/ca/ca.key -CAcreateserial -out ./certs/node1/node.crt -days 3650 -extfile <(echo -e "$SAN_PARAM") -extensions SAN

SAN_PARAM="[SAN]\nsubjectAltName=IP:10.5.0.12,DNS:roach2"
openssl x509 -req -in ./certs/node2/node.csr -CA ./certs/ca/ca.crt -CAkey ./certs/ca/ca.key -CAcreateserial -out ./certs/node2/node.crt -days 3650 -extfile <(echo -e "$SAN_PARAM") -extensions SAN

SAN_PARAM="[SAN]\nsubjectAltName=IP:10.5.0.13,DNS:roach3"
openssl x509 -req -in ./certs/node3/node.csr -CA ./certs/ca/ca.crt -CAkey ./certs/ca/ca.key -CAcreateserial -out ./certs/node3/node.crt -days 3650 -extfile <(echo -e "$SAN_PARAM") -extensions SAN
```

Short note: I used long lifetimes for convenience locally — don't do this in production.

### 4) Docker Compose: minimal example

Drop this into `docker-compose.yml` and adjust the subnet/ports if needed. Volumes mount cert folders so Cockroach can pick them up.

```yaml
version: '3'

services:
    roach1:
        image: cockroachdb/cockroach:v23.2.4
        container_name: roach1
        hostname: roach1
        stop_grace_period: 10s
        environment:
            COCKROACH_URL: "postgresql://10.5.0.11:26257/defaultdb?sslmode=verify-full&sslrootcert=/cockroach/cockroach-certs/ca.crt"
        networks:
            roachnet:
                ipv4_address: 10.5.0.11
        ports:
            - "26257:26257"
            - "9091:8080"
        volumes:
            - roach1:/cockroach/cockroach-data
            - ./certs/node1:/cockroach/cockroach-certs
            - ./certs/ca:/cockroach/ca
        command: start --advertise-addr=10.5.0.11:26357 --http-addr=10.5.0.11:8080 --listen-addr=10.5.0.11:26357 --sql-addr=10.5.0.11:26257 --join=10.5.0.11:26357,10.5.0.12:26357,10.5.0.13:26357 --certs-dir=/cockroach/cockroach-certs

    roach2:
        image: cockroachdb/cockroach:v23.2.4
        container_name: roach2
        hostname: roach2
        stop_grace_period: 10s
        environment:
            COCKROACH_URL: "postgresql://10.5.0.12:26257/defaultdb?sslmode=verify-full&sslrootcert=/cockroach/cockroach-certs/ca.crt"
        networks:
            roachnet:
                ipv4_address: 10.5.0.12
        ports:
            - "26258:26257"
            - "9092:8080"
        volumes:
            - roach2:/cockroach/cockroach-data
            - ./certs/node2:/cockroach/cockroach-certs
            - ./certs/ca:/cockroach/ca
        command: start --advertise-addr=10.5.0.12:26357 --http-addr=10.5.0.12:8080 --listen-addr=10.5.0.12:26357 --sql-addr=10.5.0.12:26257 --join=10.5.0.11:26357,10.5.0.12:26357,10.5.0.13:26357 --certs-dir=/cockroach/cockroach-certs

    roach3:
        image: cockroachdb/cockroach:v23.2.4
        container_name: roach3
        hostname: roach3
        stop_grace_period: 10s
        environment:
            COCKROACH_URL: "postgresql://10.5.0.13:26257/defaultdb?sslmode=verify-full&sslrootcert=/cockroach/cockroach-certs/ca.crt"
        networks:
            roachnet:
                ipv4_address: 10.5.0.13
        ports:
            - "26259:26257"
            - "9093:8080"
        volumes:
            - roach3:/cockroach/cockroach-data
            - ./certs/node3:/cockroach/cockroach-certs
            - ./certs/ca:/cockroach/ca
        command: start --advertise-addr=10.5.0.13:26357 --http-addr=10.5.0.13:8080 --listen-addr=10.5.0.13:26357 --sql-addr=10.5.0.13:26257 --join=10.5.0.11:26357,10.5.0.12:26357,10.5.0.13:26357 --certs-dir=/cockroach/cockroach-certs

networks:
    roachnet:
        driver: bridge
        ipam:
            config:
                - subnet: 10.5.0.0/24
                    gateway: 10.5.0.1

volumes:
    roach1:
    roach2:
    roach3:

```

### 5) Copy the CA into node folders

```bash
cp certs/ca/ca.crt certs/node1/
cp certs/ca/ca.crt certs/node2/
cp certs/ca/ca.crt certs/node3/
```

### Start, initialize and test

Bring everything up and create a short-lived client certificate for the `root` user, then initialize the cluster from one node:

```bash
docker compose up -d
docker ps --filter name=roach

# create a short-lived client cert and initialize the cluster
docker exec roach1 ./cockroach cert create-client root --certs-dir=/cockroach/cockroach-certs --ca-key=/cockroach/ca/ca.key --lifetime=24h
docker exec roach1 ./cockroach --host=roach1:26357 --certs-dir=/cockroach/cockroach-certs init
```

If something breaks, start by checking SANs — they caused most of my issues.

### Quick tips

- SAN mismatches are the most common issue.
- If your shell doesn't support `<(...)`, write SANs to a temp file and use `-extfile`.
- If host ports conflict, change the left side of the `ports` mapping.

### Wrapping up

This is intentionally short and practical — the code blocks do the heavy lifting. If you'd like I can add:

- A small bash script that creates the CA, signs the certs, and prepares the folders
- A Makefile target to `up`/`down` the cluster and clean artefacts
- A short section showing how to connect from the host using the generated client certs

Which of the above should I add next?
