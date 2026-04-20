+++
title = "Neon: A Lightweight, Zero-Dependency Go HTTP Framework"
date = "2024-01-13T10:45:43+05:30"
description = "The Pursuit of Minimalism in Go Web APIs - Building a high-velocity developer experience without the dependency tree."
tags = ["Go", "REST", "API", "Framework", "Architecture"]
draft = false
author = "Shubham Srivastava"
github_repo = "sri-shubham/neon"
+++

Repo: [Neon on GitHub](https://github.com/sri-shubham/neon)

#### The Pursuit of Minimalism in Go Web APIs

With the release of Go 1.22, the game changed for `http.ServeMux`. The standard library finally gained the routing power it deserved, leading to a fundamental question: Do we still need massive frameworks for modern microservices?

**The Engineering Stance:** 
Neon isn't a "love-hate" response to existing tools; it's a technical challenge. Can we build a high-velocity developer experience without a 50MB dependency tree? By building directly on top of `net/http`, Neon maintains a "Standard Library First" architecture, ensuring long-term maintainability and zero external bloat.

**The Philosophy:** 
Minimalism in software isn't about having fewer features; it's about having exactly what you need with zero overhead. Neon is designed for developers who value deep understanding over "magic" abstractions.

---

#### The “Why” Behind Neon

**The Boilerplate Problem:** 
In every microservice I built, I found myself writing the same repetitive logic: manual path parameter parsing, boilerplate middleware chains, and scattered route registration. This boilerplate doesn't add value—it adds noise.

**The Goal:** 
Neon aims to be a thin wrapper that adds velocity without adding weight. It transforms imperative route registration into declarative structures, keeping your API's intent clear and centralized.

**The Audience:** 
Neon is for the pragmatist. If you want the power and stability of the Go standard library but the clean, struct-tag syntax of a modern framework, Neon is built for you.

---

#### The Magic of Declarative Routing

**The Concept:** 
In Neon, your API surface area is defined by your data structures. Using struct tags, we move routing logic out of a giant `main.go` and into the handlers themselves.

**The Visual:**
```go
type TaskService struct {
    neon.Module `base:"/tasks" v:"1" middleware:"Auth"`
    
    // Declarative endpoint definition
    getTasks   neon.Get    `url:"/"`
    getTask    neon.Get    `url:"/{id}"`
    createTask neon.Post   `url:"/" middleware:"RateLimit"`
}
```

**The Benefit:** 
This approach makes the project structure navigable as it scales. You can look at any service struct and immediately understand its entire API contract and security posture without jumping between files.

---

#### Under the Hood: Reflection & The Hot Path

**The Implementation:** 
Neon uses reflection at boot time to analyze your service structs and map them to standard `http.Handler` functions. This "heavy lifting" is done once during registration, keeping the request-time "hot path" as lean as raw `net/http`.

**Middleware Chains:** 
I implemented a three-level recursive middleware pattern (Global, Service, and Endpoint) that remains 100% compatible with standard `http.Handler`. This allows you to mix and match standard Go middleware with Neon-specific handlers seamlessly.

**Trade-offs:** 
Performance is the elephant in the room. While reflection has a bad reputation, Neon's approach ensures that the reflection overhead is incurred only at startup. The micro-benchmark difference compared to raw `net/http` is negligible, while the developer ergonomics gain is substantial.

---

Ready to simplify your Go APIs? Explore the full source and examples on [GitHub](https://github.com/sri-shubham/neon).
