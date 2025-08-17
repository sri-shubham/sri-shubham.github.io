+++
title="Introducing Crumbs: A Rich Error Handling Library for Go"
date=2025-08-17T00:00:00+00:00
draft=false
tags=["go", "golang", "error-handling", "open-source", "development"]
categories=["Programming", "Open Source"]
author="Shubham Srivastava"
description="Introducing Crumbs, a lightweight Go library that enhances error handling with contextual information, while maintaining full compatibility with the standard library."
+++

## The Love-Hate Relationship with Go's Errors

I love Go. Its simplicity, performance, and concurrency model are fantastic. But if I'm being honest, I've always had a bit of a love-hate relationship with its error handling. The `if err != nil` pattern is beautifully explicit, but the errors themselves can feel... well, a bit plain.

When an application is simple, a single error string is often enough. But as my projects grew, especially in distributed systems, I found myself needing more. When something went wrong in production, I needed context. What was the user doing? Which `orderID` failed? What was the state of the system at that exact moment? A simple `database connection timeout` just wasn't cutting it.

## Leaving a Trail of Breadcrumbs

That's the story behind [Crumbs](https://github.com/sri-shubham/crumbs), a little library I built to make my life easier. It's a lightweight way to enhance Go's standard errors without throwing away the patterns we all know. Crumbs lets you add contextual "breadcrumbs" as key-value pairs to your errors, turning a simple error message into a rich, debuggable snapshot.

### What It Brings to the Table

- **Key-Value Context**: Attach useful data to your errors.
- **`context.Context` Integration**: Automatically pull in context from the request.
- **Standard Library Compatibility**: Plays nicely with `errors.Is`, `errors.As`, and `errors.Unwrap`.
- **Optional Stack Traces**: Add stack traces when you need them, without the overhead otherwise.
- **Logger-Friendly**: Designed to feed structured data directly into your favorite logger.

## Why I Finally Built It

I was tired of reinventing the wheel on every project. I'd find myself writing ad-hoc error formatters, wrestling with structured logs to piece together what happened, and feeling like I was fighting Go's natural error model.

I wanted a solution that felt like it belonged in Go—something that worked with, not against, the standard library and made debugging a little less painful.

## How It Works in Practice

Here’s a quick look at how you'd use Crumbs. It's designed to be intuitive.

```go
import (
    "context"
    "github.com/sri-shubham/crumbs"
)

func ProcessOrder(ctx context.Context, orderID string) error {
    // Add some initial context from the request
    ctx = crumbs.AddCrumb(ctx, 
        "orderID", orderID,
        "timestamp", time.Now(),
    )
    
    order, err := fetchOrder(ctx, orderID)
    if err != nil {
        // Wrap the error with more specific context about the failure
        return crumbs.Wrap(ctx, err, "failed to process order",
            "status", "failed",
            "step", "fetch",
        )
    }
    
    // ...continue processing
    return nil
}
```

Now, when an error occurs, you get a much clearer picture:

```
failed to process order: database connection timeout
Crumbs:
  orderID: ORD-12345
  timestamp: 2025-08-17 08:42:15 +0000 UTC
  status: failed
  step: fetch
```

Suddenly, you have actionable information right where you need it.

## But What About Performance?

I was conscious of the overhead. Adding context shouldn't cripple the application. I ran some benchmarks to make sure Crumbs stays lean.

```
BenchmarkErrorsNew-8             86884852    13.70 ns/op     16 B/op    1 allocs/op
BenchmarkCrumbsNew-8             27884496    41.84 ns/op    112 B/op    2 allocs/op
BenchmarkCrumbsNewWithCrumbs-8   10454186   115.5 ns/op     400 B/op    3 allocs/op
```

The basic overhead for creating an error with Crumbs is minimal (around 42ns vs. 14ns for a standard error). You only pay for what you use, and features like stack traces can be enabled selectively.

## Plays Well with Structured Logging

One of my favorite parts is how seamlessly Crumbs integrates with structured logging libraries. You can easily pull the structured context out of the error and pass it to your logger.

```go
func logError(logger Logger, err error) {
    fields := map[string]interface{}{}
    
    var cerr *crumbs.Error
    if errors.As(err, &cerr) {
        // Extract all the crumbs into fields for the logger
        for k, v := range cerr.GetCrumbs() {
            fields[k] = v
        }
    }
    
    logger.Error(err.Error(), fields)
}
```

## The Road Ahead

This is just the first version. I have a few ideas for where to take Crumbs next:
- Tighter integrations with popular logging libraries.
- More powerful formatting options.
- The ability to filter stack traces.
- Squeezing out even more performance.

## Give It a Try!

Crumbs is open source and ready to use. You can grab it with a simple `go get`:

```bash
go get github.com/sri-shubham/crumbs
```

I'd genuinely love to hear what you think. Whether it's feedback, a feature request, or a contribution, all are welcome.

## Wrapping Up

Error handling in Go is good, but it can be better. With Crumbs, I've tried to strike a balance between keeping the simplicity we love about Go and adding the rich, contextual information we need to build and maintain robust applications.

Check out [the GitHub repository](https://github.com/sri-shubham/crumbs) to see more examples and dive into the code.

---

*How do you handle errors in your Go projects? I'd be curious to hear about your patterns and solutions in the comments below!*
