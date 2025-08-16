+++
title = "Embark on a Protobuf Adventure with Go"
date = "2021-02-06T16:53:17+05:30"
author = "Shubham Srivastava"
description = "Unraveling the mysteries of protocol buffers and diving into the world of Go - Let the fun begin!"
tags = ["Go", "Protobuf", "Protocol Buffer"]
draft = false
+++

Greetings, fellow code explorers! 🚀 Ready to decode the secrets of protocol buffers and kickstart your journey with Go? Join me on this adventure where we'll demystify the wonders of Protobuf, compare it to other alternatives, and even create our own schemas! 🕵️‍♂️✨

## What are Protocol Buffers?

"Protocol Buffers (a.k.a., protobuf) are Google's language-neutral, platform-neutral, extensible mechanism for serializing structured data." - [Google Developers](https://developers.google.com)

Think of Protobuf as a superhero for your data - compact, lightning-fast, and ready for action. It uses binary serialization, making messages smaller and zippier compared to the verbose XML or JSON. How? Through a special `.proto` file defining the data schema. Let's unravel this magic!

## Benefits

1. **Smaller and faster**
   
   Protobuf swoops in with binary serialization, resulting in smaller messages that zip through the wire faster than a superhero in action. Perfect for microservices handling millions of requests daily - every optimization counts!

2. **Backward and forward compatibility**
   
   Numbered fields in protobuf schemas keep your code future-proof. Newer changes to the schema play nice with older code, ensuring compatibility and peace in the coding kingdom.

3. **Interoperability**
   
   Protobuf brings its own custom proto file compiler, generating code for various languages. No more language barriers - serialize and deserialize messages seamlessly across the coding landscape.

4. **Clear cross-application scheme**
   
   Protobuf enforces a strict schema, bringing order to the chaos. Your data format stays consistent across the system, especially handy when your system dances with multiple applications sharing the same schemas.

## Let's Create Our First Schema

Enough chit-chat, let's get our hands dirty! Say hello to our first proto file, named `pb/person.proto`.

```proto
syntax = "proto3";

package main;

option go_package = "main";

message Person {
  uint64 id = 1;
  string email = 2;
  bool is_active = 3;
}
```

Hold on to your hats! We've defined our first message. Now, let's unleash the protoc compiler:

```bash
protoc --proto_path=pb/. --go_out=pb/. person.proto
```

The magic is happening! 🎩✨

## Let's Get Coding!

Check out your main file where the real fun begins:

```go
package main

import (
	"example1/pb"
	"fmt"
)

func main() {
	var person pb.Person

	person.Id = 1001
	person.Email = "abc@xyz.in"
	person.IsActive = true

	fmt.Println(&person)
}
```

Run the main file, and voila! Your project directory should now look like a wizard's spell book:

```bash
.
 |-pb
 | |-person.proto
 | |-person.pb.go
 |-go.mod
 |-go.sum
 |-main.go
```

Run the main file:

```bash
# Start the magic!
go run main.go
```

The console should light up with the details of our person. 🌟

## Let's Share the Joy! 🚀

Excited to dive into the code? You can find the entire codebase and follow along on [GitHub](https://github.com/sri-shubham/blogcode/tree/master/Getting_Started_In_Protobuf_With_Go). Feel free to fork, clone, and explore to your heart's content!

## Moment of Truth

Let's compare the difference in message size that we've been talking about. We'll compare the same data stored in JSON and protobuf serialized messages.

```proto
// Person : Schema describing a person
message PersonList {
  repeated Person persons = 1;
}
```

Now we will take this new message, publish data, and serialize to see the difference in size.

```go
func main() {
	var list pb.PersonList

	list.Persons = append(list.Persons, &pb.Person{
		Id:       1001,
		Email:    "JonDoe@xyz.com",
		IsActive: false,
	})

	list.Persons = append(list.Persons, &pb.Person{
		Id:       1002,
		Email:    "Ronald@xyz.com",
		IsActive: false,
	})

	list.Persons = append(list.Persons, &pb.Person{
		Id:       1003,
		Email:    "Harold@xyz.com",
		IsActive: false,
	})

	pbout, err := proto.Marshal(&list)
	if err != nil {
		panic(err)
	}

	jsonOut, err := json.Marshal(list)
	if err != nil {
		panic(err)
	}

	fmt.Println("length of protoOut", len(pbout))
	fmt.Println

("length of jsonOut", len(jsonOut))
}
```

The program output should look like this:

```bash
# Witness the magic!
go run main.go
```

Output:

```bash
length of protoOut 63
length of jsonOut 124
```

The console reveals the lengths of `protoOut` and `jsonOut`. The power of Protobuf in action! 🚀

Feel the thrill? Dive into the code and explore the wonders of Protobuf with Go. Happy coding!