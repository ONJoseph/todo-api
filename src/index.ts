import { Elysia } from "elysia";
import todos from "./data/todo.json";
import { Todo } from "./types/todo";
import { swagger } from "@elysiajs/swagger";
import cors from "@elysiajs/cors";
import { cookie } from "@elysiajs/cookie";
import { jwt } from "@elysiajs/jwt";
import dotenv from "dotenv";
import { PrismaClient } from "@prisma/client";

// Load environment variables from .env
dotenv.config();

// Create an instance of the Prisma client
const prisma = new PrismaClient();

const secretKey = process.env.JWT_SECRET || "";

const app = new Elysia()
  .use(swagger())
  .use(cors({
    origin: true
  }))
  .use(
    jwt({
      name: "jwt",
      secret: secretKey,
    })
  )
  .use(cookie())

// Define the array of todos
const TODOS: Todo[] = todos as Todo[];

// Define an array to store user data
const users: { username: string, password: string }[] = [];

app.get("/", () => {
  return "Hey there! This is your favorite Todo App!";
});

// Sign up endpoint
app.post("/signup", async ({ body, set }) => {
  const { username, password } = body;

  if (!username || !password) {
    set.status = 400;
    return "Username and password are required";
  }

  const existingUser = await prisma.user.findUnique({
    where: {
      username,
    },
  });

  if (existingUser) {
    set.status = 409;
    return "Username already exists";
  }

  // Create a new user using Prisma
  const newUser = await prisma.user.create({
    data: {
      username,
      password, // You should hash the password before saving it
    },
  });

  set.status = 201;
  return "User registered successfully";
}, {
  detail: {
    parameters: [{
      name: "Post",
      in: "signup",
      description: "User signup",
    }]
  }
});

// Sign in endpoint
app.post("/signin", async ({ body, set, cookies }) => {
  const { username, password } = body;

  if (!username || !password) {
    set.status = 400;
    return "Username and password are required";
  }

  const user = await prisma.user.findUnique({
    where: {
      username,
    },
  });

  if (!user || user.password !== password) {
    set.status = 401;
    return "Invalid credentials";
  }

  // Generate a JWT token and set it as a cookie
  const token = jwt.sign({ username }, secretKey, { expiresIn: "1h" });
  cookies.set("jwt", token);

  set.status = 200;
  return "Signin successful";
}, {
  detail: {
    parameters: [{
      name: "Post",
      in: "signin",
      description: "User signin",
    }]
  }
});

// Logout endpoint
app.post("/logout", ({ set, cookies }) => {
  // Clear the JWT cookie to log the user out
  cookies.set("jwt", null);

  set.status = 200;
  return "Logged out successfully";
}, {
  detail: {
    parameters: [{
      name: "Post",
      in: "logout",
      description: "User logout",
    }]
  }
});

app.get("/todo", ({ query, set }) => {
  if (query?.id) {
    const id = parseInt(query.id as string);

    const todo = TODOS.find((todo) => todo.id === id);
    if (todo) return new Response(JSON.stringify(todo));
    set.status = 404;
    return "Task not found";
  }
  return new Response(JSON.stringify(TODOS));
}, {
  detail: {
    parameters: [{
      name: "id",
      in: "todo",
      description: "Get todo by ID"
    }]
  }
});

app.post("/todo", ({ body, set }) => {
  const todo = {
    id: TODOS.length + 1,
    ...(body as Omit<Todo, "id">),
  };
  TODOS.push(todo);
  set.status = 201;
  return todo;
}, {
  detail: {
    parameters: [{
      name: "Post",
      in: "todo",
      description: "Post todo"
    }]
  }
});

app.put("/todo", ({ query, body, set }) => {
  if (!query?.id) {
    set.status = 400;
    return "Missing id";
  }

  const todo = body as Partial<Todo>;
  const id = parseInt(query.id as string);
  const index = TODOS.findIndex((todo) => todo.id === id);
  if (index === -1) {
    set.status = 404;
    return "Task not found";
  }
  TODOS[index] = {
    ...TODOS[index],
    title: todo.title ?? TODOS[index].title,
    description: todo.description ?? TODOS[index].description,
  };
  return new Response(JSON.stringify(TODOS[index]));
}, {
  detail: {
    parameters: [{
      name: "id",
      in: "todo",
      description: "Put todo by ID"
    }]
  }
});

app.delete("/todo", ({ query, set }) => {
  if (!query?.id) {
    set.status = 400;
    return "Missing id";
  }

  const id = parseInt(query.id as string);
  const index = TODOS.findIndex((todo) => todo.id === id);
  if (index === -1) {
    set.status = 404;
    return "Task not found";
  }
  // Remove the todo task from the TODOS array
  TODOS.splice(index, 1);

  // Return an appropriate response
  set.status = 200; // You can also use 204 (No Content) if you prefer
  return {
    message: "Task deleted successfully",
    taskId: id,
  };
}, {
  detail: {
    parameters: [{
      name: "id",
      in: "todo",
      description: "Delete todo by ID"
    }]
  }
});

app.listen(3000);

console.log(
  `🦊 Elysia is running at ${app.server?.hostname}:${app.server?.port}`
);

export { PrismaClient };
