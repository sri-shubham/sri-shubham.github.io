+++
title = "The Day I Learned DNS Is Never Simple"
date = "2026-06-06T07:00:00+00:00"
draft = false
description = "A debugging story that reveals why DNS behaviour can be surprising inside modern systems like Kubernetes."
tags = ["dns", "networking", "kubernetes", "debugging"]
categories = ["Engineering", "Infrastructure"]
slug = "the-day-i-learned-dns-is-never-simple"
+++

I used to think DNS was boring. You ask for a name, you get an IP, the application connects. That was my entire mental model, until a bug dismantled it completely.

The service worked when addressed by IP but failed with a hostname. It worked from one machine and failed from another. Then, oddly, it started working the moment I added a trailing dot to the domain name.

That day I learned that DNS is never simple, not because it is poorly designed, but because decades of accumulated behaviour are hiding behind what looks like a plain string.

## The Symptom

The service looked healthy on the surface: pods running, ingress controller alive, application logs quiet. The endpoint responded fine when called by IP. Then the hostname failed.

That is the moment DNS enters the room, and at first it seems like the smallest possible problem: a typo, a stale record, a CoreDNS restart. Then you start checking things. The DNS record exists. The service exists. The IP is reachable. The same hostname resolves differently depending on where you run the command. Adding a trailing dot changes the behaviour entirely.

At that point, DNS stops being "just name resolution" and reveals itself for what it actually is: a distributed system with layers, caches, and context you cannot see from outside.

## The Lie We Tell Ourselves About DNS

Most developers imagine DNS resolution as a straight line:

```text
example.com  →  DNS  →  93.184.216.34
```

That model is useful when everything works. It is useless when something breaks.

A more realistic picture of what actually happens looks like this:

```text
Application
    ↓
Runtime resolver          # e.g., Go's net package, JVM, etc.
    ↓
Operating system resolver
    ↓
/etc/hosts                # checked before any network call
    ↓
/etc/resolv.conf          # controls nameserver, search, ndots
    ↓
Local cache               # nscd, systemd-resolved, etc.
    ↓
Configured nameserver     # often CoreDNS inside Kubernetes
    ↓
Recursive resolver
    ↓
Root servers
    ↓
TLD servers
    ↓
Authoritative nameserver
```

Every layer in this chain can change the question being asked. Every layer can cache the answer. Every layer can have its own configuration.

The most painful implication: two machines can ask what looks like the same DNS question and not actually send the same query to the network. The question itself changes as it flows through the stack.

## The Dot at the End

The strangest part of my debugging session was the trailing dot. These two names look nearly identical:

```text
api.example.com
api.example.com.
```

In DNS, they do not mean the same thing.

The trailing dot represents the DNS root. A fully qualified domain name ends at the root, and in human-readable form, that root is written as a final dot. So `api.example.com.` is shorthand for `api.example.com.<root>`. The root label is normally invisible; we omit it because typing the dot everywhere would be tedious. But that dot matters the moment software is allowed to treat names as relative rather than absolute.

## Absolute vs Relative Names

The important distinction is not "short name vs long name." It is:

- **Absolute name**: complete as written; nothing should be appended
- **Relative name**: may be completed using local resolver configuration

`api.example.com.` (with dot) is absolute. `api.example.com` (without dot) *may* still be treated as a candidate for search-domain expansion, depending on how the resolver is configured. And `api` on its own is very likely to be expanded using search domains. That is where `/etc/resolv.conf` enters the story.

## Search Domains

On Linux, DNS behaviour is controlled by `/etc/resolv.conf`. Inside a Kubernetes pod, it typically looks something like this:

```text
# /etc/resolv.conf inside a Kubernetes pod
nameserver 10.96.0.10
search default.svc.cluster.local svc.cluster.local cluster.local
options ndots:5
```

The `search` line tells the resolver which suffixes it can append to unqualified names. So if an application tries to resolve `redis`, the resolver may try:

```text
redis.default.svc.cluster.local   # first
redis.svc.cluster.local
redis.cluster.local
redis                              # last resort
```

This is extremely convenient inside Kubernetes, letting a pod call a service in the same namespace using just `redis` instead of the full `redis.default.svc.cluster.local`. But that convenience has a cost: **the name you typed may not be the name that gets queried first.**

## ndots: The Small Option That Changes Everything

The `ndots` option controls when the resolver tries a name as absolute *before* applying search domains. On most standard Linux systems, the default is effectively `ndots:1`, which means a name with at least one dot is tried as absolute first.

So `example.com` has one dot and is sent directly to the nameserver.

Kubernetes commonly overrides this:

```text
options ndots:5
```

With `ndots:5`, a name must contain *at least five dots* before the resolver treats it as absolute first. A normal external hostname like `api.stripe.com` has only two dots. Inside a pod with `ndots:5`, the resolver expands it through search domains before trying it directly:

```text
api.stripe.com.default.svc.cluster.local   ← tried first (fails)
api.stripe.com.svc.cluster.local            ← tried second (fails)
api.stripe.com.cluster.local                ← tried third (fails)
api.stripe.com                              ← finally tried
```

The application asked for `api.stripe.com`. The resolver sent several different queries before getting to the right one. This can hurt latency, inflate DNS traffic, produce confusing packet captures, and fill logs with bizarre-looking internal names, all from a single application call.

## What the Trailing Dot Actually Does

Adding a trailing dot is a signal to the resolver:

> This name is complete. Do not append search domains. Start from the DNS root.

So `api.stripe.com.` skips search-domain expansion entirely. The resolver sends exactly one query.

