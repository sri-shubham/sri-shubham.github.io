+++
title = "Local Secure CockroachDB Cluster on Docker"
date = "2024-04-14T10:53:17+05:30"

description = "Learn how to set up a secure CockroachDB cluster on Docker, step-by-step."

tags = ["CockroachDB", "SQL", "Distributed", "bash", "docker", "docker-compose"]
draft = false
+++

Embark on a journey into the realm of CockroachDB, where we explore the intricacies of setting up a local cluster. Discover how this resilient, distributed SQL database empowers developers with scalability and reliability, step-by-step.

[Learn more about CockroachDB](https://www.cockroachlabs.com/docs/cockroachcloud/quickstart)


## Why am i writing this?

Setting up a local secure CockroachDB cluster in Docker can be challenging. This guide serves as documentation for myself and others facing similar hurdles.

## Prerequisites

- GNU OpelSSL
- Docker

## Lets Get Started

So to run a secure cluster we need certificates for each of the cockroachDB nodes. In this example we will run a cluster with 3 nodes. We will be using self signed certificates.

### Lets create a CA who will sign our certificates

Start by creating a directory where our certificates will be stored
` bash
    mkdir -p certs/ca
`

Use OpenSSL to generate CA Key and certificate
`bash
    openssl genrsa -out certs/ca/ca.key 2048
    openssl req -x509 -nodes -days 365 -key certs/ca/ca.key -out certs/ca/ca.crt -subj '/CN=LocalCA/O=CA/C=IN'
`

now if we check folder contents we should have CA private key and certificate
`bash
root@localhost:~# ls -l certs/ca
total 8
-rw-r--r-- 1 root root 1180 Apr 14 08:43 ca.crt
-rw------- 1 root root 1704 Apr 14 08:43 ca.key
`

### Now we will add certificates for each of our nodes

First things first we will create private key for each of the node.

`bash
    mkdir -p certs/node1 certs/node2 certs/node3

    openssl genrsa -out certs/node1/node.key 2048
    openssl genrsa -out certs/node2/node.key 2048
    openssl genrsa -out certs/node3/node.key 2048
`

Now we will create Certificate Signing Request(CSR) for each of the nodes

`bash
    openssl req -new -key certs/node1/node.key -out certs/node1/node.csr  -subj '/CN=node/O=LocalCockroachNode1/C=IN'
    openssl req -new -key certs/node2/node.key -out certs/node2/node.csr  -subj '/CN=node/O=LocalCockroachNode2/C=IN'
    openssl req -new -key certs/node3/node.key -out certs/node3/node.csr  -subj '/CN=node/O=LocalCockroachNode3/C=IN'
`

Another thing these certificates will need is IP and name of each node where it will be deployed. We will be using static IP in docker-compose in our own network.

Now we will use CA key to sign the CSR

`bash
SAN_PARAM="[SAN]\nsubjectAltName=IP:10.5.0.11,DNS:roach1"
openssl x509 -req -in ./certs/node1/node.csr -CA ./certs/ca/ca.crt -CAkey ./certs/ca/ca.key -CAcreateserial -out ./certs/node1/node.crt -days 365000 -extfile <(echo -e "$SAN_PARAM") -extensions SAN
SAN_PARAM="[SAN]\nsubjectAltName=IP:10.5.0.12,DNS:roach2"
openssl x509 -req -in ./certs/node2/node.csr -CA ./certs/ca/ca.crt -CAkey ./certs/ca/ca.key -CAcreateserial -out ./certs/node2/node.crt -days 365000 -extfile <(echo -e "$SAN_PARAM") -extensions SAN
SAN_PARAM="[SAN]\nsubjectAltName=IP:10.5.0.13,DNS:roach3"
openssl x509 -req -in ./certs/node3/node.csr -CA ./certs/ca/ca.crt -CAkey ./certs/ca/ca.key -CAcreateserial -out ./certs/node3/node.crt -days 365000 -extfile <(echo -e "$SAN_PARAM") -extensions SAN
`

### Setting up for docker deployment

#### The docker-compose file

```bash
version: '3'

services:
    roach1:
        image: cockroachdb/cockroach:v23.2.4
        container_name: roach1
        hostname: roach1
        stop_grace_period: 10s
        enviroment:
            COCKROACH_URL: postgresql://10.5.0.11:26257/defaultdb?sslmode=verify-full&sslrootcert=/cockroach/cockroach-certs/ca.crt
        networks:
            roachnet:
                ipv4_address: 10.5.0.11
        ports:
            - "26257:26257"
            - "9091:8080"
        volumes:
            - roach1:/cockroach/cockroach-data
            - certs/node1:/cockroach/cockroach-certs
            - certs/ca:/cockroach/ca
        command: start --advertise-addr=10.5.0.11:26357 --http-addr=10.5.0.11:8080 --listen-addr=10.5.0.11:26357 --sql-addr=10.5.0.11:26257 --join=10.5.0.11:26357,10.5.0.12:26357,10.5.0.13:26357 --certs-dir=/cockroach/cockroach-certs
    
    roach2:
        image: cockroachdb/cockroach:v23.2.4
        container_name: roach2
        hostname: roach2
        stop_grace_period: 10s
        enviroment:
            COCKROACH_URL: postgresql://10.5.0.12:26257/defaultdb?sslmode=verify-full&sslrootcert=/cockroach/cockroach-certs/ca.crt
        networks:
            roachnet:
                ipv4_address: 10.5.0.12
        ports:
            - "26257:26257"
            - "9091:8080"
        volumes:
            - roach1:/cockroach/cockroach-data
            - certs/node1:/cockroach/cockroach-certs
            - certs/ca:/cockroach/ca
        command: start --advertise-addr=10.5.0.12:26357 --http-addr=10.5.0.12:8080 --listen-addr=10.5.0.12:26357 --sql-addr=10.5.0.12:26257 --join=10.5.0.11:26357,10.5.0.12:26357,10.5.0.13:26357 --certs-dir=/cockroach/cockroach-certs

    roach3:
        image: cockroachdb/cockroach:v23.2.4
        container_name: roach3
        hostname: roach3
        stop_grace_period: 10s
        enviroment:
            COCKROACH_URL: postgresql://10.5.0.13:26257/defaultdb?sslmode=verify-full&sslrootcert=/cockroach/cockroach-certs/ca.crt
        networks:
            roachnet:
                ipv4_address: 10.5.0.13
        ports:
            - "26257:26257"
            - "9091:8080"
        volumes:
            - roach1:/cockroach/cockroach-data
            - certs/node1:/cockroach/cockroach-certs
            - certs/ca:/cockroach/ca
        command: start --advertise-addr=10.5.0.13:26357 --http-addr=10.5.0.13:8080 --listen-addr=10.5.0.13:26357 --sql-addr=10.5.0.13:26257 --join=10.5.0.11:26357,10.5.0.12:26357,10.5.0.13:26357 --certs-dir=/cockroach/cockroach-certs
networks:
    roachnet:
        driver: bridge
        ipam:
            config:
                - subnet: 10.5.0.0/8
                gateway: 10.5.0.1

volumes:
    roach1:
    roach2:
    roach3:
    
```

#### We now copy ca certificate to each node

cp certs/ca/ca.crt certs/node1
cp certs/ca/ca.crt certs/node2
cp certs/ca/ca.crt certs/node3

### Now the magic

`
root@localhost:~# docker ps
CONTAINER ID   IMAGE                           COMMAND                  CREATED              STATUS          PORTS                                                                                                 NAMES
8addcde683ff   cockroachdb/cockroach:v23.2.4   "/cockroach/cockroac…"   About a minute ago   Up 30 seconds   26257/tcp, 0.0.0.0:26259->26259/tcp, :::26259->26259/tcp, 0.0.0.0:9093->8080/tcp, :::9093->8080/tcp   roach3
8489539a425d   cockroachdb/cockroach:v23.2.4   "/cockroach/cockroac…"   About a minute ago   Up 29 seconds   0.0.0.0:26257->26257/tcp, :::26257->26257/tcp, 0.0.0.0:9091->8080/tcp, :::9091->8080/tcp              roach1
952ef99922fb   cockroachdb/cockroach:v23.2.4   "/cockroach/cockroac…"   About a minute ago   Up 30 seconds   26257/tcp, 0.0.0.0:26258->26258/tcp, :::26258->26258/tcp, 0.0.0.0:9092->8080/tcp, :::9092->8080/tcp   roach2
`

Our servies are now running just need to initialise the cluster.

### Generate cockroach client certificates and initialise the cluser

`bash
docker exec roach1 ./cockroach cert create-client root --certs-dir=/cockroach/cockroach-certs --ca-key=/cockroach/ca/ca.key --lifetime=24h
docker exec roach1 ./cockroach --host=roach1:26357 --certs-dir=/cockroach/cockroach-certs init
`

## Voilà! It's Done

Our cluster is now up and running. 
