+++
title = "Embark on a Protobuf Adventure with Go"
date = "2021-02-06T16:53:17+05:30"
author = "Shubham Srivastava"
description = "Unraveling the mysteries of protocol buffers and diving into the world of Go - Let the fun begin!"
tags = ["Go", "Protobuf", "Protocol Buffer"]
draft = false
+++

Protocol Buffers (or Protobuf) are one of those technologies that I've come to appreciate more and more over time. At first glance, they can seem a bit more complex than good old JSON, but once you get the hang of them, they offer a powerful way to structure and serialize data. This post is a quick, hands-on guide to getting started with Protobuf in Go, based on my own experience.

## The "Why" Behind Protobuf

For me, the appeal of Protobuf comes down to a few key things:
-   **A Clear Schema**: Defining your data structure in a `.proto` file forces you to be explicit about your data model. This has saved me from countless bugs that might have slipped through with a more flexible format like JSON.
-   **Performance**: The binary format is compact and fast to parse, which can make a real difference in high-throughput systems.
-   **Interoperability**: `protoc`, the Protobuf compiler, can generate code for many different languages, making it easier to build systems with multiple components written in different tech stacks.

## A Practical Example

Let's walk through a simple example: defining a `Person` message, generating the Go code, and then using it to serialize and deserialize data.

### 1. Define the Schema

First, I created a file named `person.proto` to define the structure of my `Person` message.

```proto
syntax = "proto3";

option go_package = "./pb";

package pb;

message Person {
  uint64 id = 1;
  string email = 2;
  bool is_active = 3;
}
```

This is a simple message with three fields, each with a type and a unique number.

### 2. Generate the Go Code

Next, I used the `protoc` compiler to generate the Go code from my `.proto` file.

```bash
# Make sure you have the Go plugin for protoc
go get -u github.com/golang/protobuf/protoc-gen-go

# Run the compiler
protoc --go_out=. --go_opt=paths=source_relative pb/person.proto
```

This command creates a `person.pb.go` file containing the Go struct for our `Person` message, along with some helper functions.

### 3. Use It in Go

Now I can use the generated `Person` struct in my Go code just like any other struct.

```go
package main

import (
	"fmt"
	"log"

	"github.com/golang/protobuf/proto"
	"path/to/your/pb"
)

func main() {
	person := &pb.Person{
		Id:       1001,
		Email:    "shubham@example.com",
		IsActive: true,
	}

	// Serialize the person to the binary format
	data, err := proto.Marshal(person)
	if err != nil {
		log.Fatal("marshaling error: ", err)
	}

	// Print the raw bytes
	fmt.Println("Raw bytes:", data)

	// Deserialize the data back into a new person object
	newPerson := &pb.Person{}
	err = proto.Unmarshal(data, newPerson)
	if err != nil {
		log.Fatal("unmarshaling error: ", err)
	}

	// Print the new person's details
	fmt.Println("Unmarshaled person:", newPerson)
}
```

### The Size Difference

One of the most interesting aspects of Protobuf is its compact size. To see this in action, I created another message to hold a list of people and compared the size of the serialized data to its JSON equivalent.

```proto
message PersonList {
  repeated Person persons = 1;
}
```

After serializing a list of three people, the results were pretty clear:
-   **Protobuf size**: 63 bytes
-   **JSON size**: 124 bytes

While this is a small example, you can see how the savings would add up in a system that processes millions of messages.

I hope this gives you a good starting point for exploring Protobuf in your own Go projects. It's a powerful tool to have in your arsenal, and once you get used to the workflow, it can make your data handling much more robust and efficient.