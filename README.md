# Simple Observe Client

This is a simple client for Observe, written using SolidJS and Kobalte.

Useful data structures and functions for interacting with the Observe API are found in the observe/ directory.

To build/run this, you need at least node version 18.19.

Try something like:

```
nvm use 18
npm install
npm run dev
```

You will need your customer ID, your site name, and your user email address. If you haven't logged in before, the tool will walk you through the authorization flow that generates an access token to use.

If you normally access Observe using a URL such as https://1234567890.observeinc.com/ then your customer ID is `1234567890` and your site name is `observeinc.com`.

## References

  * [Observe API](https://developer.observeinc.com/)
  * [SolidJS Website](https://solidjs.com/)
  * [Kobalte Website](https://kobalte.dev/)
