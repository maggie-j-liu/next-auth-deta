# Deta Adapter - NextAuth.js

This is a [Deta](https://deta.sh) adapter for [`next-auth`](https://next-auth.js.org/).

## Getting Started

1. Install this package, `next-auth-deta`, as well as `next-auth` and `deta`.

```
# npm
npm install next-auth-deta next-auth deta

# yarn
yarn add next-auth-deta next-auth deta

# pnpm
pnpm add next-auth-deta next-auth deta
```

2. Add the adapter to your next-auth config in `pages/api/auth/[...nextauth].js`. Add your `DETA_PROJECT_KEY` as an environment variable, then create a deta instance and pass it to the `DetaAdapter`.

```js
import NextAuth from "next-auth";
import GithubProvider from "next-auth/providers/github";
import { DetaAdapter } from "next-auth-deta";
import { Deta } from "deta";

const deta = Deta(process.env.DETA_PROJECT_KEY);

export default NextAuth({
  adapter: DetaAdapter(deta),
  providers: [
    // add your providers here
    // https://next-auth.js.org/providers
  ],
  // more options
});
```
