+++
title = "Neon v0.1.0: A Personal Go HTTP Framework"
date = "2025-08-16T00:00:00Z"
draft = false
tags = ["golang", "http", "framework", "api", "rest", "release", "announcement"]
author = "Shubham Srivastava"
description = "Sharing Neon v0.1.0 - A lightweight, zero-dependency REST framework for Go that I built to simplify API development through struct tags."
+++

I'm excited to share the first release of **Neon (v0.1.0)**, a personal project that grew out of my desire to simplify how I build REST APIs in Go. I've always loved Go's standard library, and with the recent enhancements to `http.ServeMux` in Go 1.22, I saw an opportunity to create a lightweight, zero-dependency framework that felt both powerful and distinctly "Go."

## The "Why" Behind Neon

I built Neon to solve a problem I kept running into: writing the same boilerplate for every new API. I wanted a way to define routes, middleware, and API versions declaratively, without pulling in heavy external dependencies. My goal was to create something that leverages the power of the standard library while reducing repetitive code.

### Sticking with the Standard Library

A core principle for Neon was to have **zero external dependencies**. By building on top of Go 1.22's improved `http.ServeMux`, I could keep the framework lean and secure. This means smaller binaries, faster builds, and no supply chain risks—just pure Go.

It also means that Neon plays nicely with the rest of the Go ecosystem. For example, extracting path parameters is as simple as calling `r.PathValue("id")`.

```go
type UserService struct {
    neon.Module `base:"/users" v:"1"`
    getUser     neon.Get `url:"/{id}"`
    getUserPosts neon.Get `url:"/{id}/posts/{postId}"`
}

func (s UserService) GetUser(w http.ResponseWriter, r *http.Request) {
    userID := r.PathValue("id") // Standard Go 1.22+ feature
    w.Write([]byte(fmt.Sprintf("User: %s", userID)))
}
```

## What I've Built So Far

Here are some of the key features I've implemented in this first version:

### 1. Declarative API Structure with Struct Tags

This is my favorite part. You can define your entire API structure—routes, methods, middleware, and versions—using simple struct tags. It keeps the configuration right next to the code that uses it.

```go
type BlogService struct {
    neon.Module `base:"/blog" v:"2" middleware:"auth,logging"`
    
    // GET /blog/v2/posts
    listPosts   neon.Get    `url:"/posts"`
    
    // POST /blog/v2/posts
    createPost  neon.Post   `url:"/posts" middleware:"admin"`
    
    // GET /blog/v2/posts/{id}
    getPost     neon.Get    `url:"/posts/{id}"`
    
    // PUT /blog/v2/posts/{id}
    updatePost  neon.Put    `url:"/posts/{id}" middleware:"owner"`
    
    // DELETE /blog/v2/posts/{id}
    deletePost  neon.Delete `url:"/posts/{id}" middleware:"admin"`
}
```

### 2. A Flexible Middleware System

I wanted middleware to be flexible, so I designed a three-level system:
- **Global**: Applied to every request.
- **Service-level**: Applied to all endpoints within a service.
- **Endpoint-specific**: Applied only to a single handler.

```go
// Global middleware
app := neon.New()
app.Use(loggingMiddleware, corsMiddleware)

// Service-level middleware
type APIService struct {
    neon.Module `base:"/api" v:"1" middleware:"auth,rateLimit"`
    // All endpoints here will use auth and rateLimit middleware
}

// Endpoint-specific middleware
type AdminService struct {
    neon.Module `base:"/admin" v:"1"`
    dashboard   neon.Get `url:"/dashboard" middleware:"admin,audit"`
    // The dashboard gets extra admin and audit middleware
}
```

### 3. Clean and Powerful Routing

Because it's built on the new `http.ServeMux`, Neon gets a lot of powerful routing features for free, like clean path parameter extraction, proper handling of HTTP methods, and support for API versioning.

This is just the beginning, but I'm really happy with how it's turned out. It's been a great learning experience and has already made my personal projects much more fun to build.

If you're interested in checking it out, you can find the source code and more examples on [GitHub](https://github.com/sri-shubham/neon). I'd love to hear any feedback or ideas you might have!

### 4. Good Developer Experience
- **100% test coverage** - I'm pretty thorough with testing
- **Clear documentation** - Tried to make it easy to understand
- **Integration tests** - Real-world usage scenarios
- **Simple configuration** - Sensible defaults

## Performance & Design

I designed Neon with performance and simplicity in mind:

- **Minimal overhead** - Keep request handling fast
- **Memory conscious** - Avoid unnecessary allocations
- **Thread-safe** - Safe for concurrent use
- **Well-tested** - Comprehensive test suite


## Contributing

This is an open-source project and I'd love contributions! Here's how you can help:

### If You Want to Use It
- **Try it out** in a side project
- **Report bugs** if you find any
- **Share feedback** - what works, what doesn't
- **Star the repo** if you like it

### If You Want to Contribute Code
- **Check the issues** - I'll add some "good first issue" labels soon
- **Improve docs** - The README could definitely use more detail
- **Add examples** - Would love to see interesting use cases
- **Write tests** - More coverage is always good

I'm still working on detailed contributing guidelines, but feel free to open an issue or PR if you're interested!

## Resources

### Quick Start
```bash
go get -u github.com/sri-shubham/neon@v0.1.0
```

### Documentation
- **[GitHub Repository](https://github.com/sri-shubham/neon)** - Main repo with README
- **[Go Package Docs](https://pkg.go.dev/github.com/sri-shubham/neon)** - Auto-generated API docs

*More examples and detailed documentation coming soon!*

## Thanks

Thanks to the Go team for the great improvements in Go 1.22 that made this possible, and to anyone who tries out Neon and provides feedback!

## Try It Out

Want to give Neon a quick try? Here's a simple example:

```bash
# Create a new project
mkdir my-api && cd my-api
go mod init my-api

# Install Neon
go get -u github.com/sri-shubham/neon@v0.1.0

# Create main.go
cat << 'EOF' > main.go
package main

import (
    "fmt"
    "net/http"
    "github.com/sri-shubham/neon"
)

type UserService struct {
    neon.Module `base:"/users" v:"1"`
    getUser     neon.Get `url:"/{id}"`
}

func (s UserService) GetUser(w http.ResponseWriter, r *http.Request) {
    userID := r.PathValue("id")
    w.Write([]byte(fmt.Sprintf("Hello, %s!", userID)))
}

func main() {
    app := neon.New()
    app.AddService(&UserService{})
    
    if err := app.Run(); err != nil {
        panic(err)
    }
}
EOF

# Run your API
go run main.go

# Test it (in another terminal)
curl http://localhost:8080/users/alice
# Returns: Hello, alice!
```

That's it! You've got a working API with path parameters and proper routing.

## Feedback Welcome

This is a personal project that I'm sharing because I think others might find it useful. If you try it out, I'd love to hear your thoughts - good or bad! You can:

- **Open issues** on GitHub for bugs or feature requests
- **Start discussions** for questions or ideas
- **Send me a message** if you build something cool with it

---

Thanks for reading, and happy coding! 🙂

---

*If you like Neon, consider starring it on [GitHub](https://github.com/sri-shubham/neon) to help others discover it.*
