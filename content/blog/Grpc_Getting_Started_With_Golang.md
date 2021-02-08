+++
title= "Getting Started In gRPC With Go"
date= "2021-02-07T19:45:43+05:30"
description = "A basic tutorial introduction to gRPC in Go."

tags = ["Go", "Protobuf", "Protocol Buffer", "gRPC"]
draft= false
+++

This article will go through a basic introduction to gRPC with GO. This will walk through making a basic service in proto file, using protoc compiler to generate server and client code and implementation of client and server.

## Perquisites

Assuming you already have basic introduction to [protocol buffers](/getting-started-in-protobuf-with-go/) and [gRPC]()

To follow along you can clone the example directory from [github](https://github.com/sri-shubham/blogcode/tree/master/Getting_Started_In_gRPC_WithGo/example1) and navigate to `Getting_Started_In_gRPC_WithGo/
example1`

If you do not have `protoc` compiler installed you can learn how to do this [here](http://google.github.io/proto-lens/installing-protoc.html).

Then you can install the go code generator plugins using `go get` like

    {{<highlight bash  "linenos=table">}}
go get -u github.com/golang/protobuf/protoc-gen-go
go get -u google.golang.org/grpc/cmd/protoc-gen-go-grpc
    {{</highlight>}}

## Lets Make Our Very First Service

For simplicity we will create a RPC service that will accept two numbers and multiply them

1. **Defining our first service**
   
    In proto file for creating a service we will use this syntax

    {{< highlight proto  "linenos=table" >}}
service <ServiceName> {
    ...
}
    {{< /highlight >}}

    In out case lets name the service `Calculator`

2. **Time to add methods to the service**
   
   Each RPC method in a service is defined in following syntax
    
   {{< highlight proto "linenos=table" >}}
rpc <FunctionName>(<RequestMessage>) returns (<ResponseMessage>) {}
   {{< /highlight >}}

   We will add a `multiply` method to our calculator service. This will make our service look like this. `TwoNumbers` and `Number` are the messages we will create.

   {{< highlight proto "linenos=table" >}}
service calculator {
    rpc multiply(TwoNumbers) returns (Number) {}
}
   {{< /highlight >}}   

3. **Defining Our Messages**
   
   {{< highlight proto "linenos=table" >}}
message TwoNumbers {
    int64 num1 = 1;
    int64 num2 = 2;
}

message Number {
    int64 num = 1;
}
   {{< /highlight >}}

Now that we have our interface ready we can compile the proto file using our protoc compiler. this will generate our client and server code.

   {{< highlight bash "linenos=table" >}}
protoc -I . --go_out=plugins=grpc:. --go_opt=paths=source_relative pb/*.proto
   {{< /highlight >}}

## Creating the server

The protoc generated the go file containing the server interface definition. Writing a gRPC server is a 2 step process

1. **Implementing Service Interface**
   
   The generated `proto` file will have a interface in format `<serviceName>Server` in our case `CalculatorServer` with list of methods to be implemented. to do this we will create a type and implement all interface methods. You can find this in `server/calculator.go`.

   {{< highlight go "linenos=table" >}}
// Calculator : Implements Calculator Service
type Calculator struct{}

// Multiply Implementation of Multiply interface
func (c *Calculator) Multiply(ctx context.Context, in *pb.TwoNumbers) (*pb.Number, error) {
	return &pb.Number{Num: in.Num1 * in.Num2}, nil
}
   {{< /highlight >}}

2. **Registering Our Service And Starting Server**
   
   Firstly we will create a listener for our server at the desired port for example `8081`.
    
    {{< highlight go "linenos=table" >}}
lis, err := net.Listen("tcp", ":8081")
if err != nil {
    log.Fatalf("failed to listen: %v", err)
}
    {{</highlight>}}

   Now we can create a new gRPC Server

   {{< highlight go "linenos=table" >}}
grpcServer := grpc.NewServer()
pb.RegisterCalculatorServer(grpcServer, &server.Calculator{})
    {{</highlight>}}

    Finally we can start the server.

    {{< highlight go "linenos=table" >}}
log.Fatal(grpcServer.Serve(lis))
    {{</highlight>}}

    You can find this implemented in `server.go`

## Creating the Client

For the client we just need to dial a connection to server anf then call the `New<serviceName>Client` function.Now using this client we can call the methods implemented by the service.

1. **Create a connection to server**

{{< highlight go "linenos=table" >}}
conn, err := grpc.Dial(":8081", grpc.WithInsecure())
if err != nil {
    panic(err)
}
{{</highlight>}}

2. **Create A New Client**

{{< highlight go "linenos=table" >}}
client := pb.NewCalculatorClient(conn)
{{</highlight>}}

3. **Call the service Method**

{{< highlight go "linenos=table" >}}
val, err := client.Multiply(context.Background(), &pb.TwoNumbers{Num1: 3, Num2: 4})
if err != nil {
    panic(err)
}
{{</highlight>}}

You can find this implemented in `client.go`

## Lets Run And See If Everything Is Working

First Lets Start The Server. If you see this in the output then server started successfully.

{{< highlight bash "linenos=table" >}}
➜  example1 git:(master) ✗ go run server.go
2021/02/08 09:18:48 Server starting...
{{</highlight>}}


Now run the client in a new terminal window.

{{< highlight bash "linenos=table" >}}
➜  example1 git:(master) ✗ go run client.go
num:12
{{</highlight>}}

Everything seems working as expected.

If you see something like the error below means client failed to connect to server, then check your server is running and client is connecting on correct address.

{{< highlight bash "linenos=table" >}}
➜  example1 git:(master) ✗ go run client.go
panic: rpc error: code = Unavailable desc = connection error: desc = "transport: Error while dialing dial tcp :8081: connect: connection refused"

goroutine 1 [running]:
main.main()
        ~/example1/client.go:21 +0x21e
exit status 2
{{</highlight>}}