+++
title = "Neon: Light Up Your API with Golang Magic ✨"
date = "2024-01-13T10:45:43+05:30"
description = "A sleek Rest framework that effortlessly lights up your API development, using struct tags for that extra bit of handler magic."
tags = ["Go", "REST", "API", "Framework", "side project"]
draft = false
author = "Shubham Srivastava"
+++

Repo: [Neon on GitHub](https://github.com/sri-shubham/neon)

I've always been fascinated by how a little bit of structure can make code feel so much cleaner. That's the idea behind Neon, a small REST framework I built for Go. I wanted to see if I could use struct tags to define API routes and middleware, turning what's usually a block of repetitive code into something more declarative and, honestly, more fun.

### The Magic of Struct Tags

The core idea of Neon is to use struct tags to attach metadata to your HTTP handlers. Instead of manually wiring up routes, you can define them right alongside your service's methods.

Here's what it looks like in practice:

```go
// UserService is a container for our handlers
type UserService struct {
    // This defines the base route, version, and middleware for the whole service
    neon.Module `base:"/user" v:"1" middleware:"UserCtx"`

    // These fields represent our handlers
    getUser     neon.Get `middleware:"ReqID"`
    getUserByID neon.Get `base:"/{:id}" middleware:"ReqID"`
}

// GetUser is a standard http.HandlerFunc
func (s UserService) GetUser(w http.ResponseWriter, r *http.Request) {
    fmt.Println(r)
    fmt.Fprintf(w, fmt.Sprint(r.Header))
}

// UserCtx is a middleware specific to this service
func (s UserService) UserCtx(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        fmt.Println("Received Request on User", runtime.FuncForPC(reflect.ValueOf(next).Pointer()).Name())
        next.ServeHTTP(w, r)
    })
}
```

By reading the struct tags, Neon automatically figures out the routing:
- The base route for `UserService` is `/user/v1`.
- `getUser` becomes a `GET` handler at `/user/v1`.
- `getUserByID` becomes a `GET` handler at `/user/v1/{:id}`.

It’s a small shift, but it keeps the configuration right next to the implementation, which I find really helps with clarity.

### Setting It All Up

The setup is designed to be minimal. In your `main` function, you just create a new Neon app, register your services, and run it.

```go
func main() {
    // Create a new Neon server
    app := neon.New()
    app.Port = 9999

    // Register global middleware
    app.AddMiddleware(middleware.Logger)

    // Register named middleware that can be used in struct tags
    app.RegisterMiddleware("UserCtx", UserService{}.UserCtx)
    app.RegisterMiddleware("ReqID", middleware.RequestID)

    // Add our service
    app.AddService(&UserService{})

    // Run the server
    fmt.Println(app.Run())
}
```

This project was a fun exploration for me, and it’s turned into a tool I genuinely enjoy using for my personal projects. It’s lightweight, has no external dependencies, and brings a little bit of that declarative magic to Go.

If you're curious, you can check out the full source code and more examples on [GitHub](https://github.com/sri-shubham/neon). Let me know what you think!
