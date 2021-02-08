+++
title = "Getting Started In Protobuf With Go"
date = "2021-02-06T16:53:17+05:30"

description = "Understanding protocol buffers and getting started using Go."

tags = ["Go", "Protobuf", "Protocol Buffer"]
draft = false
+++

This article is a basic introduction to protocol buffers, I will go through what are protocol buffers and comparison to other alternatives :)

## What are Protocol Buffers?

"Protocol Buffers (a.k.a., protobuf) are Google's language-neutral, platform-neutral, extensible mechanism for serializing structured data." - https://developers.google.com

Protocol Buffers were designed to optimize the data transmitted over the wire. Protobuf provides binary serialization that results in smaller messages that need to be transferred over the wire compared to popular text based serialization in XML or JSON. This makes use of a special `.proto` file defining the schema using which the messages will be parsed

## Benefits

1. **Smaller and faster**
   
   Protobuf being a binary serialization format results in smaller messages that take up lesser bandwidth and transmit faster. Considering increasing number of organizations are using micro-services that interact with each other for millions of requests per day every small optimization for individual requests scales up to concrete numbers in terms of cost.

2. **Backward and forward compatibility**
   
   To maintain backward and forward compatibility the protobuf schema definitions use numbered fields this enables newer changes to schema definitions will be compatible with older code still being able to parse messages.   

3. **Interoperability**
   
   The protobuf comes with custom proto file compiler that will read the schema definition and code generators for most common languages out of the box. This makes the serialization and deserialization of messages compatible with all supported languages with no boilerplate code. This makes working in multiple languages in the stack easily.

4. **Clear cross-application scheme**
   
   Protobuf enables a strict schema across the stack making the data format consistent across the system, this becomes more important when your system works with multiple application with same schemas, now the data will be in same uniform format across the system.

## Lets create our first Schema

So lets create our first proto file named `pb/person.proto`.

{{< highlight proto "linenos=table" >}}
syntax = "proto3";

package main;

option go_package = "main";

message Person {
  uint64 id = 1;
  string email = 2;
  bool is_active = 3;
}
{{< / highlight >}}

Now that we have defined our first message, we will need to use the proto compiler to generate code for language we want to use in our case Go. the setup instructions can be found [here](https://developers.google.com/protocol-buffers/docs/gotutorial#compiling-your-protocol-buffers).

We can now use the protoc compiler by providing path to input proto file and output go directory

{{< highlight bash "linenos=table" >}}
protoc --proto_path=pb/. --go_out=pb/. person.proto
{{< / highlight >}}

Now to use this generated boilerplate code we will create our main file

{{< highlight go "linenos=table" >}}
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
{{< / highlight >}}

Your project directory should now look like

{{< highlight bash "linenos=table" >}}
.
 |-pb
 | |-person.proto
 | |-person.pb.go
 |-go.mod
 |-go.sum
 |-main.go
{{< / highlight >}}

Now you can see the output on running main file like:
{{< highlight bash "linenos=table" >}}
➜  example1 git:(master) ✗ go run main.go                                                                        
id:1001  email:"abc@xyz.in"  is_active:true
{{< / highlight >}}

You can checkout code for this example here on [github](https://github.com/sri-shubham/blogcode/tree/master/Getting_Started_In_Protobuf_With_Go)

## Moment of Truth

Lets compare the difference in message size that we have been talking about. We will compare same data stored in JSON and protobuf serialized message.

We added a new message to protobuf file and compiled it.

{{< highlight proto "linenos=table" >}}
// Person : Schema describing a person
message PersonList {
  repeated Person persons = 1;
}
{{< / highlight >}}

Now we will take this new message publish data and serialize to see the difference in size.

{{< highlight go "linenos=table" >}}
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
	fmt.Println("length of jsonOut", len(jsonOut))
}
{{< / highlight >}}

Finally lets run the program and check. Almost 3 times smaller message size.

{{< highlight bash "linenos=table" >}}
➜  example2 git:(master) ✗ go run main.go
length of protoOut 63
length of jsonOut 124
{{< / highlight >}}