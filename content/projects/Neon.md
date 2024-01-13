+++
title = "Neon: Light Up Your API with Golang Magic ✨"
date = "2024-01-13T10:45:43+05:30"
description = "A sleek Rest framework that effortlessly lights up your API development, using struct tags for that extra bit of handler magic."
tags = ["Go", "REST", "API", "Framework", "side project"]
draft = false
+++

Repo: [Neon on GitHub](https://github.com/sri-shubham/neon)

Hey fellow coders! 👋 Have you ever wished for a coding tool that's as sleek as your favorite sports car? Well, look no further! Introducing Neon, a Rest framework that brings the magic back to your API development. It's like fairy dust for your Golang handlers, using struct tags to sprinkle a bit of that extra sparkle. Let's dive into this enchanted forest of coding wonders! ✨

### Key Features ✨

**Struct Tag Magic:**
Neon makes HTTP handler metadata a breeze with struct tags. Think of them as little notes to your code, making it look less like a jungle and more like a well-organized garden.

**Annotation-Like Annotations:**
Golang might not have native annotations, but Neon says, "Who needs 'em?" Struct tags step up to the plate, mimicking those fancy annotations and making your code look swanky and readable.

### Let's Get Coding! 🚀

#### Setting Up the Magic Wand (Main File)

In the mystical land of Golang, setting up Neon is as easy as casting a spell:

```go
func main() {
    // Create a Neon server
    app := neon.New()

    // Choose a magical port
    app.Port = 9999

    // Add a global middleware to sprinkle some magic on all routes
    app.AddMiddleware(middleware.Logger)

    // Register named middlewares for services or specific endpoints
    app.RegisterMiddleware("UserCtx", UserService{}.UserCtx)
    app.RegisterMiddleware("ReqID", middleware.RequestID)

    // Meet UserService, the keeper of handlers' metadata
    app.AddService(&UserService{})

    // And now, let the magic begin! 🎩✨
    fmt.Println(app.Run())
}
```

Now, wasn't that easier than brewing a potion? We set up our Neon server, picked a cool port, added a sprinkle of global middleware, registered some named magic spells, and introduced our service handler, the keeper of all things enchanted.

#### Defining Spells (Services and Handlers)

```go
// UserService: The Enchanting Handlers
type UserService struct {
    neon.Module `base:"/user" v:"1" middleware:"UserCtx"`

    getUser     neon.Get `middleware:"ReqID"`
    getUserByID neon.Get `base:"/{:id}" middleware:"ReqID"`
}

// UserCtx: A Middleware Enchantment
func (s UserService) UserCtx(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        fmt.Println("Received Request on User", runtime.FuncForPC(reflect.ValueOf(next).Pointer()).Name())
    })
}

// GetUser: The Standard Handler Sorcery
func (s UserService) GetUser(w http.ResponseWriter, r *http.Request) {
    fmt.Println(r)
    fmt.Fprintf(w, fmt.Sprint(r.Header))
}
```

Look at UserService! 🧙‍♂️ It's not just a handler, it's a keeper of metadata spells. The struct tags set the base route, version, and middleware. And our handlers? They are pure magic – getUser and getUserByID, effortlessly doing their sorcery.

### Output Routes: What's the Neon Glow? 🌈

Wondering what the output routes look like? Neon has got a glow that's hard to miss:

- The base route for UserService: `/user`
- The version: `v1`
- Routes:
  - `getUser`: GET `/user/v1`
  - `getUserByID`: GET `/user/v1/{:id}`

Feeling the enchantment already? Explore the full potential of Neon on [GitHub](https://github.com/sri-shubham/neon). Illuminate your API development with Neon – where struct tags and simplicity shine. Ready to make your Golang code sparkle? 🌟 Let the coding magic begin!
