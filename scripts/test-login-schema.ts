import { z } from "zod";
import { loginSchema } from "../lib/validations/auth";

// Simulate what NextAuth passes into authorize()
const fakeCredentials = {
  email: "admin@example.com",
  password: "admin123",
  csrfToken: "abc",
  callbackUrl: "/",
  json: "true",
};

const parsed = loginSchema.safeParse(fakeCredentials);
console.log("ok", parsed.success);
if (!parsed.success) {
  console.log(parsed.error.issues);
} else {
  console.log(parsed.data);
}

// Also test plain object schema behavior in this Zod version
const plain = z.object({ email: z.string(), password: z.string() }).safeParse(fakeCredentials);
console.log("plain_ok", plain.success);
if (!plain.success) console.log(plain.error.issues);