It is not magic. It does not fix DNS infrastructure. It does not guarantee the application will work. It only removes one source of ambiguity: whether the resolver should expand the name or not.

That is why the trailing dot can appear to "fix" a DNS issue. It does not fix the underlying system. It changes the question being asked.

Without the dot:

```text
api.stripe.com.default.svc.cluster.local   ← sent first
api.stripe.com.svc.cluster.local
api.stripe.com.cluster.local
api.stripe.com                              ← eventually
```

With the dot:

```text
api.stripe.com.                             ← sent immediately
```

Those are not the same resolution paths.

## Does the Trailing Dot Work With Everything?

At the DNS layer, yes. These are all valid DNS names:

```text
google.com.
api.example.com.
redis.default.svc.cluster.local.
```

But DNS understanding is not the same as application-layer compatibility. Consider a web server configured for `example.com` receiving an HTTP `Host` header of `example.com.`. Depending on the server, framework, proxy, TLS certificate validation, or redirect logic, that may work or silently fail.

The trailing dot is a useful diagnostic tool. It is less suitable as a permanent production convention in URLs, because protocols above DNS such as HTTP, TLS, cookies, and virtual host routing may not normalise it consistently.

**Use it when you need unambiguous absolute DNS behaviour. Do not assume everything above DNS will handle it gracefully.**

## A Note on Length vs. Absoluteness

The trailing dot is not about the length of the name. DNS has length limits (labels up to 63 octets, full names up to 255) but those are separate constraints.

The dot says: *"this name is complete because I ended it at the root."* It has nothing to do with how many characters the name contains.

This distinction matters in Kubernetes. Inside a cluster, `redis` (no dot) often resolves because search domains expand it to `redis.default.svc.cluster.local`. But `redis.` (with dot) means `redis.<root>`, with no search-domain expansion, no match, and the query fails. Same string. One extra character. Completely different meaning.

## Why Kubernetes Makes This More Visible

Kubernetes is deeply dependent on DNS in a way most environments are not:

- Services are discovered by DNS name
- Pods use DNS to find services across namespaces
- Short names work because of search-domain expansion
- `ndots:5` changes lookup order for all pods
- Cluster DNS forwards some queries upstream, creating two different resolution contexts

A service in the same namespace resolves as `api`. A service in another namespace resolves as `api.prod`. The full form is `api.prod.svc.cluster.local`. Most of the time, this works so smoothly that nobody thinks about it.

Then something breaks. A service name conflicts with a search-domain suffix. An external hostname generates unexpected internal lookups. A pod has different DNS config from the node it runs on. An ingress hostname behaves differently from inside and outside the cluster. Suddenly DNS is not invisible infrastructure. It is the bug.

## The Debugging Mistake I Made

My first mistake was treating DNS as one thing and asking a single question:

> *Does this hostname resolve?*

That was the wrong question. The right questions are much more specific:

```text
Who is resolving this hostname?
Which resolver is being used?
What search domains are configured in /etc/resolv.conf?
What is ndots set to?
What exact DNS queries are being sent over the wire?
Is the application using the OS resolver or a runtime resolver?
Is the result coming from a cache?
Is this test being run from the node, the pod, or outside the cluster?
```

DNS bugs survive because we test from the wrong place. `dig` on your laptop does not tell you what a pod sees. `nslookup` on a node does not always reflect what the application resolves. Testing by IP only proves the network path works. It says nothing about name resolution.

## My DNS Debugging Checklist

When DNS looks suspicious, I now start with the boring checks, always from the machine or pod where the application actually runs, not from my laptop.

**Step 1: Inspect the resolver config**

```bash
cat /etc/resolv.conf
```

**Step 2: Check search domains and ndots**

```bash
grep search /etc/resolv.conf
grep options /etc/resolv.conf
```

**Step 3: Compare name forms**

```bash
# Try short, expanded, and absolute
nslookup redis
nslookup redis.default.svc.cluster.local
nslookup redis.default.svc.cluster.local.

# For external names, compare with and without trailing dot
nslookup api.example.com
nslookup api.example.com.
```

**Step 4: Trace the actual query path**

```bash
dig api.example.com
dig api.example.com.
dig +search api.example.com     # forces search-domain expansion
dig +trace api.example.com      # walks the full delegation tree
```

**Step 5: Test from inside the pod**

```bash
kubectl exec -it <pod> -- cat /etc/resolv.conf
kubectl exec -it <pod> -- nslookup <name>
```

The goal is not to confirm that the name eventually resolves. The goal is to find out **what exact question is being asked** at each point in the chain.

## The Real Lesson

The trailing dot was not the lesson. It was just the clue that pointed me toward the real lesson.

DNS carries hidden context that changes depending on where a query originates and how the resolver is configured. The hostname alone is not enough to predict what will happen. Resolution depends on:

- Resolver configuration (`/etc/resolv.conf`, runtime settings)
- Search domains and their order
- The `ndots` threshold
- Local and intermediate caches
- Whether cluster DNS or upstream DNS handles the query
- How the protocol above DNS (HTTP, TLS, gRPC) handles the resolved name

This is why DNS bugs feel random. They are usually not random. They are contextual. The same name can behave differently depending on where it is resolved, how it is resolved, and what software receives the result.

That is what makes DNS difficult. It is also what makes it interesting.

The next time adding a trailing dot changes behaviour, do not stop at "the dot fixed it." Ask the better question:

> *What was the resolver doing before I added the dot?*

That question is where the real debugging starts.
