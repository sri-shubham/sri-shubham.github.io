+++
title = "Local Secure CockroachDB Cluster on Docker"
date = "2024-04-14T10:53:17+05:30"
author = "Shubham Srivastava"
description = "Learn how to set up a secure CockroachDB cluster on Docker, step-by-step."
tags = ["CockroachDB", "SQL", "Distributed", "bash", "docker", "docker-compose"]
draft = false
+++

I spent a good chunk of an afternoon wrestling with TLS certificates and Docker networking to get a secure, multi-node CockroachDB cluster running on my local machine. I'm writing this down mostly so I don't have to figure it out all over again, and hopefully, it saves you some time too.

The main takeaway? It's totally doable, and it's a great way to experiment with a distributed SQL setup. Also, you will almost certainly mess up a SAN (Subject Alternative Name) in a certificate at least once.

## The Goal

I wanted a simple, repeatable way to spin up a local, TLS-enabled CockroachDB cluster. This is perfect for testing application logic against a secure, distributed database without touching any cloud resources.

## The Game Plan

Here's the high-level approach I took:
1.  **Become a Certificate Authority (CA)**: Just for our local machine, of course.
2.  **Issue Certificates**: Create and sign certificates for each of the three CockroachDB nodes.
3.  **Docker Network**: Set up a dedicated Docker network so the nodes can talk to each other using predictable IP addresses.
4.  **Compose FTW**: Write a `docker-compose.yml` to define and run the three-node cluster.
5.  **Initialize**: Start the cluster and run the `cockroach init` command.

## The Nitty-Gritty

Here are the commands and configs I used.

### 1. Create a Local CA

First, we need a directory to store our certificates and a simple script to create our own CA.

```bash
mkdir -p certs/ca

# Create the CA key and certificate
openssl genrsa -out certs/ca/ca.key 2048
openssl req -x509 -nodes -days 365 -key certs/ca/ca.key -out certs/ca/ca.crt -subj '/CN=LocalCA'
```

### 2. Create Node Certificates

Now, we'll generate a key and a certificate signing request (CSR) for each of our three nodes.

```bash
# Create directories for each node's certs
mkdir -p certs/node1 certs/node2 certs/node3

# Generate keys and CSRs
for i in 1 2 3; do
    openssl genrsa -out certs/node$i/node.key 2048
    openssl req -new -key certs/node$i/node.key -out certs/node$i/node.csr -subj "/CN=node$i"
done
```

### 3. Sign the Node Certificates (The Tricky Part)

This is where the magic—and the potential for mistakes—happens. When we sign the CSRs, we need to include the correct SANs. Each certificate needs to be valid for the node's IP address inside the Docker network and its DNS name.

```bash
# Sign node1's certificate
SAN_PARAM="[SAN]\nsubjectAltName=IP:10.5.0.11,DNS:roach1"
openssl x509 -req -in ./certs/node1/node.csr -CA ./certs/ca/ca.crt -CAkey ./certs/ca/ca.key -CAcreateserial -out ./certs/node1/node.crt -days 365 -extfile <(echo -e "$SAN_PARAM") -extensions SAN

# Sign node2's certificate
SAN_PARAM="[SAN]\nsubjectAltName=IP:10.5.0.12,DNS:roach2"
openssl x509 -req -in ./certs/node2/node.csr -CA ./certs/ca/ca.crt -CAkey ./certs/ca/ca.key -CAcreateserial -out ./certs/node2/node.crt -days 365 -extfile <(echo -e "$SAN_PARAM") -extensions SAN

# Sign node3's certificate
SAN_PARAM="[SAN]\nsubjectAltName=IP:10.5.0.13,DNS:roach3"
openssl x509 -req -in ./certs/node3/node.csr -CA ./certs/ca/ca.crt -CAkey ./certs/ca/ca.key -CAcreateserial -out ./certs/node3/node.crt -days 365 -extfile <(echo -e "$SAN_PARAM") -extensions SAN
```

**Note**: If your shell doesn't support process substitution (`<(...)`), you'll need to write the SAN parameters to a temporary file and use the `-extfile` flag with that file's path.

### 4. The `docker-compose.yml`

This file ties everything together. It defines our three `roach` services, sets up the `roachnet` network with static IPs, and mounts the certificates into each container.

```yaml
version: '3'

services:
  roach1:
    image: cockroachdb/cockroach:v23.2.4
    container_name: roach1
    hostname: roach1
    networks:
      roachnet:
        ipv4_address: 10.5.0.11
    ports:
      - "26257:26257"
      - "8080:8080" # Web UI for roach1
    volumes:
      - ./certs/node1:/cockroach/cockroach-certs
      - ./certs/ca/ca.crt:/cockroach/ca.crt
    command: start --certs-dir=/cockroach/cockroach-certs --advertise-addr=roach1 --join=roach1,roach2,roach3

  roach2:
    image: cockroachdb/cockroach:v23.2.4
    container_name: roach2
    hostname: roach2
    networks:
      roachnet:
        ipv4_address: 10.5.0.12
    volumes:
      - ./certs/node2:/cockroach/cockroach-certs
      - ./certs/ca/ca.crt:/cockroach/ca.crt
    command: start --certs-dir=/cockroach/cockroach-certs --advertise-addr=roach2 --join=roach1,roach2,roach3

  roach3:
    image: cockroachdb/cockroach:v23.2.4
    container_name: roach3
    hostname: roach3
    networks:
      roachnet:
        ipv4_address: 10.5.0.13
    volumes:
      - ./certs/node3:/cockroach/cockroach-certs
      - ./certs/ca/ca.crt:/cockroach/ca.crt
    command: start --certs-dir=/cockroach/cockroach-certs --advertise-addr=roach3 --join=roach1,roach2,roach3

networks:
  roachnet:
    ipam:
      config:
        - subnet: 10.5.0.0/24
```

### 5. Bring It to Life

Now for the moment of truth. Start the cluster and initialize it.

```bash
# Start the containers in the background
docker compose up -d

# Initialize the cluster by running the command on one of the nodes
docker exec roach1 ./cockroach init --certs-dir=/cockroach/cockroach-certs
```

If everything worked, you should be able to access the CockroachDB UI at `http://localhost:8080` and see your three-node cluster up and running securely.

This was a fun little project, and it's incredibly useful for local development. If you run into trouble, double-check your SANs—that's what got me the first few times. I hope this helps you get your own local, secure cluster running!