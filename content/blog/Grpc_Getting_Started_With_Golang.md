+++
title= "Let's Dive into gRPC with Go!"
date= "2021-02-07T19:45:43+05:30"
description = "Embark on a fun learning journey with gRPC in Go - A basic tutorial for beginners."
tags = ["Go", "Protobuf", "Protocol Buffer", "gRPC"]
draft= false
image="/images/home.png"
+++

Hey there, tech enthusiast! 🚀 Ready to explore the world of gRPC with Go? Buckle up for a joyous ride as we create our very own RPC service, multiply some numbers, and have a blast with code.

## Prerequisites

Assuming you've got the basics of [protocol buffers](/getting-started-in-protobuf-with-go/) down pat and you're curious about [gRPC](). If not, no worries! It's a fantastic opportunity to learn something new.

Grab the example code from our [GitHub repository](https://github.com/sri-shubham/blogcode/tree/master/Getting_Started_In_gRPC_WithGo/example1) and head to the `Getting_Started_In_gRPC_WithGo/example1` directory.

If you're missing the `protoc` compiler, fear not! Learn how to install it [here](http://google.github.io/proto-lens/installing-protoc.html).

Now, let's get those Go code generator plugins rolling:

```bash
go get -u github.com/golang/protobuf/protoc-gen-go
go get -u google.golang.org/grpc/cmd/protoc-gen-go-grpc
```

## Let the Fun Begin - Creating Our Very First Service!

We're keeping it simple - a service that multiplies two numbers.

1. **Defining our first service**

   In our proto file, we'll use this syntax:

   ```proto
   service Calculator {
       // ...
   }
   ```

   Let's call it `Calculator`.

2. **Time to add methods to the service**

   Each RPC method in a service is defined like this:

   ```proto
   rpc Multiply(TwoNumbers) returns (Number) {}
   ```

   Our service now looks like this:

   ```proto
   service calculator {
       rpc Multiply(TwoNumbers) returns (Number) {}
   }
   ```

3. **Defining Our Messages**

   ```proto
   message TwoNumbers {
       int64 num1 = 1;
       int64 num2 = 2;
   }

   message Number {
       int64 num = 1;
   }
   ```

With our interface ready, let's compile the proto file:

```bash
protoc -I . --go_out=plugins=grpc:. --go_opt=paths=source_relative pb/*.proto
```

## Creating the Server

The protoc has worked its magic, and now it's time to implement our gRPC server. Two steps, and we're good to go:

## Creating the Server

The protoc has worked its magic, and now it's time to implement our gRPC server. Two steps, and we're good to go:

1. **Implementing Service Interface**

   Check out the `server/calculator.go` file for the nitty-gritty details. We're creating a type and implementing all the interface methods.

   ```go
   // Calculator : Implements Calculator Service
   type Calculator struct{}

   // Multiply Implementation of Multiply interface
   func (c *Calculator) Multiply(ctx context.Context, in *pb.TwoNumbers) (*pb.Number, error) {
       return &pb.Number{Num: in.Num1 * in.Num2}, nil
   }
   ```

2. **Registering Our Service And Starting Server**

   Create a listener, set up the server, and let it rip! All neatly done in `server.go`.

   ```go
   lis, err := net.Listen("tcp", ":8081")
   if err != nil {
       log.Fatalf("failed to listen: %v", err)
   }

   // Create a new gRPC Server
   grpcServer := grpc.NewServer()

   // Register our Calculator service
   pb.RegisterCalculatorServer(grpcServer, &server.Calculator{})

   // Start the server
   log.Fatal(grpcServer.Serve(lis))
   ```

With the server implemented, let's run it:

```bash
# Start the server
go run server.go
```

Now, your server is up and running, ready to perform some mathematical magic! 🚀

## Creating the Client

For the client, all we need to do is dial a connection to the server and call the methods. Easy peasy:

1. **Create a connection to the server**

   ```go
   conn, err := grpc.Dial(":8081", grpc.WithInsecure())
   ```

2. **Create A New Client**

   ```go
   client := pb.NewCalculatorClient(conn)
   ```

3. **Call the service Method**

   ```go
   val, err := client.Multiply(context.Background(), &pb.TwoNumbers{Num1: 3, Num2: 4})
   ```

Ready to run and see if everything is working? Fire up the server, start the client, and let the magic happen!

```bash
# Start the server
go run server.go
```

```bash
# Run the client
go run client.go
```

If you see the server starting message and get a result like `num:12`, congratulations! 🎉 Your gRPC adventure in Go is off to a fantastic start.

In case you encounter a hiccup, double-check that your server is running, and the client is connecting to the correct address.

Happy coding, and may your gRPC journey be full of joy and learning! 🚀