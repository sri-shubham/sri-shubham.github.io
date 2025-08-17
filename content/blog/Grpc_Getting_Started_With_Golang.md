+++
title= "Let's Dive into gRPC with Go!"
date= "2021-02-07T19:45:43+05:30"
description = "Embark on a fun learning journey with gRPC in Go - A basic tutorial for beginners."
tags = ["Go", "Protobuf", "Protocol Buffer", "gRPC"]
draft= false
image="/images/home.png"
author = "Shubham Srivastava"
+++
I've always found that the best way to understand a technology is to build something with it. This post is my attempt to distill the process of creating a simple gRPC service in Go into a straightforward, no-frills guide. We'll build a basic `Calculator` service that can multiply two numbers—a "hello world" for RPC.

## The "Why"

I wanted a clear, practical example to refer back to. Something that cuts through the noise and focuses on the core steps: defining the service, generating the code, and getting a client and server to talk to each other.

## The Game Plan

1.  **Define the Service**: We'll use a `.proto` file to define our `Calculator` service and its methods.
2.  **Generate the Code**: We'll use `protoc` to generate the Go code for our client and server.
3.  **Implement the Server**: We'll write the logic for our `Multiply` method.
4.  **Implement the Client**: We'll write a simple client to call our server.

## The Nitty-Gritty

Here’s how I did it.

### 1. Define the Service in a `.proto` File

First, I created a `.proto` file to define the service. It has one method, `Multiply`, which takes two numbers and returns one.

```proto
syntax = "proto3";

option go_package = "./pb";

package pb;

service Calculator {
   rpc Multiply(TwoNumbers) returns (Number) {}
}

message TwoNumbers {
   int64 num1 = 1;
   int64 num2 = 2;
}

message Number {
   int64 num = 1;
}
```

### 2. Generate the Go Code

With the `.proto` file ready, I used `protoc` and its Go plugins to generate the necessary client and server code.

```bash
# Make sure you have the plugins
go get -u google.golang.org/grpc
go get -u github.com/golang/protobuf/protoc-gen-go

# Run the generator
protoc --go_out=. --go_opt=paths=source_relative \
    --go-grpc_out=. --go-grpc_opt=paths=source_relative \
    pb/service.proto
```

This command creates the Go files with all the types and interfaces we need.

### 3. Implement the Server

Next, I wrote the server. It needs to satisfy the `CalculatorServer` interface that `protoc` generated.

```go
package main

import (
	"context"
	"log"
	"net"

	"google.golang.org/grpc"
	"path/to/your/pb"
)

// server implements the CalculatorServer interface
type server struct {
	pb.UnimplementedCalculatorServer
}

// Multiply implements the Multiply RPC method
func (s *server) Multiply(ctx context.Context, in *pb.TwoNumbers) (*pb.Number, error) {
	log.Printf("Received: %v and %v", in.GetNum1(), in.GetNum2())
	return &pb.Number{Num: in.GetNum1() * in.GetNum2()}, nil
}

func main() {
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}
	s := grpc.NewServer()
	pb.RegisterCalculatorServer(s, &server{})
	if err := s.Serve(lis); err != nil {
		log.Fatalf("failed to serve: %v", err)
	}
}
```

### 4. Implement the Client

Finally, I wrote a client to connect to the server and call the `Multiply` method.

```go
package main

import (
	"context"
	"log"
	"time"

	"google.golang.org/grpc"
	"path/to/your/pb"
)

func main() {
	conn, err := grpc.Dial("localhost:50051", grpc.WithInsecure(), grpc.WithBlock())
	if err != nil {
		log.Fatalf("did not connect: %v", err)
	}
	defer conn.Close()
	c := pb.NewCalculatorClient(conn)

	ctx, cancel := context.WithTimeout(context.Background(), time.Second)
	defer cancel()

	r, err := c.Multiply(ctx, &pb.TwoNumbers{Num1: 5, Num2: 10})
	if err != nil {
		log.Fatalf("could not multiply: %v", err)
	}
	log.Printf("Result: %d", r.GetNum())
}
```

And that's it. When you run the server and then the client, you'll see the client print the result of the multiplication. It's a simple example, but it's a solid foundation to build on. I hope this straightforward approach helps you get started with gRPC in Go!