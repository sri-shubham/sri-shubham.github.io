+++
title = "Neon v0.1.0: A Personal Go HTTP Framework"
date = "2024-08-16T10:00:00Z"
draft = false
tags = ["golang", "http", "framework", "api", "rest", "release", "announcement"]
author = "Shubham Srivastava"
description = "Sharing Neon v0.1.0 - A lightweight, zero-dependency REST framework for Go that I built to simplify API development through struct tags."
+++

# Neon v0.1.0: A Personal Go HTTP Framework

I'm excited to share **Neon v0.1.0** - a personal project I've been working on to create a lightweight, zero-dependency REST framework for Go. It's designed to simplify API development through struct tags and reduce the boilerplate I was tired of writing.

## What I Built

### Built for Modern Go
Neon is built from the ground up for Go 1.22+ and leverages the latest `http.ServeMux` enhancements. I wanted to create something that feels like pure Go while eliminating the repetitive code I found myself writing for every API project.

### Zero External Dependencies
I eliminated external dependencies by using Go 1.22's enhanced `net/http` package. This means:
- **Smaller binaries** - No bloat from external packages
- **Better security** - Fewer attack vectors and supply chain risks
- **Faster builds** - No external dependencies to download
- **Pure Go** - Leveraging the standard library's latest improvements

### Simple Go Features
Neon requires Go 1.22+ and leverages the latest `http.ServeMux` enhancements:

```go
type UserService struct {
    neon.Module `base:"/users" v:"1"`
    getUser     neon.Get `url:"/{id}"`
    getUserPosts neon.Get `url:"/{id}/posts/{postId}"`
}

func (s UserService) GetUser(w http.ResponseWriter, r *http.Request) {
    userID := r.PathValue("id")        // Clean parameter extraction
    w.Write([]byte(fmt.Sprintf("User: %s", userID)))
}
```

## Key Features I Implemented

### 1. Struct Tag Configuration
Define your API structure using struct tags (my favorite part):

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

### 2. Three-Level Middleware System
I implemented middleware at three levels for flexibility:

- **Global**: Applied to all endpoints across your application
- **Service**: Applied to all endpoints within a specific service
- **Endpoint**: Applied only to specific endpoints

```go
// Global middleware
app := neon.New()
app.Use(loggingMiddleware)
app.Use(corsMiddleware)

// Service-level middleware
type APIService struct {
    neon.Module `base:"/api" v:"1" middleware:"auth,rateLimit"`
    // All endpoints inherit auth and rateLimit
}

// Endpoint-specific middleware
type AdminService struct {
    neon.Module `base:"/admin" v:"1"`
    dashboard   neon.Get `url:"/dashboard" middleware:"admin,audit"`
    // Only dashboard endpoint gets admin and audit middleware
}
```

### 3. Clean Routing
- **Named path parameters** with simple extraction
- **Multiple HTTP methods** on the same path
- **Proper HTTP status codes** (real 404s and 405s)
- **API versioning** support

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

## Future Plans

Here's what I'm thinking about for future versions:

### v0.2.0 - More Developer Tools (Q4 2025)
- **OpenAPI/Swagger integration** - Auto-generate docs
- **Request/response validation** - Built-in validation
- **Hot reload** - Development server improvements
- **CLI tool** - Project scaffolding
- **Metrics support** - Basic Prometheus metrics

### v0.3.0 - Advanced Features (Q1 2026)
- **WebSocket support** - Real-time capabilities
- **Caching layer** - HTTP caching
- **Rate limiting** - Request throttling
- **Background jobs** - Simple job queue

### v0.4.0 - Enterprise-ish Features (Q2 2026)
- **Distributed tracing** - OpenTelemetry integration
- **Health checks** - Monitoring endpoints
- **Circuit breaker** - Resilience patterns

### v1.0.0 - Stable API (Q3 2026)
- **API stability** - No more breaking changes
- **Performance optimizations** - Make it faster
- **Better documentation** - Comprehensive guides

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
